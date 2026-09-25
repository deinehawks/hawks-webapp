/* eslint-disable @typescript-eslint/no-require-imports, no-console */
const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const { Client } = require("pg");
const dotenv = require("dotenv");
const {
  resolveStagingDbConfig,
  STAGING_SUPABASE_PROJECT_REF,
} = require("./lib/staging-db");

const DEFAULT_DRAFT = path.resolve(
  process.cwd(),
  ".tmp/workshop-assets/verification/combined-manifest-draft.sql",
);
const DEFAULT_OUTPUT_ROOT = path.resolve(
  process.cwd(),
  ".tmp/workshop-assets/rollout",
);
const MANIFEST_KEY_PATTERN = /^manifest-\d{4}-\d{2}-\d{2}$/;

function parseArgs(argv) {
  const args = {
    draft: DEFAULT_DRAFT,
    outputRoot: DEFAULT_OUTPUT_ROOT,
    manifestKey: null,
    expectedActiveKey: null,
    expectedSqlSha256: null,
    expectedJsonSha256: null,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const option = argv[index];
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`${option} requires a value.`);
    }
    index += 1;
    if (option === "--draft") args.draft = path.resolve(value);
    else if (option === "--output-root") args.outputRoot = path.resolve(value);
    else if (option === "--manifest-key") args.manifestKey = value;
    else if (option === "--expected-active-key") {
      args.expectedActiveKey = value;
    } else if (option === "--expected-sql-sha256") {
      args.expectedSqlSha256 = value.toLowerCase();
    } else if (option === "--expected-json-sha256") {
      args.expectedJsonSha256 = value.toLowerCase();
    } else {
      throw new Error(`Unknown argument: ${option}`);
    }
  }

  const required = [
    "manifestKey",
    "expectedActiveKey",
    "expectedSqlSha256",
    "expectedJsonSha256",
  ];
  for (const name of required) {
    if (!args[name]) {
      const option = name.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
      throw new Error(`Missing required --${option}.`);
    }
  }
  if (!MANIFEST_KEY_PATTERN.test(args.manifestKey)) {
    throw new Error("Manifest key must use manifest-YYYY-MM-DD.");
  }
  if (!MANIFEST_KEY_PATTERN.test(args.expectedActiveKey)) {
    throw new Error("Expected active key must use manifest-YYYY-MM-DD.");
  }
  if (
    !/^[a-f0-9]{64}$/.test(args.expectedSqlSha256)
    || !/^[a-f0-9]{64}$/.test(args.expectedJsonSha256)
  ) {
    throw new Error("Expected hashes must be lowercase SHA-256 values.");
  }
  return args;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sqlLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function stripSqlComments(sql) {
  return sql
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n");
}

function assertReviewOnlyDraft(sql) {
  const body = stripSqlComments(sql);
  const inserts = body.match(/\binsert\s+into\b/gi) ?? [];
  if (inserts.length !== 2) {
    throw new Error(
      `Combined draft must contain exactly two inserts; found ${inserts.length}.`,
    );
  }
  if (
    /\b(update|delete|alter|drop|truncate|grant|revoke|commit|rollback)\b/i.test(
      body,
    )
  ) {
    throw new Error("Combined draft contains a prohibited operation.");
  }
  if (
    !body.includes(":new_manifest_id")
    || !body.includes(":new_manifest_key")
  ) {
    throw new Error("Combined draft placeholders are missing.");
  }
}

function instantiateDraft(sql, manifestId, manifestKey) {
  assertReviewOnlyDraft(sql);
  const instantiated = sql
    .replaceAll(":new_manifest_id", `${sqlLiteral(manifestId)}::uuid`)
    .replaceAll(":new_manifest_key", sqlLiteral(manifestKey));
  if (instantiated.includes(":new_manifest_")) {
    throw new Error("Unresolved manifest placeholder remains.");
  }
  return instantiated;
}

function countDraftEntries(sql, entryType) {
  const matcher = new RegExp(`\\([^\\n]+, '${entryType}',`, "g");
  return (sql.match(matcher) ?? []).length;
}

function buildClaims(profileId) {
  return JSON.stringify({ sub: profileId, role: "authenticated" });
}

