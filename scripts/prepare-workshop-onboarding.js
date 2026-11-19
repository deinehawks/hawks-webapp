/* eslint-disable @typescript-eslint/no-require-imports, no-console */
const fs = require("node:fs/promises");
const path = require("node:path");
const { Client } = require("pg");
const dotenv = require("dotenv");

const { normalizeSurveyId } = require("./lib/workshop-assets");
const { resolveStagingDbConfig } = require("./lib/staging-db");

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
const DEFAULT_INTAKE = path.resolve(process.cwd(), ".tmp/workshop-assets/onboarding-intake.json");
const DEFAULT_OUTPUT = path.resolve(process.cwd(), ".tmp/workshop-assets/onboarding");

function parseArgs(argv) {
  const args = { intake: DEFAULT_INTAKE, output: DEFAULT_OUTPUT };
  for (let index = 2; index < argv.length; index += 1) {
    if (argv[index] === "--intake") args.intake = path.resolve(argv[++index]);
    else if (argv[index] === "--output") args.output = path.resolve(argv[++index]);
    else throw new Error(`Unknown argument: ${argv[index]}`);
  }
  return args;
}

function clean(value) {
  const result = String(value ?? "").trim();
  return result || null;
}

function normalizeIntake(value) {
  const errors = [];
  if (value?.version !== 1 || value?.targetEnvironment !== "staging" || value?.datasetYear !== 2026) {
    errors.push("Intake must target staging dataset year 2026 with version 1.");
  }
  const clients = Array.isArray(value?.clients) ? value.clients : [];
  const clientCodes = new Set();
  const surveyIds = new Set();
  const normalized = clients.map((item) => {
    const kind = item?.kind;
    const client = {
      code: clean(item?.client?.code)?.toUpperCase() ?? null,
      name: clean(item?.client?.name),
      createIfMissing: item?.client?.createIfMissing === true,
      expectedExistingId: clean(item?.client?.expectedExistingId)?.toLowerCase() ?? null,
    };
    const surveys = (Array.isArray(item?.surveys) ? item.surveys : []).map(normalizeSurveyId);
    if (!["individual", "organization"].includes(kind)) errors.push("Every client requires kind individual or organization.");
    if (!client.code) errors.push("Every client requires a compatibility code.");
    if (clientCodes.has(client.code)) errors.push(`Duplicate client code: ${client.code}.`);
    clientCodes.add(client.code);
    if (client.createIfMissing && !client.name) errors.push(`${client.code ?? "Client"} requires a name when createIfMissing is true.`);
    if (client.expectedExistingId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(client.expectedExistingId)) {
      errors.push(`${client.code ?? "Client"} expectedExistingId must be a UUID.`);
    }
    if (client.createIfMissing && client.expectedExistingId) {
      errors.push(`${client.code ?? "Client"} cannot set expectedExistingId when createIfMissing is true.`);
    }
    if (!surveys.length) errors.push(`${client.code ?? "Client"} requires at least one survey.`);
    for (const surveyId of surveys) {
      if (!/^AH-[0-9]{6}$/.test(surveyId)) errors.push(`Invalid survey ID: ${surveyId}.`);
      if (surveyIds.has(surveyId)) errors.push(`Duplicate survey ID: ${surveyId}.`);
      surveyIds.add(surveyId);
    }

    if (kind === "individual") {
      const person = {
        displayName: clean(item?.person?.displayName),
        email: clean(item?.person?.email),
        mobile: clean(item?.person?.mobile),
      };
      if (!person.displayName) errors.push(`${client.code ?? "Individual client"} requires person.displayName.`);
      return { kind, client, person, surveys };
    }

    const organization = {
      code: clean(item?.organization?.code)?.toUpperCase() ?? null,
      name: clean(item?.organization?.name),
      typeCode: clean(item?.organization?.typeCode),
      status: clean(item?.organization?.status) ?? "active",
      createIfMissing: item?.organization?.createIfMissing === true,
    };
    if (!organization.code) errors.push(`${client.code ?? "Organization client"} requires organization.code.`);
    if (organization.createIfMissing && (!organization.name || !organization.typeCode)) {
      errors.push(`${client.code ?? "Organization client"} requires organization name and type when createIfMissing is true.`);
    }
    if (organization.status !== "active") errors.push(`${organization.code ?? "Organization"} must be active for this batch.`);
    return { kind, client, organization, surveys };
  });

  if (surveyIds.size !== 30) errors.push(`This reviewed batch must contain exactly 30 unique surveys; found ${surveyIds.size}.`);
  return { errors, intake: { version: 1, targetEnvironment: "staging", datasetYear: 2026, clients: normalized } };
}

