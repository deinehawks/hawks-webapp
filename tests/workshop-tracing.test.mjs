import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import config from "../next.config.ts";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const { nodeFileTrace } = require("next/dist/compiled/@vercel/nft");
const picomatch = require("next/dist/compiled/picomatch");

test("the production tracer skips dataset globs before enumerating any files", async () => {
  class TraceEntryPointsPlugin { traceIgnores = []; }
  const plugin = new TraceEntryPointsPlugin();
  config.webpack({ plugins: [plugin] }, { dev: false, isServer: true, nextRuntime: "nodejs" });
  const ignored = picomatch(plugin.traceIgnores, { contains: true, dot: true });
  let datasetGlobs = 0;
  const ignore = (file) => {
    const skip = ignored(file);
    if (file.includes("*") && file.includes("workshop-data")) {
      // Fail before NFT can touch the real dataset, even if config regresses.
      assert.equal(skip, true, `Unexcluded dataset glob: ${file}`);
      datasetGlobs++;
    }
    return skip;
  };

  // Newer NFT versions can avoid producing this glob. Exercise the configured
  // early matcher directly so that behavior remains under regression coverage.
  assert.equal(ignore("**/workshop-data/**/*"), true);
  const result = await nodeFileTrace(["lib/workshop-files.ts", "lib/helpers/get-max-zoom.ts", "lib/workshop-visibility.ts"], {
    base: process.cwd(),
    processCwd: process.cwd(),
    readFile: async (file) => {
      try {
        const source = await fs.readFile(file, "utf8");
        return file.endsWith(".ts")
          ? ts.transpileModule(source, {
              compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
            }).outputText
          : source;
      } catch (error) {
        if (error.code === "ENOENT") return null;
        throw error;
      }
    },
    ignore,
  });
  assert.ok(datasetGlobs > 0, "exercise the early glob exclusion");
  assert.ok([...result.fileList].every((file) => !file.includes("workshop-data")));
});
