import { Box3, PerspectiveCamera, Vector3 } from "three";
import type { OrbitControls } from "three-stdlib";

export const NAVIGATION_SETTINGS = {
  rotateSpeed: 0.6,
  panSpeed: 0.8,
  zoomSpeed: 0.65,
  dampingFactor: 0.12,
  minPolarAngle: 0.01,
  maxPolarAngle: Math.PI / 2 - 0.01,
};
export type SurveyView = "fit" | "top" | "3d";
const UP = new Vector3(0, 0, 1);

export function constrainSurveyDirection(direction: Vector3): Vector3 {
  const result = direction.clone().normalize();
  const polar = Math.max(NAVIGATION_SETTINGS.minPolarAngle,
    Math.min(NAVIGATION_SETTINGS.maxPolarAngle, Math.acos(Math.max(-1, Math.min(1, result.z)))));
  const horizontal = Math.hypot(result.x, result.y);
  return new Vector3(
    horizontal > 1e-10 ? result.x / horizontal * Math.sin(polar) : 0,
    horizontal > 1e-10 ? result.y / horizontal * Math.sin(polar) : -Math.sin(polar),
    Math.cos(polar),
  );
}

export function surveyViewDirection(view: SurveyView, current: Vector3): Vector3 {
  return constrainSurveyDirection(view === "3d" ? new Vector3(1, -1, 1)
    : view === "top" ? new Vector3(0, 0, 1) : current);
}

/** Fit cached box corners to the actual viewing angle and viewport. */
export function surveyFitDistance(bounds: Box3, direction: Vector3, fov: number, aspect: number): number {
  const center = bounds.getCenter(new Vector3());
  const back = constrainSurveyDirection(direction);
  const right = UP.clone().cross(back).normalize();
  const vertical = back.clone().cross(right).normalize();
  const tanVertical = Math.tan(fov * Math.PI / 360);
  const tanHorizontal = tanVertical * Math.max(aspect, 0.01);
  let distance = 0;
  for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) {
    for (const z of [bounds.min.z, bounds.max.z]) {
      const corner = new Vector3(x, y, z).sub(center);
      distance = Math.max(distance, corner.dot(back) + Math.abs(corner.dot(right)) / tanHorizontal,
        corner.dot(back) + Math.abs(corner.dot(vertical)) / tanVertical);
    }
  }
  return Math.max(distance * 1.15, 0.1);
}

/** Viewer-local camera state. No point queries or React updates per frame. */
export function createSurveyNavigation(
  camera: PerspectiveCamera, controls: OrbitControls, bounds: Box3, invalidate: () => void,
  reducedMotion = false,
) {
  if (bounds.isEmpty() || ![...bounds.min.toArray(), ...bounds.max.toArray()].every(Number.isFinite)) {
    throw new Error("The 3D model has no viewable bounds.");
  }
  const center = bounds.getCenter(new Vector3());
  const radius = Math.max(bounds.getSize(new Vector3()).length() / 2, 0.1);
  let animation: { from: Vector3; to: Vector3; fromTarget: Vector3; target: Vector3; elapsed: number; started: boolean } | null = null;
  let disposed = false;
  camera.up.copy(UP);
  Object.assign(controls, NAVIGATION_SETTINGS);

  function finish() {
    if (!animation) return;
    camera.position.copy(animation.to);
    controls.target.copy(animation.target);
    animation = null;
    controls.update();
    invalidate();
  }
  function stopDrift() {
    // Consume any remaining control deltas before a scripted camera movement.
    const damping = controls.enableDamping;
    controls.enableDamping = false;
    controls.update();
    controls.enableDamping = damping;
  }
  function move(position: Vector3, target: Vector3, immediate = reducedMotion) {
    if (disposed) return;
    stopDrift();
    animation = { from: camera.position.clone(), to: position.clone(), fromTarget: controls.target.clone(),
      target: target.clone(), elapsed: 0, started: false };
    if (immediate) finish();
    else invalidate();
  }
  const cancel = () => { animation = null; };
  controls.addEventListener("start", cancel);

  const navigation = {
    resize() {
      if (disposed) return;
      const distance = surveyFitDistance(bounds, surveyViewDirection("3d", center), camera.fov, camera.aspect);
      controls.minDistance = radius * 0.02;
      controls.maxDistance = Math.max(distance * 8, camera.position.distanceTo(controls.target));
      camera.near = radius * 0.001;
      camera.far = Math.max(controls.maxDistance + radius * 2, camera.position.distanceTo(center) + radius * 2);
      camera.updateProjectionMatrix();
      invalidate();
    },
    view(view: SurveyView, immediate = reducedMotion) {
      const direction = surveyViewDirection(view, camera.position.clone().sub(controls.target));
      const distance = surveyFitDistance(bounds, direction, camera.fov, camera.aspect);
      move(center.clone().addScaledVector(direction, distance), center, immediate);
    },
    zoom(closer: boolean) {
      const target = animation?.target ?? controls.target;
      const offset = (animation?.to ?? camera.position).clone().sub(target);
      const distance = Math.max(controls.minDistance, Math.min(controls.maxDistance, offset.length() * (closer ? 0.8 : 1.25)));
      move(target.clone().addScaledVector(offset.normalize(), distance), target);
    },
    pan(horizontal: number, vertical: number, viewportHeight: number) {
      if (disposed) return;
      cancel(); stopDrift();
      camera.updateMatrixWorld();
      const step = 2 * camera.position.distanceTo(controls.target) * Math.tan(camera.fov * Math.PI / 360) * 32 / Math.max(1, viewportHeight);
      const offset = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(horizontal * step)
        .addScaledVector(new Vector3().setFromMatrixColumn(camera.matrixWorld, 1), vertical * step);
      camera.position.add(offset); controls.target.add(offset); controls.update(); invalidate();
    },
    update(delta: number) {
      if (disposed || !animation) return;
      // The first demand-rendered frame can have a very large idle delta.
      if (!animation.started) animation.started = true;
      else animation.elapsed += Math.min(Math.max(delta, 0), 0.1);
      const t = Math.min(animation.elapsed / 0.3, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      camera.position.lerpVectors(animation.from, animation.to, eased);
      controls.target.lerpVectors(animation.fromTarget, animation.target, eased);
      camera.lookAt(controls.target);
      if (t === 1) finish();
      else invalidate();
    },
    setReducedMotion(reduce: boolean) {
      if (disposed) return;
      reducedMotion = reduce;
      controls.enableDamping = !reduce;
      if (reduce) { stopDrift(); finish(); }
    },
    dispose() { disposed = true; animation = null; controls.removeEventListener("start", cancel); },
  };
  navigation.setReducedMotion(reducedMotion);
  navigation.resize();
  navigation.view("3d", true);
  return navigation;
}

export type SurveyNavigation = ReturnType<typeof createSurveyNavigation>;
