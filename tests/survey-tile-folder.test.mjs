import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { resolveSurveyTileFolder } from "../lib/helpers/resolve-survey-tile-folder.ts";

test("survey tile folders follow available exports when database metadata is stale", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "hawks-survey-tiles-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));

  // AH-0260001 has both; AH-0260002 and AH-0260003 have sharp-corners only.
  for (const [id, folders] of [
    ["AH-0260001", ["round-corners", "sharp-corners"]],
    ["AH-0260002", ["sharp-corners"]],
    ["AH-0260003", ["sharp-corners"]],
  ]) {
    for (const folder of folders) {
      await fs.mkdir(path.join(root, id, "ortho", folder), { recursive: true });
    }
  }
  assert.equal(resolveSurveyTileFolder(path.join(root, "AH-0260001", "ortho"), "round-corners"), "round-corners");
  for (const id of ["AH-0260002", "AH-0260003"]) {
    assert.equal(resolveSurveyTileFolder(path.join(root, id, "ortho"), "round-corners"), "sharp-corners");
  }
  assert.equal(resolveSurveyTileFolder(path.join(root, "AH-0260001", "ortho"), "sharp-corners"), "sharp-corners");
});

test("folder resolution preserves custom exports and handles absent datasets safely", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "hawks-survey-exports-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, "custom-export"));
  assert.equal(resolveSurveyTileFolder(root, "custom-export"), "custom-export");
  assert.equal(resolveSurveyTileFolder(root, null), "round-corners");
  assert.equal(resolveSurveyTileFolder(path.join(root, "missing"), "sharp-corners"), "sharp-corners");
  assert.equal(resolveSurveyTileFolder(root, "../custom-export"), "round-corners");
  assert.equal(resolveSurveyTileFolder(root, ".hidden"), "round-corners");
  await fs.writeFile(path.join(root, "round-corners"), "not a directory");
  await fs.mkdir(path.join(root, "sharp-corners"));
  assert.equal(resolveSurveyTileFolder(root, "round-corners"), "sharp-corners");
});