async function inventoryStaging(intake) {
  const clientCodes = intake.clients.map((item) => item.client.code);
  const organizationCodes = intake.clients.filter((item) => item.kind === "organization").map((item) => item.organization.code);
  const personNames = intake.clients.filter((item) => item.kind === "individual").map((item) => item.person.displayName);
  const surveyIds = intake.clients.flatMap((item) => item.surveys);
  const db = new Client(resolveStagingDbConfig());
  await db.connect();
  try {
    await db.query("begin read only");
    const clients = await db.query("select id, code, name, classification_kind from public.clients where code = any($1::text[]) order by code", [clientCodes]);
    const organizations = await db.query("select id, code, name, type_code, status from public.organizations where code = any($1::text[]) order by code", [organizationCodes]);
    const people = await db.query("select id, display_name, email, mobile, status from public.people where lower(display_name) = any($1::text[]) order by display_name", [personNames.map((name) => name.toLowerCase())]);
    const surveys = await db.query(`select s.id, s.code, s.access_code, s.organization_code, s.status, c.code as client_code
                                      from public.surveys as s
                                      left join public.clients as c on c.id = s.client_id
                                     where s.id = any($1::text[])
                                     order by s.id`, [surveyIds]);
    const clientPeople = await db.query(`select c.code as client_code, p.display_name, mapping.person_id, mapping.review_status, mapping.is_primary
                                           from public.client_people as mapping
                                           join public.clients as c on c.id = mapping.client_id
                                           join public.people as p on p.id = mapping.person_id
                                          where c.code = any($1::text[])`, [clientCodes]);
    const clientOrganizations = await db.query(`select c.code as client_code, o.code as organization_code, mapping.organization_id, mapping.review_status, mapping.is_primary
                                                  from public.client_organizations as mapping
                                                  join public.clients as c on c.id = mapping.client_id
                                                  join public.organizations as o on o.id = mapping.organization_id
                                                 where c.code = any($1::text[])`, [clientCodes]);
    const surveyOrganizations = await db.query(`select mapping.survey_id, o.code as organization_code, mapping.relationship_type, mapping.review_status
                                                  from public.survey_organizations as mapping
                                                  join public.organizations as o on o.id = mapping.organization_id
                                                 where mapping.survey_id = any($1::text[])`, [surveyIds]);
    await db.query("rollback");
    return {
      clients: clients.rows,
      organizations: organizations.rows,
      people: people.rows,
      surveys: surveys.rows,
      clientPeople: clientPeople.rows,
      clientOrganizations: clientOrganizations.rows,
      surveyOrganizations: surveyOrganizations.rows,
    };
  } finally {
    await db.end();
  }
}

