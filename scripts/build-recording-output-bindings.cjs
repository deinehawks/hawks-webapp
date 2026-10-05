// Bind verified PCD routes to reviewed current/proposed output identities.
// Reads local evidence only; never connects to Supabase or MinIO.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const source = JSON.parse(fs.readFileSync(".recording/source.json", "utf8")).source;
const catalog = JSON.parse(fs.readFileSync(".recording/catalog.json", "utf8"));
const proposalPath = path.join(
  source,
  ".tmp/workshop-assets/cumulative-20260929/package/output-metadata-proposal.json",
);
const proposalSource = fs.readFileSync(proposalPath);
const proposals = JSON.parse(proposalSource);
const target = ".recording/output-bindings.json";

assert.ok(!fs.existsSync(target), "Existing output bindings retained; review before replacing.");
assert.equal(catalog.version, 1);
assert.equal(proposals.length, 58);

const bindings = {
  version: 1,
  createdAt: new Date().toISOString(),
  proposalSha256: crypto.createHash("sha256").update(proposalSource).digest("hex"),
  surveys: {},
};
let boundClouds = 0;
let preservedOutputs = 0;
let proposedOutputs = 0;

for (const [surveyId, assets] of Object.entries(catalog.surveys)) {
  if (!assets.clouds.length) continue;
  assert.equal(assets.clouds.length, 1, `${surveyId}: multiple PCDs need an explicit selection.`);
  const proposal = proposals.find((item) => item.surveyId === surveyId);
  assert.ok(proposal, `${surveyId}: missing reviewed output proposal.`);
  const output = proposal.pointCloud.existing ?? proposal.pointCloud.proposed;
  assert.ok(output, `${surveyId}: verified PCD has no reviewed output identity.`);
  assert.equal(output.survey_id, surveyId);
  assert.equal(proposal.pointCloud.legacyPointer.proposed, output.code);
  assert.equal(proposal.pointCloud.evidence.surveyId, surveyId);
  assert.equal(proposal.pointCloud.evidence.bytes, assets.clouds[0].bytes);
  const fileName = proposal.pointCloud.evidence.referenceKey.split("/").at(-1);
  const expectedUrl = `/asimov-hawks/3d/${proposal.clientCode}/2026/${surveyId}/${fileName}`;
  assert.equal(assets.clouds[0].url, expectedUrl);
  const decision = proposal.pointCloud.existing
    ? "preserve-existing-output"
    : "create-output";
  bindings.surveys[surveyId] = {
    pointClouds: [{ outputCode: output.code, url: assets.clouds[0].url, decision }],
  };
  boundClouds += 1;
  if (decision === "preserve-existing-output") preservedOutputs += 1;
  else proposedOutputs += 1;
}

assert.equal(boundClouds, 11);
assert.equal(preservedOutputs, 2);
assert.equal(proposedOutputs, 9);
fs.writeFileSync(target, JSON.stringify(bindings, null, 2) + "\n", { flag: "wx" });
console.log("Bound 11 verified PCDs: preserved 2 existing output identities; proposed 9 new identities.");
