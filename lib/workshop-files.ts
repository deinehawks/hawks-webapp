import path from "node:path";
import { open, realpath, stat } from "node:fs/promises";
import { Readable } from "node:stream";

export function getWorkshopDataDirectory(dataset: "tiles" | "3d"): string {
  return path.join(process.cwd(), "workshop-data", dataset);
}

const contentTypes: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".xml": "application/xml",
  ".json": "application/json",
  ".pbf": "application/x-protobuf",
  ".pcd": "application/octet-stream",
  ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json",
  ".bin": "application/octet-stream",
};

function isWithin(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative !== "" && relative !== ".." &&
    !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function validSegment(segment: string): boolean {
  // Params are already decoded by Next.js. Reject Windows ADS/separators too.
  return Boolean(segment) && !segment.startsWith(".") &&
    !/[\\/:\x00-\x1f<>"|?*]/.test(segment) && !/[. ]$/.test(segment);
}

function errorResponse(
  request: Request,
  status: number,
  message: string,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(request.method === "HEAD" ? null : message, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
      ...extraHeaders,
    },
  });
}

type ByteRange = { start: number; end: number };

// null means ignore Range; false means a single byte range is unsatisfiable.
function parseRange(value: string | null, size: number): ByteRange | null | false {
  if (!value || !value.startsWith("bytes=") || value.includes(",")) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(value.trim());
  if (!match || (!match[1] && !match[2]) || size === 0) return false;

  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return false;
    return { start: Math.max(0, size - suffix), end: size - 1 };
  }

  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) ||
      start >= size || end < start) return false;
  return { start, end: Math.min(end, size - 1) };
}

/** Opens one requested file only; never enumerates or buffers a dataset. */
export async function serveWorkshopFile(
  request: Request,
  segments: string[],
  root: string,
): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return errorResponse(request, 405, "Method not allowed", { Allow: "GET, HEAD" });
  }
  if (!segments.length || !segments.every(validSegment)) {
    return errorResponse(request, 404, "Not found");
  }

  let file: Awaited<ReturnType<typeof open>> | undefined;
  try {
    const resolvedRoot = await realpath(root);
    const candidate = path.resolve(resolvedRoot, ...segments);
    if (!isWithin(resolvedRoot, candidate)) {
      return errorResponse(request, 404, "Not found");
    }
    const resolvedFile = await realpath(candidate);
    if (!isWithin(resolvedRoot, resolvedFile) ||
        !path.relative(resolvedRoot, resolvedFile).split(path.sep).every(validSegment)) {
      return errorResponse(request, 404, "Not found");
    }

    // Windows cannot open directories as files; reject them before opening.
    if (!(await stat(resolvedFile)).isFile()) return errorResponse(request, 404, "Not found");
    file = await open(resolvedFile, "r");
    const stats = await file.stat();
    if (!stats.isFile()) return errorResponse(request, 404, "Not found");

    const etag = `W/"${stats.size.toString(16)}-${stats.mtimeMs.toString(16)}"`;
    const headers = new Headers({
      "Cache-Control": "private, max-age=3600",
      "Content-Type": contentTypes[path.extname(resolvedFile).toLowerCase()] ?? "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
      "Accept-Ranges": "bytes",
      "ETag": etag,
      "Last-Modified": stats.mtime.toUTCString(),
    });

    const ifNoneMatch = request.headers.get("if-none-match");
    if (ifNoneMatch?.split(",").some((tag) => {
      const value = tag.trim();
      return value === "*" || value.replace(/^W\//, "") === etag.replace(/^W\//, "");
    })) {
      return new Response(null, { status: 304, headers });
    }

    let range = request.method === "GET"
      ? parseRange(request.headers.get("range"), stats.size) : null;
    const ifRange = request.headers.get("if-range");
    // Our ETags are weak, so If-Range can only match a Last-Modified date.
    if (ifRange && (!/^[A-Za-z]{3},/.test(ifRange) ||
        !Number.isFinite(Date.parse(ifRange)) ||
        Math.floor(stats.mtimeMs / 1000) > Date.parse(ifRange) / 1000)) {
      range = null;
    }
    if (range === false) {
      return errorResponse(request, 416, "Range not satisfiable", {
        "Content-Range": `bytes */${stats.size}`,
        "Accept-Ranges": "bytes",
      });
    }

    headers.set("Content-Length", String(range ? range.end - range.start + 1 : stats.size));
    if (range) headers.set("Content-Range", `bytes ${range.start}-${range.end}/${stats.size}`);
    if (request.method === "HEAD") return new Response(null, { status: 200, headers });

    const stream = file.createReadStream({
      ...(range ?? {}),
      autoClose: true,
      signal: request.signal,
    });
    // Reader cancellation destroys the Node stream and closes its descriptor.
    const body = Readable.toWeb(stream, {
      strategy: {
        highWaterMark: stream.readableHighWaterMark,
        size: (chunk: Uint8Array) => chunk.byteLength,
      },
    }) as ReadableStream<Uint8Array>;
    const response = new Response(body, { status: range ? 206 : 200, headers });
    file = undefined; // Ownership transfers to the stream, including on abort.
    return response;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (["ENOENT", "ENOTDIR", "EISDIR", "ELOOP"].includes(code ?? "")) {
      return errorResponse(request, 404, "Not found");
    }
    console.error("Workshop file request failed:", code ?? "unknown error");
    return errorResponse(request, 500, "Unable to read file");
  } finally {
    await file?.close();
  }
}
