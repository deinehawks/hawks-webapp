/* eslint-disable @typescript-eslint/no-require-imports, no-console */
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const { PERMANENTLY_EXCLUDED_SURVEY_IDS } = require("./lib/workshop-assets");

function parseArgs(argv) {
  const index = argv.indexOf("--config");
  if (index === -1 || !argv[index + 1]) throw new Error("--config is required.");
  return { config: path.resolve(argv[index + 1]) };
}

function hash(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function main() {
  const { config: sourcePath } = parseArgs(process.argv);
  const source = await fs.readFile(sourcePath);
  const config = JSON.parse(source.toString("utf8"));
  if (config.targetEnvironment !== "staging") throw new Error("Only staging wave configs can be frozen.");
  if (config.workflowVersion !== 1 || config.reviewed !== false) throw new Error("Only an unreviewed generated workflowVersion 1 config can be frozen.");
  if (!Array.isArray(config.jobs) || !config.jobs.length || config.jobs.length > 3) throw new Error("Generated wave must contain one through three jobs.");
  if (!config.capacityGuard?.enabled) throw new Error("Generated wave must enable the capacity guard.");
  if (config.jobs.some((job) => PERMANENTLY_EXCLUDED_SURVEY_IDS.includes(String(job.surveyId).toUpperCase()))) {
    throw new Error("Generated wave contains a permanently excluded survey.");
  }
  const reviewed = {
    ...config,
    reviewed: true,
    reviewedAt: new Date().toISOString(),
    sourceConfigSha256: hash(source),
  };
  const outputRoot = path.resolve(process.cwd(), ".tmp/workshop-assets/reviewed");
  await fs.mkdir(outputRoot, { recursive: true });
  const outputPath = path.join(outputRoot, `${config.waveId}-${timestamp()}.jobs.json`);
  const serialized = Buffer.from(`${JSON.stringify(reviewed, null, 2)}\n`, "utf8");
  await fs.writeFile(outputPath, serialized);
  await fs.writeFile(`${outputPath}.sha256`, `${hash(serialized)}\n`, "utf8");
  console.log(`Frozen reviewed config: ${outputPath}`);
  console.log(`Integrity sidecar: ${outputPath}.sha256`);
}

main().catch((error) => {
  console.error("Workshop wave review failed:", error.message);
  process.exitCode = 1;
});
