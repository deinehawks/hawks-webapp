const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { prepareWorkshopData } = require("../scripts/prepare-workshop-data.cjs");

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "hawks-workshop-migration-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  for (const dataset of ["tiles", "3d"]) {
    await fs.mkdir(path.join(root, "public", dataset, "nested"), { recursive: true });
    await fs.writeFile(path.join(root, "public", dataset, "nested", "sample.bin"), dataset);
  }
  return root;
}

test("moves both directories without enumerating contents and can be rerun", async (t) => {
  const root = await fixture(t);
  const files = {};
  for (const dataset of ["tiles", "3d"]) {
    files[dataset] = await fs.stat(path.join(root, "public", dataset, "nested", "sample.bin"));
  }
  // Any directory enumeration during migration would fail this test.
  const enumeration = t.mock.method(fs, "readdir", () => { throw new Error("Do not scan datasets"); });
  await prepareWorkshopData(root, () => {});
  await prepareWorkshopData(root, () => {});
  enumeration.mock.restore();
  for (const dataset of ["tiles", "3d"]) {
    const destination = path.join(root, "workshop-data", dataset, "nested", "sample.bin");
    assert.equal(await fs.readFile(destination, "utf8"), dataset);
    assert.equal((await fs.stat(destination)).ino, files[dataset].ino);
    await assert.rejects(fs.stat(path.join(root, "public", dataset)), { code: "ENOENT" });
  }
});

test("preflights both datasets and refuses a conflict before moving either", async (t) => {
  const root = await fixture(t);
  await fs.mkdir(path.join(root, "workshop-data", "3d"), { recursive: true });
  await assert.rejects(prepareWorkshopData(root, () => {}), /Both public\/3d/);
  assert.ok((await fs.stat(path.join(root, "public", "tiles"))).isDirectory());
  await assert.rejects(fs.stat(path.join(root, "workshop-data", "tiles")), { code: "ENOENT" });
});

test("handles a previous partial migration safely", async (t) => {
  const root = await fixture(t);
  await fs.mkdir(path.join(root, "workshop-data"));
  await fs.rename(path.join(root, "public", "tiles"), path.join(root, "workshop-data", "tiles"));
  await prepareWorkshopData(root, () => {});
  assert.equal(await fs.readFile(path.join(root, "workshop-data", "3d", "nested", "sample.bin"), "utf8"), "3d");
});

test("refuses junctions so moves cannot escape the workspace", async (t) => {
  const root = await fixture(t);
  const outside = await fs.mkdtemp(path.join(os.tmpdir(), "hawks-workshop-outside-"));
  t.after(() => fs.rm(outside, { recursive: true, force: true }));
  await fs.symlink(outside, path.join(root, "workshop-data"), "junction");
  await assert.rejects(prepareWorkshopData(root, () => {}), /not a link/);
  assert.ok((await fs.stat(path.join(root, "public", "tiles"))).isDirectory());
  assert.ok((await fs.stat(path.join(root, "public", "3d"))).isDirectory());
});

test("refuses files occupying a dataset destination", async (t) => {
  const root = await fixture(t);
  await fs.mkdir(path.join(root, "workshop-data"));
  await fs.writeFile(path.join(root, "workshop-data", "tiles"), "keep me");
  await assert.rejects(prepareWorkshopData(root, () => {}), /not a link or file/);
  assert.equal(await fs.readFile(path.join(root, "workshop-data", "tiles"), "utf8"), "keep me");
});

test("allows an installation without local datasets", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "hawks-workshop-empty-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await prepareWorkshopData(root, () => {});
  await assert.rejects(fs.stat(path.join(root, "workshop-data")), { code: "ENOENT" });
});
