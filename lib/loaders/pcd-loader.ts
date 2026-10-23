import { BufferAttribute, BufferGeometry, Points, PointsMaterial } from "three";
import { PCDLoader } from "three-stdlib";

function decompressLzf(input: Uint8Array, size: number): Uint8Array {
  const output = new Uint8Array(size);
  let read = 0, written = 0;
  while (read < input.length) {
    const control = input[read++];
    if (control < 32) {
      const length = control + 1;
      if (read + length > input.length || written + length > size) throw new Error("Invalid compressed PCD data.");
      output.set(input.subarray(read, read + length), written);
      read += length;
      written += length;
    } else {
      let length = control >>> 5;
      if (length === 7) {
        if (read >= input.length) throw new Error("Invalid compressed PCD data.");
        length += input[read++];
      }
      if (read >= input.length) throw new Error("Invalid compressed PCD data.");
      const reference = written - ((control & 31) << 8) - input[read++] - 1;
      length += 2;
      if (reference < 0 || written + length > size) throw new Error("Invalid compressed PCD data.");
      // Back-references can overlap their destination.
      for (let index = 0; index < length; index++) output[written++] = output[reference + index];
    }
  }
  if (written !== size) throw new Error("Incomplete compressed PCD data.");
  return output;
}

/** Keep large workshop clouds out of JavaScript strings and growing arrays. */
export class WorkshopPCDLoader extends PCDLoader {
  override parse(data: ArrayBuffer | string, url: string): Points {
    if (typeof data === "string") return super.parse(data, url);

    const prefix = new TextDecoder().decode(new Uint8Array(data, 0, Math.min(data.byteLength, 64 * 1024)));
    const marker = /(?:^|\r?\n)DATA[ \t]+(binary_compressed|binary)[ \t]*\r?\n/i.exec(prefix);
    if (!marker) return super.parse(data, url);
    const headerBytes = marker.index + marker[0].length;
    const header = prefix.slice(0, headerBytes).replace(/#[^\r\n]*/g, "");
    const field = (name: string) => new RegExp("^" + name + "[ \\t]+([^\\r\\n]+)", "mi").exec(header)?.[1].trim();
    const fields = field("FIELDS")?.split(/\s+/) ?? [];
    const sizes = field("SIZE")?.split(/\s+/).map(Number) ?? [];
    const types = field("TYPE")?.split(/\s+/) ?? [];
    const counts = field("COUNT")?.split(/\s+/).map(Number) ?? fields.map(() => 1);
    const supported = fields.length === 4 && new Set(fields).size === 4 &&
      ["x", "y", "z", "rgb"].every((name) => fields.includes(name)) &&
      sizes.length === 4 && sizes.every((size) => size === 4) &&
      counts.length === 4 && counts.every((count) => count === 1) &&
      types.length === 4 && fields.every((name, index) => name === "rgb" ? ["F", "U"].includes(types[index]) : types[index] === "F");
    // Keep existing ASCII and other legacy layouts on the established reader.
    if (!supported) return super.parse(data, url);

    const width = Number(field("WIDTH")), height = Number(field("HEIGHT"));
    const points = Number(field("POINTS") ?? width * height);
    const payloadBytes = points * 16;
    if (!Number.isSafeInteger(points) || points < 0 || !Number.isSafeInteger(payloadBytes)) throw new Error("Invalid PCD point count.");
    let bytes: Uint8Array;
    const compressed = marker[1].toLowerCase() === "binary_compressed";
    if (compressed) {
      if (data.byteLength < headerBytes + 8) throw new Error("Incomplete compressed PCD header.");
      const sizes = new DataView(data, headerBytes, 8);
      const compressedBytes = sizes.getUint32(0, true);
      if (sizes.getUint32(4, true) !== payloadBytes || headerBytes + 8 + compressedBytes !== data.byteLength) throw new Error("PCD payload length does not match its point count.");
      bytes = decompressLzf(new Uint8Array(data, headerBytes + 8, compressedBytes), payloadBytes);
    } else {
      if (data.byteLength - headerBytes !== payloadBytes) throw new Error("PCD payload length does not match its point count.");
      bytes = new Uint8Array(data, headerBytes, payloadBytes);
    }

    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const positions = new Float32Array(points * 3);
    const colors = new Uint8Array(points * 3);
    const offsets = ["x", "y", "z", "rgb"].map((name) => fields.indexOf(name) * 4);
    for (let index = 0; index < points; index++) {
      const row = index * (compressed ? 4 : 16);
      for (let axis = 0; axis < 3; axis++) {
        const coordinate = view.getFloat32(row + offsets[axis] * (compressed ? points : 1), this.littleEndian);
        if (!Number.isFinite(coordinate)) throw new Error("PCD contains a non-finite coordinate.");
        positions[index * 3 + axis] = coordinate;
      }
      const rgb = row + offsets[3] * (compressed ? points : 1);
      colors[index * 3] = view.getUint8(rgb + 2);
      colors[index * 3 + 1] = view.getUint8(rgb + 1);
      colors[index * 3 + 2] = view.getUint8(rgb);
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(positions, 3));
    // Normalized bytes preserve the same RGB values using one quarter of the
    // color-buffer memory required by float32 channels.
    geometry.setAttribute("color", new BufferAttribute(colors, 3, true));
    geometry.computeBoundingSphere();
    const cloud = new Points(geometry, new PointsMaterial({ size: 0.005, vertexColors: true }));
    cloud.name = url.split("/").pop() ?? "";
    return cloud;
  }
}
