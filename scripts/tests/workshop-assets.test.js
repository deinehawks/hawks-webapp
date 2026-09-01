/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  createWaves,
  discoverSurveySource,
  evaluateCapacity,
  isTemporaryDirectoryName,
  parseDfOutput,
  resolveDatasetScope,
  validateAllowlist,
  validateJobManifestScope,
} = require("../lib/workshop-assets");
const {
  buildManifestEntries,
  readResumeState,
  validateConfig,
  writeJson,
} = require("../publish-workshop-assets");
const { buildSql: buildManifestSql, validateEntry } = require("../build-workshop-manifest-draft");
const {
  buildPlannedClientClassifications,
  buildSql: buildOnboardingSql,
  normalizeIntake,
} = require("../prepare-workshop-onboarding");

test("empty allowlist is valid and creates no work", () => {
  const result = validateAllowlist({ approvedSurveys: [] });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(createWaves(result.allowlist.approvedSurveys), []);
});

test("AH-026012 and AH-026013 can be selected explicitly", () => {
  const result = validateAllowlist({
    approvedSurveys: [
      { surveyId: "AH-026012", tileVariant: "round-corners", scope: "organization" },
      { surveyId: "AH-026013", tileVariant: "round-corners", scope: "organization" },
    ],
  });
  assert.deepEqual(result.errors, []);
});

test("allowlist requires an explicit organization or private scope", () => {
  const result = validateAllowlist({
    approvedSurveys: [{ surveyId: "AH-026004", tileVariant: "round-corners" }],
  });
  assert.match(result.errors.join(" "), /requires scope organization or private/);
});

test("malformed string entries return validation errors without throwing", () => {
  const result = validateAllowlist({
    approvedSurveys: ["AH-026004"],
    approvedPointClouds: ["AH-026004"],
    ignoredPointClouds: ["AH-026005"],
  });
  assert.match(result.errors.join(" "), /requires surveyId/);
  assert.match(result.errors.join(" "), /requires an explicit .pcd sourceFile/);
  assert.match(result.errors.join(" "), /requires a reason/);
});

test("waves never exceed three surveys", () => {
  assert.deepEqual(createWaves([1, 2, 3, 4, 5, 6, 7]), [[1, 2, 3], [4, 5, 6], [7]]);
});

test("explicit pilot surveys are isolated in the first wave", () => {
  const items = ["012", "013", "014", "015", "022", "023"].map((suffix) => ({ surveyId: `AH-026${suffix}` }));
  assert.deepEqual(
    createWaves(items, 3, ["AH-026012", "AH-026013"]).map((wave) => wave.map((item) => item.surveyId)),
    [["AH-026012", "AH-026013"], ["AH-026014", "AH-026015", "AH-026022"], ["AH-026023"]],
  );
});

test("pilot surveys must be unique approved selections within the wave limit", () => {
  const approvedSurveys = [
    { surveyId: "AH-026012", tileVariant: "round-corners", scope: "organization" },
    { surveyId: "AH-026013", tileVariant: "round-corners", scope: "organization" },
  ];
  assert.match(validateAllowlist({ approvedSurveys, pilotSurveyIds: ["AH-026999"] }).errors.join(" "), /not an approved survey/);
  assert.match(validateAllowlist({ approvedSurveys, pilotSurveyIds: ["AH-026012", "AH-026012"] }).errors.join(" "), /must not contain duplicates/);
  assert.match(validateAllowlist({ approvedSurveys, maxSurveysPerWave: 1, pilotSurveyIds: ["AH-026012", "AH-026013"] }).errors.join(" "), /cannot exceed/);
});

test("canonical staging mappings resolve organization and private scopes", () => {
  const base = {
    survey_id: "AH-026004",
    client_id: "client-id",
    client_code: "TLW",
    organization_mapping_count: 0,
    person_mapping_count: 0,
    survey_organization_count: 0,
    expected_survey_organization_count: 0,
  };
  assert.deepEqual(resolveDatasetScope({
    ...base,
    classification_kind: "organization",
    organization_mapping_count: 1,
    organization_id: "organization-id",
    organization_status: "active",
    survey_organization_count: 1,
    expected_survey_organization_count: 1,
  }), {
    scope: "organization",
    protectionLevel: "organization",
    organizationId: "organization-id",
    clientId: "client-id",
  });
  assert.deepEqual(resolveDatasetScope({
    ...base,
    classification_kind: "individual",
    person_mapping_count: 1,
    person_id: "person-id",
  }), {
    scope: "private",
    protectionLevel: "private",
    organizationId: null,
    clientId: "client-id",
  });
});

test("ambiguous canonical mappings fail closed", () => {
  const result = resolveDatasetScope({
    survey_id: "AH-026004",
    client_id: "client-id",
    client_code: "TLW",
    classification_kind: "individual",
    organization_mapping_count: 1,
    organization_id: "organization-id",
    person_mapping_count: 1,
    person_id: "person-id",
    survey_organization_count: 0,
  });
  assert.match(result.error, /ambiguous confirmed primary organization/);
});

test("reviewed upload configs accept only consistent explicit scopes", () => {
  const base = {
    workflowVersion: 1,
    targetEnvironment: "staging",
    reviewed: true,
    capacityGuard: { enabled: true },
  };
  const organizationJob = { surveyId: "AH-1", manifest: { clientId: "client", organizationId: "org", protectionLevel: "organization" } };
  const privateJob = { surveyId: "AH-2", manifest: { clientId: "client", organizationId: null, protectionLevel: "private" } };
  assert.equal(validateJobManifestScope(organizationJob), null);
  assert.equal(validateJobManifestScope(privateJob), null);
  assert.doesNotThrow(() => validateConfig({ ...base, jobs: [organizationJob, privateJob] }));
  assert.throws(() => validateConfig({ ...base, jobs: [{ ...privateJob, manifest: { ...privateJob.manifest, organizationId: "org" } }] }), /null organizationId/);
});