function assess(intake, inventory) {
  const conflicts = [];
  const clientMap = new Map(inventory.clients.map((row) => [row.code.toUpperCase(), row]));
  const organizationMap = new Map(inventory.organizations.map((row) => [row.code.toUpperCase(), row]));
  const surveyMap = new Map(inventory.surveys.map((row) => [row.id.toUpperCase(), row]));
  const peopleByName = new Map();
  for (const row of inventory.people) {
    const key = row.display_name.toLowerCase();
    peopleByName.set(key, [...(peopleByName.get(key) ?? []), row]);
  }

  for (const item of intake.clients) {
    const existingClient = clientMap.get(item.client.code);
    if (!existingClient && !item.client.createIfMissing) conflicts.push(`${item.client.code}: required client is missing.`);
    if (existingClient && item.client.expectedExistingId && existingClient.id !== item.client.expectedExistingId) {
      conflicts.push(`${item.client.code}: existing client ID does not match the reviewed intake.`);
    }
    if (existingClient && item.client.name && existingClient.name !== item.client.name) conflicts.push(`${item.client.code}: client name conflicts with staging.`);
    if (existingClient && ![item.kind, "unclassified"].includes(existingClient.classification_kind)) conflicts.push(`${item.client.code}: classification conflicts with ${item.kind}.`);

    const personMappings = inventory.clientPeople.filter((row) => row.client_code === item.client.code && row.review_status === "confirmed" && row.is_primary);
    const organizationMappings = inventory.clientOrganizations.filter((row) => row.client_code === item.client.code && row.review_status === "confirmed" && row.is_primary);
    if (item.kind === "individual") {
      const matchingPeople = peopleByName.get(item.person.displayName.toLowerCase()) ?? [];
      if (matchingPeople.length > 1) conflicts.push(`${item.client.code}: multiple people match the display name.`);
      if (matchingPeople[0] && item.person.email && matchingPeople[0].email && matchingPeople[0].email !== item.person.email) conflicts.push(`${item.client.code}: person email conflicts with staging.`);
      if (matchingPeople[0] && item.person.mobile && matchingPeople[0].mobile && matchingPeople[0].mobile !== item.person.mobile) conflicts.push(`${item.client.code}: person mobile conflicts with staging.`);
      if (organizationMappings.length) conflicts.push(`${item.client.code}: individual client has a confirmed primary organization mapping.`);
      if (personMappings.length > 1 || (personMappings.length === 1 && personMappings[0].display_name.toLowerCase() !== item.person.displayName.toLowerCase())) conflicts.push(`${item.client.code}: confirmed primary person mapping is ambiguous.`);
    } else {
      const organization = organizationMap.get(item.organization.code);
      if (!organization && !item.organization.createIfMissing) conflicts.push(`${item.client.code}: required organization ${item.organization.code} is missing.`);
      if (organization && item.organization.name && organization.name !== item.organization.name) conflicts.push(`${item.organization.code}: organization name conflicts with staging.`);
      if (organization && item.organization.typeCode && organization.type_code !== item.organization.typeCode) conflicts.push(`${item.organization.code}: organization type conflicts with staging.`);
      if (organization && organization.status !== "active") conflicts.push(`${item.organization.code}: organization is not active.`);
      if (personMappings.length) conflicts.push(`${item.client.code}: organization client has a confirmed primary person mapping.`);
      if (organizationMappings.length > 1 || (organizationMappings.length === 1 && organizationMappings[0].organization_code !== item.organization.code)) conflicts.push(`${item.client.code}: confirmed primary organization mapping is ambiguous.`);
    }

    for (const surveyId of item.surveys) {
      const survey = surveyMap.get(surveyId);
      if (survey && (survey.client_code !== item.client.code || survey.code !== item.client.code || survey.access_code !== item.client.code || survey.organization_code !== null)) {
        conflicts.push(`${surveyId}: existing survey compatibility fields conflict with the intake.`);
      }
      const surveyMappings = inventory.surveyOrganizations.filter((row) => row.survey_id === surveyId);
      if (item.kind === "individual" && surveyMappings.length) conflicts.push(`${surveyId}: individual survey already has an organization relationship.`);
      if (item.kind === "organization" && surveyMappings.some((row) => row.review_status === "confirmed" && row.organization_code !== item.organization.code)) {
        conflicts.push(`${surveyId}: confirmed survey organization conflicts with ${item.organization.code}.`);
      }
    }
  }
  return { conflicts };
}

function buildPlannedClientClassifications(intake, inventory) {
  const clientMap = new Map(inventory.clients.map((row) => [row.code.toUpperCase(), row]));
  return intake.clients.map((item) => {
    const existing = clientMap.get(item.client.code);
    return {
      code: item.client.code,
      existingId: existing?.id ?? null,
      expectedExistingId: item.client.expectedExistingId,
      currentClassification: existing?.classification_kind ?? null,
      targetClassification: item.kind,
      classificationUpdateRequired: existing?.classification_kind === "unclassified",
      organization: item.kind === "organization" ? {
        code: item.organization.code,
        typeCode: item.organization.typeCode,
        status: item.organization.status,
        createIfMissing: item.organization.createIfMissing,
      } : null,
    };
  });
}