function buildDraftAssertions(context) {
  return `
do $$
declare
  active_rows integer;
  target_rows integer;
begin
  select count(*) into active_rows
  from public.workshop_manifests
  where dataset_year = 2026 and status = 'approved' and is_active;

  if active_rows <> 1 or not exists (
    select 1 from public.workshop_manifests
    where id = ${sqlLiteral(context.expectedActiveId)}::uuid
      and manifest_key = ${sqlLiteral(context.expectedActiveKey)}
      and dataset_year = 2026
      and status = 'approved'
      and is_active
  ) then
    raise exception 'Expected active manifest changed; stop and rebuild the package';
  end if;

  select count(*) into target_rows
  from public.workshop_manifests
  where id = ${sqlLiteral(context.manifestId)}::uuid
     or manifest_key = ${sqlLiteral(context.manifestKey)};

  if target_rows <> 0 then
    raise exception 'Target manifest ID or key already exists';
  end if;
end
$$;`;
}

function buildManifestChecks(context, expectedStatuses, expectedActive) {
  const statusSql = expectedStatuses.map(sqlLiteral).join(", ");
  return `
do $$
declare
  entry_rows integer;
  survey_rows integer;
  tile_rows integer;
  point_cloud_rows integer;
begin
  if not exists (
    select 1
    from public.workshop_manifests
    where id = ${sqlLiteral(context.manifestId)}::uuid
      and manifest_key = ${sqlLiteral(context.manifestKey)}
      and dataset_year = 2026
      and status in (${statusSql})
      and is_active = ${expectedActive ? "true" : "false"}
      and supersedes_manifest_id = ${sqlLiteral(context.expectedActiveId)}::uuid
      and backup_storage_alias is null
      and backup_object_alias is null
      and backup_exported_at is null
  ) then
    raise exception 'Target manifest identity, state, lineage, or backup fields are invalid';
  end if;

  select count(*), count(distinct survey_id),
         count(*) filter (where entry_type = 'tile_group'),
         count(*) filter (where entry_type = 'point_cloud')
    into entry_rows, survey_rows, tile_rows, point_cloud_rows
  from public.workshop_manifest_entries
  where manifest_id = ${sqlLiteral(context.manifestId)}::uuid;

  if entry_rows <> ${context.inventory.manifestEntries}
     or survey_rows <> ${context.inventory.surveyIds.length}
     or tile_rows <> 30
     or point_cloud_rows <> 11 then
    raise exception 'Target manifest counts invalid: entries %, surveys %, tiles %, point clouds %',
      entry_rows, survey_rows, tile_rows, point_cloud_rows;
  end if;

  if exists (
    select 1 from public.workshop_manifest_entries
    where manifest_id = ${sqlLiteral(context.manifestId)}::uuid
      and verification ->> 'verified' is distinct from 'true'
  ) then
    raise exception 'Target manifest contains an unverified entry';
  end if;

  if exists (
    select 1
    from public.workshop_manifest_entries as entry
    left join public.surveys as survey on survey.id = entry.survey_id
    where entry.manifest_id = ${sqlLiteral(context.manifestId)}::uuid
      and (survey.id is null or survey.client_id is distinct from entry.client_id)
  ) then
    raise exception 'Target manifest contains a missing or cross-client survey';
  end if;

  if exists (
    select 1
    from public.workshop_manifest_entries as entry
    join public.clients as client on client.id = entry.client_id
    where entry.manifest_id = ${sqlLiteral(context.manifestId)}::uuid
      and (
        (
          entry.protection_level = 'organization'
          and (
            entry.organization_id is null
            or client.classification_kind <> 'organization'
            or not exists (
              select 1
              from public.client_organizations as mapping
              where mapping.client_id = entry.client_id
                and mapping.organization_id = entry.organization_id
                and mapping.review_status = 'confirmed'
                and mapping.is_primary
            )
          )
        )
        or (
          entry.protection_level = 'private'
          and (
            entry.organization_id is not null
            or client.classification_kind <> 'individual'
            or not exists (
              select 1
              from public.client_people as mapping
              where mapping.client_id = entry.client_id
                and mapping.review_status = 'confirmed'
                and mapping.is_primary
            )
            or exists (
              select 1
              from public.client_organizations as mapping
              where mapping.client_id = entry.client_id
                and mapping.review_status = 'confirmed'
                and mapping.is_primary
            )
            or exists (
              select 1
              from public.survey_organizations as mapping
              where mapping.survey_id = entry.survey_id
            )
          )
        )
      )
  ) then
    raise exception 'Target manifest contains an invalid organization/private scope';
  end if;
end
$$;`;
}

