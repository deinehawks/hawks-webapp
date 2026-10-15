const fs = require("node:fs/promises");
const path = require("node:path");

const DEFAULT_MAX_POINTS = 4_000_000;
const ROW_BYTES = 36;
const OUTPUT_ROW_BYTES = 16;

async function readExactly(file, buffer, length, position) {
  let received = 0;
  while (received < length) {
    const { bytesRead } = await file.read(buffer, received, length - received, position + received);
    if (!bytesRead) throw new Error("Unexpected end of PCD file.");
    received += bytesRead;
  }
}

async function writeExactly(file, buffer) {
  let written = 0;
  while (written < buffer.length) {
    const { bytesWritten } = await file.write(buffer, written, buffer.length - written);
    if (!bytesWritten) throw new Error("Unable to write PCD output.");
    written += bytesWritten;
  }
}

/**
 * Convert the MCS binary XYZ/float64 RGB export into a sampled, packed-RGB PCD.
 * Reads the source sequentially with bounded buffers; never modifies its input.
 * The output must be a new path. An incomplete output is removed on failure.
 */
async function convertWorkshopPcd(input, output, maxPoints = DEFAULT_MAX_POINTS) {
  if (!Number.isSafeInteger(maxPoints) || maxPoints < 2) {
    throw new Error("maxPoints must be an integer of at least 2.");
  }
  const source = await fs.open(input, "r");
  let destination;
  let createdOutput = false;
  try {
    const initial = await source.stat();
    if (!initial.isFile()) throw new Error("Source must be a regular file.");
    const prefix = Buffer.alloc(Math.min(initial.size, 16 * 1024));
    await readExactly(source, prefix, prefix.length, 0);
    const text = prefix.toString("latin1");
    const data = /^DATA binary\r?\n/m.exec(text);
    if (!data) throw new Error("Expected a binary PCD header within the first 16 KiB.");
    const headerBytes = data.index + data[0].length;
    const header = text.slice(0, headerBytes);
    const field = (name) => new RegExp("^" + name + " ([^\\r\\n]+)", "m").exec(header)?.[1].trim();
    const normalized = (name) => field(name)?.split(/\s+/).join(" ");
    if (normalized("FIELDS") !== "x y z red green blue" ||
        normalized("SIZE") !== "4 4 4 8 8 8" ||
        normalized("TYPE") !== "F F F F F F" ||
        (field("COUNT") && normalized("COUNT") !== "1 1 1 1 1 1")) {
      throw new Error("Unsupported source layout: expected float32 XYZ and float64 red/green/blue.");
    }
    const pointCount = Number(field("POINTS"));
    const width = Number(field("WIDTH"));
    const height = Number(field("HEIGHT"));
    if (!Number.isSafeInteger(pointCount) || pointCount < 1 ||
        !Number.isSafeInteger(width) || !Number.isSafeInteger(height) ||
        width < 1 || height < 1 || width * height !== pointCount ||
        initial.size !== headerBytes + pointCount * ROW_BYTES) {
      throw new Error("PCD point count, dimensions, or payload length is inconsistent.");
    }
    const outputCount = Math.min(pointCount, maxPoints);
    const viewpoint = field("VIEWPOINT") ?? "0 0 0 1 0 0 0";
    if (viewpoint.split(/\s+/).length !== 7 || !viewpoint.split(/\s+/).every((v) => Number.isFinite(Number(v)))) {
      throw new Error("Invalid VIEWPOINT.");
    }
    const outputHeader = Buffer.from([
      "# Workshop preview; full-resolution source is preserved separately.",
      "VERSION 0.7", "FIELDS x y z rgb", "SIZE 4 4 4 4", "TYPE F F F U",
      "COUNT 1 1 1 1", "WIDTH " + outputCount, "HEIGHT 1",
      "VIEWPOINT " + viewpoint, "POINTS " + outputCount, "DATA binary", "",
    ].join("\n"), "ascii");

    destination = await fs.open(output, "wx");
    createdOutput = true;
    await writeExactly(destination, outputHeader);
    const rowsPerBlock = Math.floor(1024 * 1024 / ROW_BYTES);
    const inputBuffer = Buffer.alloc(rowsPerBlock * ROW_BYTES);
    const outputBuffer = Buffer.alloc(1024 * 1024);
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    let buffered = 0;
    let sampled = 0;
    const sourceIndex = () => outputCount === 1 ? 0
      : Math.floor(sampled * (pointCount - 1) / (outputCount - 1));
    for (let first = 0; first < pointCount; first += rowsPerBlock) {
      const rows = Math.min(rowsPerBlock, pointCount - first);
      await readExactly(source, inputBuffer, rows * ROW_BYTES, headerBytes + first * ROW_BYTES);
      while (sampled < outputCount && sourceIndex() < first + rows) {
        const offset = (sourceIndex() - first) * ROW_BYTES;
        for (let axis = 0; axis < 3; axis++) {
          const value = inputBuffer.readFloatLE(offset + axis * 4);
          if (!Number.isFinite(value)) throw new Error("Non-finite coordinates at source point " + sourceIndex());
          min[axis] = Math.min(min[axis], value);
          max[axis] = Math.max(max[axis], value);
        }
        const rgb = [12, 20, 28].map((channel) => inputBuffer.readDoubleLE(offset + channel));
        if (!rgb.every((value) => Number.isInteger(value) && value >= 0 && value <= 255)) {
          throw new Error("Invalid RGB values at source point " + sourceIndex());
        }
        inputBuffer.copy(outputBuffer, buffered, offset, offset + 12);
        outputBuffer.writeUInt32LE((rgb[0] << 16) | (rgb[1] << 8) | rgb[2], buffered + 12);
        buffered += OUTPUT_ROW_BYTES;
        sampled++;
        if (buffered === outputBuffer.length) {
          await writeExactly(destination, outputBuffer);
          buffered = 0;
        }
      }
    }
    if (buffered) await writeExactly(destination, outputBuffer.subarray(0, buffered));
    const finalSource = await source.stat();
    if (finalSource.size !== initial.size || finalSource.mtimeMs !== initial.mtimeMs) {
      throw new Error("Source changed during conversion.");
    }
    const expectedBytes = outputHeader.length + outputCount * OUTPUT_ROW_BYTES;
    if ((await destination.stat()).size !== expectedBytes || sampled !== outputCount) {
      throw new Error("Output size or point count is inconsistent.");
    }
    await destination.sync();
    return {
      input: path.resolve(input), output: path.resolve(output),
      sourcePoints: pointCount, outputPoints: outputCount,
      sourceBytes: initial.size, outputBytes: expectedBytes,
      bounds: { min, max },
    };
  } catch (error) {
    await destination?.close();
    destination = undefined;
    if (createdOutput) await fs.unlink(output);
    throw error;
  } finally {
    await destination?.close();
    await source.close();
  }
}

module.exports = { convertWorkshopPcd };

if (require.main === module) {
  const [input, output, maxPoints, ...extra] = process.argv.slice(2);
  if (!input || !output || extra.length) {
    console.error("Usage: node scripts/prepare-workshop-pcd.cjs <source.pcd> <new-output.pcd> [max-points=4000000]");
    process.exitCode = 1;
  } else {
    convertWorkshopPcd(input, output, maxPoints === undefined ? DEFAULT_MAX_POINTS : Number(maxPoints))
      .then((result) => console.log(JSON.stringify(result, null, 2)))
      .catch((error) => { console.error(error.message); process.exitCode = 1; });
  }
}
