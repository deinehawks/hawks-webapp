const fs = require("node:fs/promises");
const path = require("node:path");

async function statOrNull(target) {
  try {
    return await fs.lstat(target);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function assertInside(root, target) {
  const relative = path.relative(root, target);
  if (!relative || relative === ".." ||
      relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error("Migration path must stay inside the project directory.");
  }
}

async function validateDirectory(root, target) {
  assertInside(root, target);
  const stats = await statOrNull(target);
  if (stats) {
    if (!stats.isDirectory() || stats.isSymbolicLink()) {
      throw new Error(`Expected a regular directory, not a link or file: ${target}`);
    }
    assertInside(root, await fs.realpath(target));
  }
  return stats;
}

async function prepareWorkshopData(workspace = path.resolve(__dirname, ".."), log = console.log) {
  const root = await fs.realpath(workspace);
  const publicRoot = path.join(root, "public");
  const dataRoot = path.join(root, "workshop-data");
  await validateDirectory(root, publicRoot);
  await validateDirectory(root, dataRoot);

  // Preflight both datasets before moving either. Never merge folders.
  const moves = [];
  for (const dataset of ["tiles", "3d"]) {
    const source = path.join(publicRoot, dataset);
    const destination = path.join(dataRoot, dataset);
    const sourceStats = await validateDirectory(root, source);
    const destinationStats = await validateDirectory(root, destination);
    if (sourceStats && destinationStats) {
      throw new Error(`Both public/${dataset} and workshop-data/${dataset} exist. Resolve the conflict manually; nothing was moved.`);
    }
    moves.push({
      dataset, source, destination,
      needed: Boolean(sourceStats), prepared: Boolean(destinationStats),
    });
  }

  if (moves.some((move) => move.needed)) await fs.mkdir(dataRoot, { recursive: true });
  for (const move of moves) {
    if (move.needed) {
      // No fallback to copying if rename fails (e.g. across volumes).
      if (await statOrNull(move.destination)) {
        throw new Error(`Destination appeared during migration: ${move.destination}`);
      }
      await fs.rename(move.source, move.destination);
      log(`Moved public/${move.dataset} -> workshop-data/${move.dataset}`);
    } else {
      log(move.prepared ? `${move.dataset}: already prepared` : `${move.dataset}: no local dataset found`);
    }
  }
  log("Preparation complete. Run npm run build, then npm run start.");
}

module.exports = { prepareWorkshopData };

if (require.main === module) {
  prepareWorkshopData().catch((error) => {
    console.error(`Preparation failed: ${error.message}`);
    console.error("No files were deleted. Any completed moves remain in workshop-data; resolve the issue and rerun.");
    process.exitCode = 1;
  });
}