function buildDraftApply(context) {
  const claims = buildClaims(context.approverId);
  const metadata = JSON.stringify({
    sourceSqlSha256: context.sqlSha256,
    sourceInventorySha256: context.jsonSha256,
    verificationReports: context.inventory.verificationReports,
    verifiedObjects: context.inventory.verifiedObjects,
    verifiedBytes: context.inventory.verifiedBytes,
    backupMode: "checksummed_database_backup_and_immutable_history",
  });
  return `-- Guarded staging draft insertion. No approval or activation.
-- Target: ${STAGING_SUPABASE_PROJECT_REF}; manifest: ${context.manifestKey}.
begin;
select pg_advisory_xact_lock(hashtextextended('workshop-manifest:2026', 0));
${buildDraftAssertions(context)}

set local request.jwt.claims = ${sqlLiteral(claims)};
set local role authenticated;

${context.instantiatedDraft}

update public.workshop_manifests
set description = 'Verified 30-survey workshop asset manifest; inactive pending review.',
    metadata = ${sqlLiteral(metadata)}::jsonb
where id = ${sqlLiteral(context.manifestId)}::uuid
  and manifest_key = ${sqlLiteral(context.manifestKey)}
  and status = 'draft'
  and not is_active;

reset role;
${buildManifestChecks(context, ["draft"], false)}
commit;
`;
}

function buildVerify(context, active) {
  const statuses = active ? ["approved"] : ["draft", "reviewed"];
  const lineageCheck = active
    ? `
do $$
begin
  if (
    select count(*) from public.workshop_manifests
    where dataset_year = 2026 and status = 'approved' and is_active
  ) <> 1 then
    raise exception 'Expected exactly one active approved 2026 manifest';
  end if;
  if not exists (
    select 1 from public.workshop_manifests
    where id = ${sqlLiteral(context.expectedActiveId)}::uuid
      and status = 'superseded'
      and not is_active
      and superseded_by_manifest_id = ${sqlLiteral(context.manifestId)}::uuid
  ) then
    raise exception 'Previous manifest supersession lineage is invalid';
  end if;
end
$$;`
    : "";
  return `-- Read-only ${active ? "post-cutover" : "draft/reviewed"} verification.
begin read only;
${buildManifestChecks(context, statuses, active)}
${lineageCheck}
select manifest.manifest_key,
       manifest.status,
       manifest.is_active,
       count(entry.id) as entries,
       count(distinct entry.survey_id) as surveys,
       count(*) filter (where entry.entry_type = 'tile_group') as tile_groups,
       count(*) filter (where entry.entry_type = 'point_cloud') as point_clouds,
       count(*) filter (where entry.protection_level = 'organization') as organization_entries,
       count(*) filter (where entry.protection_level = 'private') as private_entries
from public.workshop_manifests as manifest
left join public.workshop_manifest_entries as entry
  on entry.manifest_id = manifest.id
where manifest.id = ${sqlLiteral(context.manifestId)}::uuid
group by manifest.id;
rollback;
`;
}

function buildMarkReviewed(context) {
  const claims = buildClaims(context.approverId);
  return `-- Promote only the verified inactive draft to reviewed.
-- Required in the same psql session:
--   set app.workshop_manifest_review = 'confirmed';
begin;
select pg_advisory_xact_lock(hashtextextended('workshop-manifest:2026', 0));
do $$
begin
  if current_setting('app.workshop_manifest_review', true)
       is distinct from 'confirmed' then
    raise exception 'Set app.workshop_manifest_review=confirmed after review';
  end if;
end
$$;
${buildManifestChecks(context, ["draft"], false)}
set local request.jwt.claims = ${sqlLiteral(claims)};
set local role authenticated;
update public.workshop_manifests
set status = 'reviewed'
where id = ${sqlLiteral(context.manifestId)}::uuid
  and manifest_key = ${sqlLiteral(context.manifestKey)}
  and status = 'draft'
  and not is_active;
reset role;
${buildManifestChecks(context, ["reviewed"], false)}
commit;
`;
}

