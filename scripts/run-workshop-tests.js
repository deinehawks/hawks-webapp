const { spawnSync } = require("node:child_process");

const tests = [
  "tests/workshop-files.test.mjs",
  "tests/prepare-workshop-data.test.cjs",
  "tests/workshop-tracing.test.mjs",
  "tests/survey-tile-folder.test.mjs",
  "tests/workshop-visibility.test.mjs",
  "tests/workshop-actions.test.mjs",
  "tests/workshop-pcd.test.cjs",
  "tests/survey-selection.test.mjs",
  "tests/detection-labels.test.mjs",
];

for (const test of tests) {
  const result = spawnSync(
    process.execPath,
    ["--experimental-strip-types", "--test", test],
    {
    stdio: "inherit",
    },
  );

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