test("verified manifest entries preserve each job protection level", () => {
  const entries = buildManifestEntries({
    jobs: [
      {
        clientCode: "tlw",
        year: 2026,
        surveyId: "AH-026004",
        manifest: { clientId: "client", organizationId: null, protectionLevel: "private" },
        tiles: [{ tileFolder: "round-corners", destinationAlias: "tiles" }],
        pointClouds: [],
      },
    ],
  });
  assert.equal(entries.length, 1);
  assert.equal(entries[0].protectionLevel, "private");
  assert.equal(entries[0].organizationId, null);
  assert.equal(validateEntry(entries[0]), null);
  assert.match(buildManifestSql({ datasetYear: 2026, entries, reportHashes: [], verifiedObjects: 1, verifiedBytes: 10 }), /'private'/);
});

test("onboarding intake requires exactly 30 surveys and generates rollback rehearsal", () => {
  const surveys = Array.from({ length: 30 }, (_, index) => `AH-${String(index + 1).padStart(6, "0")}`);
  const result = normalizeIntake({
    version: 1,
    targetEnvironment: "staging",
    datasetYear: 2026,
    clients: [{
      kind: "organization",
      client: {
        code: "EXAMPLE",
        name: "Example Client",
        createIfMissing: false,
        expectedExistingId: "10000000-0000-4000-8000-000000000001",
      },
      organization: { code: "EXAMPLE", name: "Example Organization", typeCode: "cooperative", status: "active", createIfMissing: true },
      surveys,
    }],
  });
  assert.deepEqual(result.errors, []);
  const sql = buildOnboardingSql(result.intake, "rollback");
  assert.match(sql, /Workshop 2026 reviewed staging onboarding/);
  assert.match(sql, /id = '10000000-0000-4000-8000-000000000001'::uuid and code = 'EXAMPLE'/);
  assert.match(sql, /rollback;\s*$/);
  assert.doesNotMatch(sql, /auth\.users|survey_access_grants/);
  assert.deepEqual(buildPlannedClientClassifications(result.intake, {
    clients: [{
      id: "10000000-0000-4000-8000-000000000001",
      code: "EXAMPLE",
      classification_kind: "unclassified",
    }],
  }), [{
    code: "EXAMPLE",
    existingId: "10000000-0000-4000-8000-000000000001",
    expectedExistingId: "10000000-0000-4000-8000-000000000001",
    currentClassification: "unclassified",
    targetClassification: "organization",
    classificationUpdateRequired: true,
    organization: {
      code: "EXAMPLE",
      typeCode: "cooperative",
      status: "active",
      createIfMissing: true,
    },
  }]);
});

test("onboarding intake rejects an invalid expected existing client ID", () => {
  const result = normalizeIntake({
    version: 1,
    targetEnvironment: "staging",
    datasetYear: 2026,
    clients: [{
      kind: "individual",
      client: { code: "EXAMPLE", name: "Example", createIfMissing: false, expectedExistingId: "not-a-uuid" },
      person: { displayName: "Example Person" },
      surveys: [],
    }],
  });
  assert.match(result.errors.join("\n"), /expectedExistingId must be a UUID/);
});

test("temporary directories are recognized", () => {
  assert.equal(isTemporaryDirectoryName(".round-corners.tmp-abc"), true);
  assert.equal(isTemporaryDirectoryName("round-corners"), false);
});

test("zero-byte resume state recovers and the next write is valid", async (context) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "hawks-resume-"));
  context.after(() => fs.rm(root, { recursive: true, force: true }));
  const statePath = path.join(root, "wave.json");
  await fs.writeFile(statePath, "", "utf8");

  const state = await readResumeState(statePath, "wave-003");
  assert.deepEqual(state, { waveId: "wave-003", completedObjects: {} });

  state.completedObjects["tiles/example.png"] = { size: 10 };
  await writeJson(statePath, state);
  assert.deepEqual(JSON.parse(await fs.readFile(statePath, "utf8")), state);
  assert.deepEqual(await fs.readdir(root), ["wave.json"]);
});

test("capacity preserves reserve and transfer overhead", () => {
  const tebibyte = 1024 ** 4;
  assert.equal(evaluateCapacity({ totalBytes: tebibyte, availableBytes: 500 * 1024 ** 3, remainingBytes: 100 * 1024 ** 3 }).allowed, true);
  assert.equal(evaluateCapacity({ totalBytes: tebibyte, availableBytes: 200 * 1024 ** 3, remainingBytes: 100 * 1024 ** 3 }).allowed, false);
});

test("df output is parsed as bytes", () => {
  assert.deepEqual(parseDfOutput("Filesystem 1B-blocks Used Available Use% Mounted on\n/dev/sda 1000 100 900 10% /data"), { totalBytes: 1000, availableBytes: 900 });
});

test("direct and nested rgb layouts are discovered", async (context) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "hawks-assets-"));
  context.after(() => fs.rm(root, { recursive: true, force: true }));
  for (const [surveyId, middle] of [["AH-TEST-1", []], ["AH-TEST-2", ["inner"]]]) {
    const rgb = path.join(root, surveyId, ...middle, "rgb");
    await fs.mkdir(path.join(rgb, "tiles", "ortho", "round-corners", "12"), { recursive: true });
    const result = await discoverSurveySource(root, surveyId, "round-corners");
    assert.equal(result.status, "ready");
    assert.deepEqual(result.zoomDirectories, ["12"]);
  }
});
