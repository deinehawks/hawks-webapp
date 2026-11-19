const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const projectRoot = path.resolve(__dirname, "../..");
const scriptNames = [
  "minio-storage-start.ps1",
  "minio-storage-status.ps1",
  "minio-storage-launcher.ps1",
  "install-minio-storage-launcher.ps1",
];

test("MinIO PowerShell scripts parse without syntax errors", () => {
  for (const scriptName of scriptNames) {
    const scriptPath = path.join(projectRoot, "scripts", scriptName);
    const escapedPath = scriptPath.replaceAll("'", "''");
    const command = [
      "$tokens = $null",
      "$errors = $null",
      `[void][System.Management.Automation.Language.Parser]::ParseFile('${escapedPath}', [ref]$tokens, [ref]$errors)`,
      "if ($errors.Count -gt 0) { $errors | ForEach-Object { Write-Error $_.Message }; exit 1 }",
    ].join("; ");
    const result = spawnSync("powershell.exe", ["-NoProfile", "-Command", command], {
      encoding: "utf8",
    });
    assert.equal(result.status, 0, `${scriptName}: ${result.stderr || result.stdout}`);
  }
});

test("package exposes install, status, start, and test commands", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"));
  assert.equal(packageJson.scripts["minio-storage:start"], "powershell -NoProfile -ExecutionPolicy Bypass -File scripts/minio-storage-start.ps1");
  assert.equal(packageJson.scripts["minio-storage:status"], "powershell -NoProfile -ExecutionPolicy Bypass -File scripts/minio-storage-status.ps1");
  assert.equal(packageJson.scripts["minio-storage:install"], "powershell -NoProfile -ExecutionPolicy Bypass -File scripts/install-minio-storage-launcher.ps1");
  assert.equal(packageJson.scripts["minio-storage:test"], "node --test scripts/tests/minio-storage-ux.test.js");
});

test("status command stays read-only", () => {
  const statusScript = fs.readFileSync(path.join(projectRoot, "scripts", "minio-storage-status.ps1"), "utf8");
  const forbidden = [
    /wsl\.exe\s+--mount/i,
    /docker\s+start/i,
    /docker\s+rm/i,
    /Remove-ItemProperty/i,
    /Set-ItemProperty/i,
    /WriteAllText/i,
  ];
  for (const pattern of forbidden) {
    assert.doesNotMatch(statusScript, pattern);
  }
});

test("installed launcher elevates and delegates to the guarded helper", () => {
  const launcher = fs.readFileSync(path.join(projectRoot, "scripts", "minio-storage-launcher.ps1"), "utf8");
  assert.match(launcher, /-Verb RunAs/);
  assert.match(launcher, /minio-storage-start\.ps1/);
  assert.match(launcher, /Start-Transcript/);

  const installer = fs.readFileSync(path.join(projectRoot, "scripts", "install-minio-storage-launcher.ps1"), "utf8");
  assert.match(installer, /SupportsShouldProcess\s*=\s*\$true/);
  assert.match(installer, /Quit Docker Desktop completely/);
  assert.match(installer, /must not contain credentials or access keys/);
  assert.match(installer, /Remove-ItemProperty/);
  assert.match(installer, /CreateShortcut/);
});