function sqlLiteral(value) {
  if (value === null || value === undefined) return "null";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlArray(values) {
  return `array[${values.map(sqlLiteral).join(", ")}]::text[]`;
}

function clientSql(item) {
  const expectedName = item.client.name;
  const lines = [];
  if (!item.client.createIfMissing) {
    lines.push(`if not exists (select 1 from public.clients where code = ${sqlLiteral(item.client.code)}) then raise exception 'Required client ${item.client.code} is missing'; end if;`);
  }
  if (item.client.expectedExistingId) {
    lines.push(`if not exists (select 1 from public.clients where id = ${sqlLiteral(item.client.expectedExistingId)}::uuid and code = ${sqlLiteral(item.client.code)}) then raise exception 'Required client ${item.client.code} identity changed'; end if;`);
  }
  lines.push(
    `if exists (select 1 from public.clients where code = ${sqlLiteral(item.client.code)} and (name is distinct from ${sqlLiteral(expectedName)} or classification_kind not in ('unclassified', ${sqlLiteral(item.kind)}::public.client_classification_kind))) then raise exception 'Client ${item.client.code} conflicts with reviewed intake'; end if;`,
    `insert into public.clients (code, name, classification_kind, classification_notes, classification_reviewed_at) values (${sqlLiteral(item.client.code)}, ${sqlLiteral(expectedName)}, ${sqlLiteral(item.kind)}::public.client_classification_kind, 'Workshop 2026 reviewed staging onboarding', now()) on conflict (code) do nothing;`,
    `update public.clients set classification_kind = ${sqlLiteral(item.kind)}::public.client_classification_kind, classification_notes = 'Workshop 2026 reviewed staging onboarding', classification_reviewed_at = now() where code = ${sqlLiteral(item.client.code)} and classification_kind = 'unclassified';`,
    `select id into v_client_id from public.clients where code = ${sqlLiteral(item.client.code)} and classification_kind = ${sqlLiteral(item.kind)}::public.client_classification_kind;`,
    `if v_client_id is null then raise exception 'Client ${item.client.code} was not resolved'; end if;`,
  );

  if (item.kind === "individual") {
    lines.push(
      `if (select count(*) from public.people where lower(display_name) = lower(${sqlLiteral(item.person.displayName)})) > 1 then raise exception 'Person ${item.person.displayName} is ambiguous'; end if;`,
      `if exists (select 1 from public.people where lower(display_name) = lower(${sqlLiteral(item.person.displayName)}) and ((${sqlLiteral(item.person.email)} is not null and email is not null and email is distinct from ${sqlLiteral(item.person.email)}) or (${sqlLiteral(item.person.mobile)} is not null and mobile is not null and mobile is distinct from ${sqlLiteral(item.person.mobile)}))) then raise exception 'Person ${item.person.displayName} contact details conflict with reviewed intake'; end if;`,
      `insert into public.people (display_name, email, mobile, status, notes) select ${sqlLiteral(item.person.displayName)}, ${sqlLiteral(item.person.email)}, ${sqlLiteral(item.person.mobile)}, 'active', 'Workshop 2026 reviewed staging onboarding' where not exists (select 1 from public.people where lower(display_name) = lower(${sqlLiteral(item.person.displayName)}));`,
      `select id into v_person_id from public.people where lower(display_name) = lower(${sqlLiteral(item.person.displayName)});`,
      "if exists (select 1 from public.client_organizations where client_id = v_client_id and review_status = 'confirmed' and is_primary) then raise exception 'Individual client has a confirmed organization mapping'; end if;",
      "if exists (select 1 from public.client_people where client_id = v_client_id and review_status = 'confirmed' and is_primary and person_id <> v_person_id) then raise exception 'Individual client has a different confirmed person mapping'; end if;",
      "insert into public.client_people (client_id, person_id, relationship_type, review_status, is_primary, notes) values (v_client_id, v_person_id, 'owner', 'confirmed', true, 'Workshop 2026 reviewed staging onboarding') on conflict (client_id, person_id) do update set relationship_type = 'owner', review_status = 'confirmed', is_primary = true, notes = excluded.notes;",
    );
  } else {
    if (!item.organization.createIfMissing) {
      lines.push(`if not exists (select 1 from public.organizations where code = ${sqlLiteral(item.organization.code)}) then raise exception 'Required organization ${item.organization.code} is missing'; end if;`);
    }
    lines.push(
      `if exists (select 1 from public.organizations where code = ${sqlLiteral(item.organization.code)} and (name is distinct from ${sqlLiteral(item.organization.name)} or type_code is distinct from ${sqlLiteral(item.organization.typeCode)} or status <> 'active')) then raise exception 'Organization ${item.organization.code} conflicts with reviewed intake'; end if;`,
      `insert into public.organizations (code, name, type_code, status, notes) select ${sqlLiteral(item.organization.code)}, ${sqlLiteral(item.organization.name)}, ${sqlLiteral(item.organization.typeCode)}, 'active', 'Workshop 2026 reviewed staging onboarding' where not exists (select 1 from public.organizations where code = ${sqlLiteral(item.organization.code)});`,
      `select id into v_organization_id from public.organizations where code = ${sqlLiteral(item.organization.code)} and status = 'active';`,
      `if v_organization_id is null then raise exception 'Organization ${item.organization.code} was not resolved'; end if;`,
      "if exists (select 1 from public.client_people where client_id = v_client_id and review_status = 'confirmed' and is_primary) then raise exception 'Organization client has a confirmed person mapping'; end if;",
      "if exists (select 1 from public.client_organizations where client_id = v_client_id and review_status = 'confirmed' and is_primary and organization_id <> v_organization_id) then raise exception 'Organization client has a different confirmed organization mapping'; end if;",
      "insert into public.client_organizations (client_id, organization_id, relationship_type, review_status, is_primary, notes) values (v_client_id, v_organization_id, 'legacy_client', 'confirmed', true, 'Workshop 2026 reviewed staging onboarding') on conflict (client_id, organization_id) do update set relationship_type = 'legacy_client', review_status = 'confirmed', is_primary = true, notes = excluded.notes;",
    );
  }

  for (const surveyId of item.surveys) {
    lines.push(
      `if exists (select 1 from public.surveys where id = ${sqlLiteral(surveyId)} and (client_id <> v_client_id or code is distinct from ${sqlLiteral(item.client.code)} or access_code is distinct from ${sqlLiteral(item.client.code)} or organization_code is not null)) then raise exception 'Survey ${surveyId} conflicts with reviewed intake'; end if;`,
      `insert into public.surveys (id, code, access_code, organization_code, client_id, status) values (${sqlLiteral(surveyId)}, ${sqlLiteral(item.client.code)}, ${sqlLiteral(item.client.code)}, null, v_client_id, 'draft') on conflict (id) do nothing;`,
    );
    if (item.kind === "individual") {
      lines.push(`if exists (select 1 from public.survey_organizations where survey_id = ${sqlLiteral(surveyId)}) then raise exception 'Individual survey ${surveyId} has an organization relationship'; end if;`);
    } else {
      lines.push(
        `if exists (select 1 from public.survey_organizations where survey_id = ${sqlLiteral(surveyId)} and review_status = 'confirmed' and organization_id <> v_organization_id) then raise exception 'Survey ${surveyId} has a conflicting confirmed organization'; end if;`,
        `if not exists (select 1 from public.survey_organizations where survey_id = ${sqlLiteral(surveyId)} and organization_id = v_organization_id and review_status = 'confirmed') then insert into public.survey_organizations (survey_id, organization_id, relationship_type, review_status, notes) values (${sqlLiteral(surveyId)}, v_organization_id, 'requester', 'confirmed', 'Workshop 2026 reviewed staging onboarding'); end if;`,
      );
    }
  }
  return lines.join("\n  ");
}

function buildSql(intake, finish) {
  const surveyIds = intake.clients.flatMap((item) => item.surveys);
  const individualIds = intake.clients.filter((item) => item.kind === "individual").flatMap((item) => item.surveys);
  const organizationIds = intake.clients.filter((item) => item.kind === "organization").flatMap((item) => item.surveys);
  return [
    "-- PRIVATE STAGING-ONLY WORKSHOP ONBOARDING.",
    "-- Review the preview, backup, and rehearsal result before using the apply variant.",
    "begin;",
    "do $$",
    "declare",
    "  v_client_id uuid;",
    "  v_person_id uuid;",
    "  v_organization_id uuid;",
    "begin",
    intake.clients.map((item) => `  -- ${item.client.code} (${item.kind})\n  ${clientSql(item)}`).join("\n\n"),
    `  if (select count(*) from public.surveys where id = any(${sqlArray(surveyIds)})) <> ${surveyIds.length} then raise exception 'Expected all reviewed survey rows'; end if;`,
    `  if exists (select 1 from public.survey_organizations where survey_id = any(${sqlArray(individualIds)})) then raise exception 'Individual surveys must remain outside organization scope'; end if;`,
    `  if (select count(distinct survey_id) from public.survey_organizations where survey_id = any(${sqlArray(organizationIds)}) and review_status = 'confirmed') <> ${organizationIds.length} then raise exception 'Expected confirmed organization relationships for every organization survey'; end if;`,
    `  insert into public.admin_audit_log (action, table_schema, table_name, record_pk, metadata) values ('workshop_batch_onboarding', 'public', 'surveys', jsonb_build_object('survey_ids', to_jsonb(${sqlArray(surveyIds)})), jsonb_build_object('target_environment', 'staging', 'dataset_year', 2026, 'survey_count', ${surveyIds.length}));`,
    "end",
    "$$;",
    `select count(*) as selected_surveys from public.surveys where id = any(${sqlArray(surveyIds)});`,
    `select classification_kind, count(*) from public.clients where code = any(${sqlArray(intake.clients.map((item) => item.client.code))}) group by classification_kind order by classification_kind;`,
    `${finish};`,
    "",
  ].join("\n");
}

async function main() {
  const args = parseArgs(process.argv);
  const raw = JSON.parse(await fs.readFile(args.intake, "utf8"));
  const { errors, intake } = normalizeIntake(raw);
  if (errors.length) throw new Error(`Intake validation failed:\n- ${errors.join("\n- ")}`);
  const inventory = await inventoryStaging(intake);
  for (const item of intake.clients) {
    const existingClient = inventory.clients.find((row) => row.code.toUpperCase() === item.client.code);
    if (!item.client.name && existingClient) item.client.name = existingClient.name;
    if (item.kind === "organization") {
      const existingOrganization = inventory.organizations.find((row) => row.code.toUpperCase() === item.organization.code);
      if (!item.organization.name && existingOrganization) item.organization.name = existingOrganization.name;
      if (!item.organization.typeCode && existingOrganization) item.organization.typeCode = existingOrganization.type_code;
    }
  }
  const assessment = assess(intake, inventory);
  await fs.mkdir(args.output, { recursive: true });
  await fs.writeFile(path.join(args.output, "preview.json"), `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    mode: "read-only",
    targetEnvironment: "staging",
    surveyCount: intake.clients.flatMap((item) => item.surveys).length,
    conflicts: assessment.conflicts,
    plannedClientClassifications: buildPlannedClientClassifications(intake, inventory),
    inventory,
  }, null, 2)}\n`, "utf8");
  if (assessment.conflicts.length) {
    process.exitCode = 2;
    console.error(`Onboarding preparation blocked. Review ${path.join(args.output, "preview.json")}.`);
    return;
  }
  await fs.writeFile(path.join(args.output, "staging-onboarding.rehearsal.sql"), buildSql(intake, "rollback"), "utf8");
  await fs.writeFile(path.join(args.output, "staging-onboarding.apply.sql"), buildSql(intake, "commit"), "utf8");
  console.log(`Read-only onboarding preview and SQL drafts generated under ${args.output}.`);
  console.log("No database mutation was executed.");
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Workshop onboarding preparation failed:", error.message);
    process.exitCode = 1;
  });
}

module.exports = { assess, buildPlannedClientClassifications, buildSql, normalizeIntake };