function buildCutover(context) {
  const claims = buildClaims(context.approverId);
  return `-- Approval and atomic cutover. Requires separate explicit approval.
-- Required in the same psql session:
--   set app.workshop_manifest_cutover = 'confirmed';
begin;
select pg_advisory_xact_lock(hashtextextended('workshop-manifest:2026', 0));
do $$
begin
  if current_setting('app.workshop_manifest_cutover', true)
       is distinct from 'confirmed' then
    raise exception 'Set app.workshop_manifest_cutover=confirmed after approval';
  end if;
end
$$;
${buildManifestChecks(context, ["reviewed"], false)}
set local request.jwt.claims = ${sqlLiteral(claims)};
set local role authenticated;

update public.workshop_manifests
set status = 'approved',
    approved_by = ${sqlLiteral(context.approverId)}::uuid,
    approved_at = now()
where id = ${sqlLiteral(context.manifestId)}::uuid
  and status = 'reviewed'
  and not is_active;

update public.workshop_manifests
set status = 'superseded',
    superseded_by_manifest_id = ${sqlLiteral(context.manifestId)}::uuid
where id = ${sqlLiteral(context.expectedActiveId)}::uuid
  and manifest_key = ${sqlLiteral(context.expectedActiveKey)}
  and status = 'approved'
  and is_active;

update public.workshop_manifests
set is_active = true
where id = ${sqlLiteral(context.manifestId)}::uuid
  and status = 'approved'
  and not is_active;

reset role;
${buildManifestChecks(context, ["approved"], true)}
commit;
`;
}

function buildContainment(context) {
  return `-- Remove only an inactive draft/reviewed replacement before cutover.
-- Required in the same psql session:
--   set app.workshop_manifest_containment = 'confirmed';
begin;
select pg_advisory_xact_lock(hashtextextended('workshop-manifest:2026', 0));
do $$
begin
  if current_setting('app.workshop_manifest_containment', true)
       is distinct from 'confirmed' then
    raise exception 'Set app.workshop_manifest_containment=confirmed after review';
  end if;
  if not exists (
    select 1 from public.workshop_manifests
    where id = ${sqlLiteral(context.manifestId)}::uuid
      and manifest_key = ${sqlLiteral(context.manifestKey)}
      and status in ('draft', 'reviewed')
      and not is_active
  ) then
    raise exception 'Containment target is absent, approved, superseded, or active';
  end if;
  if exists (
    select 1 from public.workshop_manifests
    where supersedes_manifest_id = ${sqlLiteral(context.manifestId)}::uuid
       or superseded_by_manifest_id = ${sqlLiteral(context.manifestId)}::uuid
  ) then
    raise exception 'Containment target participates in downstream lineage';
  end if;
end
$$;
delete from public.workshop_manifest_entries
where manifest_id = ${sqlLiteral(context.manifestId)}::uuid;
delete from public.workshop_manifests
where id = ${sqlLiteral(context.manifestId)}::uuid
  and status in ('draft', 'reviewed')
  and not is_active;
do $$
begin
  if exists (
    select 1 from public.workshop_manifests
    where id = ${sqlLiteral(context.manifestId)}::uuid
  ) or exists (
    select 1 from public.workshop_manifest_entries
    where manifest_id = ${sqlLiteral(context.manifestId)}::uuid
  ) then
    raise exception 'Draft containment did not remove the target rows';
  end if;
end
$$;
commit;
`;
}

