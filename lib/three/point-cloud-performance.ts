import {
  AddEquation, BufferAttribute, BufferGeometry, CustomBlending, Points,
  PointsMaterial, SrcColorFactor, Vector3, ZeroFactor,
} from "three";

export const MOVING_POINT_BUDGET = 2_000_000;
export const POINT_DETAIL_RESTORE_MS = 180;
export const POINT_CLOUD_RENDERER = {
  antialias: false,
  logarithmicDepthBuffer: false,
  powerPreference: "high-performance" as const,
};

const centeredGeometries = new WeakSet<BufferGeometry>();

/** Sample across the complete cloud, rather than hiding its later sections. */
export function createMovingPointIndex(count: number, budget = MOVING_POINT_BUDGET) {
  if (!Number.isSafeInteger(count) || count < 0 || count > 0xffffffff ||
      !Number.isSafeInteger(budget) || budget < 2) throw new Error("Invalid point budget.");
  if (count <= budget) return null;
  const indices = new Uint32Array(budget);
  for (let index = 0; index < budget; index++) {
    indices[index] = Math.floor(index * (count - 1) / (budget - 1));
  }
  return new BufferAttribute(indices, 1);
}

export function createPointCloudPresentation(source: Points) {
  const original = source.geometry;
  // Cached PCD coordinates need centering only once, including older exports
  // with large map coordinates. Avoid repeatedly scanning/translating them.
  if (!centeredGeometries.has(original)) {
    original.computeBoundingBox();
    if (original.boundingBox && !original.boundingBox.isEmpty()) {
      const center = original.boundingBox.getCenter(new Vector3());
      original.translate(-center.x, -center.y, -center.z);
    }
    centeredGeometries.add(original);
  }
  const geometry = new BufferGeometry();
  // Share the loaded CPU buffers, but own the draw state and GPU resources.
  for (const [name, attribute] of Object.entries(original.attributes)) geometry.setAttribute(name, attribute);
  geometry.boundingBox = original.boundingBox?.clone() ?? null;
  geometry.boundingSphere = original.boundingSphere?.clone() ?? null;
  const baseMaterial = Array.isArray(source.material) ? source.material[0] : source.material;
  const material = baseMaterial instanceof PointsMaterial ? baseMaterial.clone() : new PointsMaterial();
  Object.assign(material, {
    size: 0.1, vertexColors: geometry.hasAttribute("color"),
    blending: CustomBlending, blendEquation: AddEquation,
    blendSrc: SrcColorFactor, blendDst: ZeroFactor,
  });
  const points = new Points(geometry, material);
  points.name = source.name;
  // This viewer has no point-picking interaction. Camera navigation should
  // never need to raycast through millions of individual points.
  points.raycast = () => {};
  return points;
}

type MotionOptions = {
  budget?: number;
  restoreDelay?: number;
  schedule?: (callback: () => void, delay: number) => () => void;
};

/** Transient draw state; never changes the loaded attributes or dataset files. */
export function createPointCloudMotion(points: Points, invalidate: () => void, options: MotionOptions = {}) {
  const geometry = points.geometry;
  const count = geometry.getAttribute("position").count;
  const movingIndex = createMovingPointIndex(count, options.budget);
  const schedule = options.schedule ?? ((callback, delay) => {
    const timer = setTimeout(callback, delay);
    return () => clearTimeout(timer);
  });
  let cancelRestore: (() => void) | undefined;
  let moving = false, disposed = false;
  geometry.setIndex(null);
  geometry.setDrawRange(0, count);
  return {
    moving() {
      if (disposed || !movingIndex) return;
      if (!moving) {
        geometry.setIndex(movingIndex);
        geometry.setDrawRange(0, movingIndex.count);
        moving = true;
        invalidate();
      }
      cancelRestore?.();
      cancelRestore = schedule(() => {
        if (disposed) return;
        geometry.setIndex(null);
        geometry.setDrawRange(0, count);
        moving = false;
        cancelRestore = undefined;
        invalidate();
      }, options.restoreDelay ?? POINT_DETAIL_RESTORE_MS);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelRestore?.();
      // The motion index can have GPU storage even when full detail is active.
      // Bind it for disposal so its buffer is released along with the geometry.
      geometry.setIndex(movingIndex);
      geometry.dispose();
      geometry.setIndex(null);
      geometry.setDrawRange(0, count);
      const materials = Array.isArray(points.material) ? points.material : [points.material];
      materials.forEach((material) => material.dispose());
    },
  };
}
