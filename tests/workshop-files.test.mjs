import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { mkdtemp, mkdir, writeFile, rm, symlink, open, truncate } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getWorkshopDataDirectory, serveWorkshopFile } from "../lib/workshop-files.ts";
import { getSurveyMaxZoom } from "../lib/helpers/get-max-zoom.ts";

describe("workshop file serving", () => {
  let temporary;
  let root;
  const contents = Buffer.from("0123456789");
  const request = (options = {}) => new Request("http://localhost/asimov-hawks/tiles/sample.png", options);
  const serve = (options, segments = ["sample.png"]) => serveWorkshopFile(request(options), segments, root);

  before(async () => {
    temporary = await mkdtemp(path.join(os.tmpdir(), "hawks-workshop-files-"));
    root = path.join(temporary, "data");
    await mkdir(root);
    await writeFile(path.join(root, "sample.png"), contents);
    await writeFile(path.join(root, "model.pcd"), contents);
    await writeFile(path.join(root, "empty.pcd"), "");
    await mkdir(path.join(root, "folder"));
  });

  after(async () => {
    await rm(temporary, { recursive: true, force: true });
  });

  it("resolves both datasets outside public", () => {
    assert.equal(getWorkshopDataDirectory("tiles"), path.join(process.cwd(), "workshop-data", "tiles"));
    assert.equal(getWorkshopDataDirectory("3d"), path.join(process.cwd(), "workshop-data", "3d"));
  });

  it("streams exact bytes with cache and content headers", async () => {
    const response = await serve();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "image/png");
    assert.equal(response.headers.get("content-length"), "10");
    assert.equal(response.headers.get("cache-control"), "private, max-age=3600");
    assert.equal(response.headers.get("accept-ranges"), "bytes");
    assert.ok(response.headers.get("etag"));
    assert.ok(response.headers.get("last-modified"));
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), contents);
  });

  it("serves binary point clouds and empty files", async () => {
    const model = await serve({}, ["model.pcd"]);
    assert.equal(model.headers.get("content-type"), "application/octet-stream");
    assert.deepEqual(Buffer.from(await model.arrayBuffer()), contents);
    const empty = await serve({}, ["empty.pcd"]);
    assert.equal(empty.headers.get("content-length"), "0");
    assert.equal((await empty.arrayBuffer()).byteLength, 0);
  });

  it("HEAD returns metadata without a body and ignores Range", async () => {
    const response = await serve({ method: "HEAD", headers: { Range: "bytes=2-5" } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-length"), "10");
    assert.equal(response.body, null);
  });

  it("honors matching weak/strong/list/wildcard If-None-Match", async () => {
    const first = await serve({ method: "HEAD" });
    const etag = first.headers.get("etag");
    for (const tag of [etag, etag.replace("W/", ""), `"other", ${etag}`, "*"]) {
      const response = await serve({ headers: { "If-None-Match": tag, Range: "bytes=0-1" } });
      assert.equal(response.status, 304);
      assert.equal(response.body, null);
      assert.equal(response.headers.get("content-length"), null);
    }
    const changed = await serve({ headers: { "If-None-Match": '"other"' } });
    assert.equal(changed.status, 200);
    await changed.arrayBuffer();
  });

  it("supports bounded, open-ended, suffix, and clipped byte ranges", async () => {
    for (const [range, expected, contentRange] of [
      ["bytes=2-5", "2345", "bytes 2-5/10"],
      ["bytes=7-", "789", "bytes 7-9/10"],
      ["bytes=-3", "789", "bytes 7-9/10"],
      ["bytes=8-100", "89", "bytes 8-9/10"],
      ["bytes=-100", "0123456789", "bytes 0-9/10"],
    ]) {
      const response = await serve({ headers: { Range: range } });
      assert.equal(response.status, 206);
      assert.equal(response.headers.get("content-range"), contentRange);
      assert.equal(response.headers.get("content-length"), String(expected.length));
      assert.equal(await response.text(), expected);
    }
  });

  it("returns uncacheable 416 for unsatisfiable or malformed single ranges", async () => {
    for (const range of ["bytes=10-", "bytes=5-2", "bytes=-0", "bytes=-", "bytes=oops", "bytes=999999999999999999999-"]) {
      const response = await serve({ headers: { Range: range } });
      assert.equal(response.status, 416, range);
      assert.equal(response.headers.get("content-range"), "bytes */10");
      assert.equal(response.headers.get("cache-control"), "no-store");
    }
    assert.equal((await serve({ headers: { Range: "bytes=0-0" } }, ["empty.pcd"])).status, 416);
  });

  it("ignores multiple ranges and unknown range units", async () => {
    for (const range of ["bytes=0-1,5-6", "items=0-1"]) {
      const response = await serve({ headers: { Range: range } });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("content-range"), null);
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), contents);
    }
  });

  it("uses dates for If-Range and rejects weak validators for partial content", async () => {
    const metadata = await serve({ method: "HEAD" });
    const partial = await serve({ headers: { Range: "bytes=0-1", "If-Range": metadata.headers.get("last-modified") } });
    assert.equal(partial.status, 206);
    await partial.arrayBuffer();
    for (const validator of [metadata.headers.get("etag"), "Thu, 01 Jan 1970 00:00:00 GMT"]) {
      const full = await serve({ headers: { Range: "bytes=0-1", "If-Range": validator } });
      assert.equal(full.status, 200);
      await full.arrayBuffer();
    }
  });

  it("rejects missing files, directories, traversal, hidden paths, and Windows ADS", async () => {
    for (const segments of [
      [], ["missing.png"], ["folder"], ["..", "sample.png"], [".hidden"],
      ["folder", "..", "sample.png"], ["folder/sample.png"],
      ["folder\\sample.png"], ["C:", "sample.png"], ["model.pcd:secret"],
      ["sample.png."], ["sample.png "], ["sample\0.png"],
    ]) {
      const response = await serve({}, segments);
      assert.equal(response.status, 404, JSON.stringify(segments));
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.equal(await response.text(), "Not found");
    }
    const missingRoot = await serveWorkshopFile(request(), ["sample.png"], path.join(temporary, "missing-root"));
    assert.equal(missingRoot.status, 404);
    const head = await serve({ method: "HEAD" }, ["missing.png"]);
    assert.equal(head.status, 404);
    assert.equal(head.body, null);
  });

  it("blocks directory links escaping the root or hiding a dot directory", async () => {
    const outside = path.join(temporary, "outside");
    await mkdir(outside);
    await writeFile(path.join(outside, "secret.pcd"), contents);
    await symlink(outside, path.join(root, "escape"), "junction");
    assert.equal((await serve({}, ["escape", "secret.pcd"])).status, 404);
    const hidden = path.join(root, ".hidden");
    await mkdir(hidden);
    await writeFile(path.join(hidden, "secret.pcd"), contents);
    await symlink(hidden, path.join(root, "alias"), "junction");
    assert.equal((await serve({}, ["alias", "secret.pcd"])).status, 404);
  });

  it("closes the file stream on reader cancellation and request abort", async (t) => {
    const large = path.join(root, "large.pcd");
    await writeFile(large, "");
    await truncate(large, 16 * 1024 * 1024);
    const handle = await open(large, "r");
    const prototype = Object.getPrototypeOf(handle);
    const original = prototype.createReadStream;
    await handle.close();
    let observed;
    const mocked = t.mock.method(prototype, "createReadStream", function(options) {
      observed = original.call(this, options);
      return observed;
    });

    const canceled = await serve({}, ["large.pcd"]);
    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.ok(observed.bytesRead < 1024 * 1024, "stream must respect byte-based backpressure");
    const closed = new Promise((resolve) => observed.once("close", resolve));
    await canceled.body.cancel();
    await closed;
    assert.equal(observed.closed, true);

    const controller = new AbortController();
    const aborted = await serve({ signal: controller.signal }, ["large.pcd"]);
    const stream = observed;
    const abortClosed = new Promise((resolve) => stream.once("close", resolve));
    controller.abort();
    await assert.rejects(aborted.arrayBuffer());
    await abortClosed;
    assert.equal(stream.closed, true);
    mocked.mock.restore();
  });

  it("discovers only immediate numeric zoom directories", async () => {
    const tiles = path.join(root, "zooms");
    await mkdir(path.join(tiles, "12", "99"), { recursive: true });
    await mkdir(path.join(tiles, "18"));
    await mkdir(path.join(tiles, "round-corners"));
    await writeFile(path.join(tiles, "25"), "not a directory");
    assert.equal(getSurveyMaxZoom(tiles), 18);
    assert.equal(getSurveyMaxZoom(path.join(root, "missing-zooms")), 0);
  });
});