function buildForwardRecovery(context) {
  const claims = buildClaims(context.approverId);
  return `-- Forward recovery: clone the previous known-good entries into a
-- new inactive draft. Never edit a superseded manifest backward.
-- Required in the same psql session:
--   set app.workshop_manifest_recovery = 'confirmed';
--   set app.workshop_manifest_recovery_id = '<new UUID>';
--   set app.workshop_manifest_recovery_key = 'manifest-YYYY-MM-DD';
begin;
select pg_advisory_xact_lock(hashtextextended('workshop-manifest:2026', 0));
do $$
declare
  recovery_id uuid;
  recovery_key text;
begin
  if current_setting('app.workshop_manifest_recovery', true)
       is distinct from 'confirmed' then
    raise exception 'Set app.workshop_manifest_recovery=confirmed after triage';
  end if;
  recovery_id := current_setting(
    'app.workshop_manifest_recovery_id',
    true
  )::uuid;
  recovery_key := current_setting(
    'app.workshop_manifest_recovery_key',
    true
  );
  if recovery_key !~ '^manifest-[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    raise exception 'Recovery key must use manifest-YYYY-MM-DD';
  end if;
  if exists (
    select 1 from public.workshop_manifests
    where id = recovery_id or manifest_key = recovery_key
  ) then
    raise exception 'Recovery manifest ID or key already exists';
  end if;
  if not exists (
    select 1 from public.workshop_manifests
    where id = ${sqlLiteral(context.manifestId)}::uuid
      and status = 'approved'
      and is_active
  ) then
    raise exception 'Expected replacement manifest is no longer active';
  end if;
  if not exists (
    select 1 from public.workshop_manifests
    where id = ${sqlLiteral(context.expectedActiveId)}::uuid
      and status = 'superseded'
      and not is_active
  ) then
    raise exception 'Previous known-good manifest is unavailable';
  end if;
end
$$;

set local request.jwt.claims = ${sqlLiteral(claims)};
set local role authenticated;

insert into public.workshop_manifests (
  id,
  manifest_key,
  status,
  dataset_year,
  title,
  description,
  supersedes_manifest_id,
  metadata
)
values (
  current_setting('app.workshop_manifest_recovery_id')::uuid,
  current_setting('app.workshop_manifest_recovery_key'),
  'draft',
  2026,
  'Workshop manifest forward recovery',
  'Inactive recovery draft cloned from ${context.expectedActiveKey}.',
  ${sqlLiteral(context.manifestId)}::uuid,
  jsonb_build_object(
    'recoverySourceManifestId',
    ${sqlLiteral(context.expectedActiveId)},
    'recoverySourceManifestKey',
    ${sqlLiteral(context.expectedActiveKey)}
  )
);

insert into public.workshop_manifest_entries (
  manifest_id,
  entry_type,
  organization_id,
  client_id,
  survey_id,
  farm_id,
  profile_id,
  output_id,
  reference_key,
  display_label,
  source_alias,
  destination_storage_alias,
  destination_prefix_alias,
  nginx_route_pattern,
  protection_level,
  verification,
  metadata,
  notes
)
select current_setting('app.workshop_manifest_recovery_id')::uuid,
       entry_type,
       organization_id,
       client_id,
       survey_id,
       farm_id,
       profile_id,
       output_id,
       reference_key,
       display_label,
       source_alias,
       destination_storage_alias,
       destination_prefix_alias,
       nginx_route_pattern,
       protection_level,
       verification,
       metadata,
       notes
from public.workshop_manifest_entries
where manifest_id = ${sqlLiteral(context.expectedActiveId)}::uuid;

reset role;
commit;

-- Stop here. Verify and review the recovery draft, then prepare a separately
-- approved cutover package. Do not reactivate the superseded row.
`;
}

async function inspectStaging(manifestKey, expectedActiveKey) {
  dotenv.config({ path: ".env.local", quiet: true });
  const client = new Client(resolveStagingDbConfig());
  await client.connect();
  try {
    await client.query("begin read only");
    const active = await client.query(`
      select id, manifest_key
      from public.workshop_manifests
      where dataset_year = 2026
        and status = 'approved'
        and is_active
    `);
    const target = await client.query(
      "select count(*)::integer as rows "
        + "from public.workshop_manifests where manifest_key = $1",
      [manifestKey],
    );
    const approver = await client.query(`
      select id
      from public.profiles
      where lower(email) = 'visualization.hawks@gmail.com'
        and role = 'platform_admin'
    `);
    await client.query("rollback");
    if (active.rows.length !== 1) {
      throw new Error(
        `Expected one active approved 2026 manifest; found ${active.rows.length}.`,
      );
    }
    if (active.rows[0].manifest_key !== expectedActiveKey) {
      throw new Error(
        `Active manifest changed from ${expectedActiveKey} `
          + `to ${active.rows[0].manifest_key}.`,
      );
    }
    if (target.rows[0].rows !== 0) {
      throw new Error(`Manifest key ${manifestKey} already exists.`);
    }
    if (approver.rows.length !== 1) {
      throw new Error("Expected exactly one project-lead platform admin.");
    }
    return {
      activeId: active.rows[0].id,
      approverId: approver.rows[0].id,
    };
  } finally {
    await client.end();
  }
}

async function writePackage(outputDir, files, packageInventory) {
  await fs.mkdir(path.dirname(outputDir), { recursive: true });
  await fs.mkdir(outputDir, { recursive: false });
  const hashes = [];
  for (const [name, body] of Object.entries(files)) {
    const content = body.endsWith("\n") ? body : `${body}\n`;
    await fs.writeFile(path.join(outputDir, name), content, {
      encoding: "utf8",
      flag: "wx",
    });
    hashes.push({ file: name, sha256: sha256(content) });
  }
  const inventoryContent = `${JSON.stringify(
    { ...packageInventory, files: hashes },
    null,
    2,
  )}\n`;
  await fs.writeFile(
    path.join(outputDir, "rollout-package.json"),
    inventoryContent,
    { encoding: "utf8", flag: "wx" },
  );
  hashes.push({
    file: "rollout-package.json",
    sha256: sha256(inventoryContent),
  });
  const sums = hashes
    .map(({ file, sha256: hash }) => `${hash}  ${file}`)
    .join("\n");
  await fs.writeFile(
    path.join(outputDir, "SHA256SUMS.txt"),
    `${sums}\n`,
    { encoding: "utf8", flag: "wx" },
  );
}

async function main() {
  const args = parseArgs(process.argv);
  const sourceSql = await fs.readFile(args.draft, "utf8");
  const sourceJson = await fs.readFile(`${args.draft}.json`, "utf8");
  const sqlHash = sha256(sourceSql);
  const jsonHash = sha256(sourceJson);
  if (sqlHash !== args.expectedSqlSha256) {
    throw new Error(`Draft SQL hash mismatch: ${sqlHash}.`);
  }
  if (jsonHash !== args.expectedJsonSha256) {
    throw new Error(`Draft inventory hash mismatch: ${jsonHash}.`);
  }

  const inventory = JSON.parse(sourceJson);
  if (
    inventory.manifestEntries !== 41
    || inventory.surveyIds?.length !== 30
    || inventory.verificationReports?.length !== 11
    || inventory.verifiedObjects !== 1944728
    || inventory.verifiedBytes !== 109695980633
  ) {
    throw new Error(
      "Combined inventory does not match the reviewed 30-survey evidence.",
    );
  }
  if (
    countDraftEntries(sourceSql, "tile_group") !== 30
    || countDraftEntries(sourceSql, "point_cloud") !== 11
  ) {
    throw new Error(
      "Combined draft must contain 30 tile groups and 11 point clouds.",
    );
  }

  const staging = await inspectStaging(
    args.manifestKey,
    args.expectedActiveKey,
  );
  const manifestId = crypto.randomUUID();
  const instantiatedDraft = instantiateDraft(
    sourceSql,
    manifestId,
    args.manifestKey,
  );
  const context = {
    manifestId,
    manifestKey: args.manifestKey,
    expectedActiveId: staging.activeId,
    expectedActiveKey: args.expectedActiveKey,
    approverId: staging.approverId,
    inventory,
    sqlSha256: sqlHash,
    jsonSha256: jsonHash,
    instantiatedDraft,
  };
  const outputDir = path.join(args.outputRoot, args.manifestKey);
  const files = {
    "01-draft-apply.sql": buildDraftApply(context),
    "02-verify-draft.sql": buildVerify(context, false),
    "03-mark-reviewed.sql": buildMarkReviewed(context),
    "04-cutover.sql": buildCutover(context),
    "05-verify-active.sql": buildVerify(context, true),
    "06-draft-containment.sql": buildContainment(context),
    "07-forward-recovery.sql": buildForwardRecovery(context),
    "README.md": `# ${args.manifestKey} staging rollout package

This checksummed package is generated from the verified combined manifest
draft. Nothing in this directory runs automatically.

Run 01 and 02 only after explicit draft-apply approval. Run 03 only after
reviewing the draft verification. Obtain separate cutover approval before
running 04 and 05.

File 06 is pre-cutover containment only. File 07 creates an inactive
forward-recovery draft after cutover and never edits superseded history
backward.

Backup alias fields intentionally remain null. Recovery uses a checksummed
staging database backup, immutable manifest history, and the forward-recovery
artifact.
`,
  };
  await writePackage(outputDir, files, {
    generatedAt: new Date().toISOString(),
    target: `staging:${STAGING_SUPABASE_PROJECT_REF}`,
    manifestId,
    manifestKey: args.manifestKey,
    expectedActiveManifestId: staging.activeId,
    expectedActiveManifestKey: args.expectedActiveKey,
    sourceSqlSha256: sqlHash,
    sourceInventorySha256: jsonHash,
    manifestEntries: inventory.manifestEntries,
    surveys: inventory.surveyIds.length,
    verifiedObjects: inventory.verifiedObjects,
    verifiedBytes: inventory.verifiedBytes,
    backupMode: "checksummed_database_backup_and_immutable_history",
  });
  console.log(
    `Prepared review-only staging rollout package: ${outputDir}`,
  );
  console.log(`Manifest ID: ${manifestId}`);
  console.log("No staging data was changed.");
}

if (require.main === module) {
  main().catch((error) => {
    console.error(
      "Workshop manifest rollout packaging failed:",
      error.message,
    );
    process.exitCode = 1;
  });
}

module.exports = {
  assertReviewOnlyDraft,
  instantiateDraft,
  sha256,
};
