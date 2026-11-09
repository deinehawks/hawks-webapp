"use client";

import { Component, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { PerspectiveCamera } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useReducedMotion } from "framer-motion";
import { AlertCircle, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSurveyMapStore } from "@/providers/survey-map-store-provider";
import { WorkshopPCDLoader } from "@/lib/loaders/pcd-loader";
import { RECORDING_PCD_MAX_BYTES, RECORDING_PCD_MAX_LABEL } from "@/lib/recording/limits";
import { createPointCloudMotion, createPointCloudPresentation, POINT_CLOUD_RENDERER } from "@/lib/three/point-cloud-performance";
import { createSurveyNavigation, NAVIGATION_SETTINGS, type SurveyNavigation, type SurveyView } from "@/lib/three/point-cloud-navigation";
import { ViewerControls } from "./viewer-controls";

type SurveyCloudProps = {
  survey: { id: string | number; recording_clouds: { url: string; bytes: number }[] };
};
const CAMERA = { up: [0, 0, 1] as [number, number, number], position: [1, -1, 1] as [number, number, number] };

class CloudBoundary extends Component<{ children: ReactNode; onError: () => void; fallback?: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? this.props.fallback ?? null : this.props.children; }
}

type PointCloudProps = {
  url: string;
  navigation: { current: SurveyNavigation | null };
  reducedMotion: boolean;
  onReady: () => void;
};

function PointCloud({ url, navigation, reducedMotion, onReady }: PointCloudProps) {
  const source = useLoader(WorkshopPCDLoader, url);
  const points = useMemo(() => createPointCloudPresentation(source), [source]);
  const camera = useThree((state) => state.camera) as PerspectiveCamera;
  const controls = useThree((state) => state.controls) as OrbitControlsImpl | null;
  const invalidate = useThree((state) => state.invalidate);
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  const motion = useRef<ReturnType<typeof createPointCloudMotion> | null>(null);
  const reduceRef = useRef(reducedMotion);
  reduceRef.current = reducedMotion;

  useLayoutEffect(() => {
    const controller = createPointCloudMotion(points, invalidate);
    motion.current = controller;
    controller.moving();
    return () => { motion.current = null; controller.dispose(); };
  }, [points, invalidate]);

  useLayoutEffect(() => {
    if (!controls) return;
    // Use the controls' settling threshold. Tiny floating-point drift must not
    // restart the motion preview every time its full-detail timer draws a frame.
    const changed = () => motion.current?.moving();
    controls.addEventListener("change", changed);
    return () => controls.removeEventListener("change", changed);
  }, [controls, points]);

  useLayoutEffect(() => {
    if (!controls || !points.geometry.boundingBox) return;
    const controller = createSurveyNavigation(camera, controls, points.geometry.boundingBox, invalidate, reduceRef.current);
    navigation.current = controller;
    onReady();
    return () => {
      if (navigation.current === controller) navigation.current = null;
      controller.dispose();
    };
  }, [points, camera, controls, invalidate, navigation, onReady]);

  useEffect(() => { navigation.current?.setReducedMotion(reducedMotion); }, [navigation, reducedMotion]);
  useLayoutEffect(() => { navigation.current?.resize(); }, [navigation, width, height]);
  useFrame((_, delta) => navigation.current?.update(delta), -2);
  return <primitive object={points} dispose={null} />;
}

function WebGLUnavailable({ onUnavailable }: { onUnavailable: () => void }) {
  useEffect(onUnavailable, [onUnavailable]);
  return <div role="status" className="flex h-full items-center justify-center p-6 text-center text-neutral-200">WebGL is not supported. Try a browser with hardware acceleration enabled.</div>;
}

export function ThreeDimensionalModel({ survey }: SurveyCloudProps) {
  const selected3dModel = useSurveyMapStore((state) => state.selected3dModel);
  const show3dAxesHelper = useSurveyMapStore((state) => state.show3dAxesHelper);
  const reducedMotion = Boolean(useReducedMotion());
  // These URLs already passed V2's publication and current-artifact checks.
  // Never rebuild one from a date, client code, or assumed filename.
  const clouds = survey.recording_clouds ?? [];
  const cloud = clouds.find((model) => model.url === selected3dModel) ?? clouds[0];
  const url = cloud?.url ?? "";
  const [attempt, setAttempt] = useState(0);
  const resourceKey = `${url}:${attempt}`;
  const [status, setStatus] = useState({ key: "", phase: "loading" });
  const ready = status.key === resourceKey && status.phase === "ready";
  const failed = status.key === resourceKey && status.phase === "error";
  const unavailable = status.key === resourceKey && status.phase === "unsupported";
  const [activeView, setActiveView] = useState<"3d" | "top" | "custom">("3d");
  const navigation = useRef<SurveyNavigation | null>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const focusAfterRetry = useRef(false);
  const fullscreenButtonFocus = useRef<HTMLElement | null>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenAvailable, setFullscreenAvailable] = useState(false);
  const [fullscreenError, setFullscreenError] = useState("");
  const onReady = useCallback(() => {
    setStatus({ key: resourceKey, phase: "ready" });
    setActiveView("3d");
    if (focusAfterRetry.current) {
      if (document.activeElement === document.body || viewport.current?.contains(document.activeElement)) {
        viewport.current?.focus({ preventScroll: true });
      }
      focusAfterRetry.current = false;
    }
  }, [resourceKey]);
  const onError = useCallback(() => setStatus({ key: resourceKey, phase: "error" }), [resourceKey]);
  const onUnavailable = useCallback(() => setStatus({ key: resourceKey, phase: "unsupported" }), [resourceKey]);
  const onManual = useCallback(() => setActiveView("custom"), []);

  useEffect(() => {
    if (!container) return;
    setFullscreenAvailable(Boolean(document.fullscreenEnabled && container.requestFullscreen));
    const changed = () => {
      const active = document.fullscreenElement === container;
      setFullscreen(active);
      if (!active) fullscreenButtonFocus.current?.focus({ preventScroll: true });
    };
    document.addEventListener("fullscreenchange", changed);
    return () => { document.removeEventListener("fullscreenchange", changed); };
  }, [container]);

  const changeView = (view: SurveyView) => {
    if (!ready) return;
    navigation.current?.view(view);
    if (view !== "fit") setActiveView(view);
  };
  const toggleFullscreen = async () => {
    setFullscreenError("");
    try {
      if (document.fullscreenElement === container) await document.exitFullscreen();
      else if (container) {
        fullscreenButtonFocus.current = document.activeElement as HTMLElement | null;
        await container.requestFullscreen();
      }
    } catch { setFullscreenError("Full screen could not open. You can keep exploring in this view."); }
  };

  if (!cloud) return <div role="status" className="flex min-h-80 flex-1 items-center justify-center rounded-lg bg-neutral-950 p-6 text-center text-neutral-200">No 3D available for this survey.</div>;
  if (cloud.bytes > RECORDING_PCD_MAX_BYTES) {
    return <div role="status" className="flex min-h-80 flex-1 items-center justify-center rounded-lg bg-neutral-950 p-6 text-center text-neutral-200">This point cloud exceeds the supported {RECORDING_PCD_MAX_LABEL} loading limit.</div>;
  }

  return (
    <section ref={setContainer} aria-label={`3D survey ${survey.id}`} className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-x-hidden overflow-y-auto rounded-lg border bg-background text-foreground [&:fullscreen]:h-screen [&:fullscreen]:rounded-none [&:fullscreen]:border-0">
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b px-3 py-2 text-sm">
        <span className="font-medium">{survey.id}</span>
        <span className="text-xs text-muted-foreground">{clouds.length > 1 ? `Point cloud ${clouds.indexOf(cloud) + 1} of ${clouds.length}` : "Point cloud"}</span>
      </div>
      <ViewerControls ready={ready} activeView={activeView} container={container} fullscreen={fullscreen} fullscreenAvailable={fullscreenAvailable}
        onZoom={(closer) => navigation.current?.zoom(closer)} onView={changeView} onFullscreen={toggleFullscreen} />
      <div ref={viewport} tabIndex={0} role="group" aria-label="Interactive 3D model. Arrow keys move, plus and minus zoom, F fits the survey."
        aria-busy={!ready && !failed && !unavailable}
        className="relative min-h-80 min-w-0 flex-1 bg-neutral-950 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        onPointerDownCapture={(event) => { if ((event.target as HTMLElement).tagName === "CANVAS") viewport.current?.focus({ preventScroll: true }); }}
        onKeyDown={(event) => {
          if (!ready || event.ctrlKey || event.metaKey || event.altKey ||
              (event.target !== event.currentTarget && (event.target as HTMLElement).tagName !== "CANVAS")) return;
          const key = event.key.toLowerCase();
          if (["arrowleft", "arrowright", "arrowup", "arrowdown"].includes(key)) {
            navigation.current?.pan(key === "arrowleft" ? -1 : key === "arrowright" ? 1 : 0, key === "arrowdown" ? -1 : key === "arrowup" ? 1 : 0, viewport.current?.clientHeight ?? 320);
            onManual();
          } else if (["+", "=", "-", "−"].includes(key)) navigation.current?.zoom(key === "+" || key === "=");
          else if (key === "f") changeView("fit");
          else return;
          event.preventDefault(); event.stopPropagation();
        }}>
        <CloudBoundary onError={onUnavailable} fallback={<WebGLUnavailable onUnavailable={onUnavailable} />}>
        <Canvas
          frameloop="demand" dpr={1} gl={POINT_CLOUD_RENDERER} camera={CAMERA}
          fallback={<WebGLUnavailable onUnavailable={onUnavailable} />}>
          <CloudBoundary key={resourceKey} onError={onError}>
            <Suspense fallback={null}>
              <PointCloud url={url} navigation={navigation} reducedMotion={reducedMotion} onReady={onReady} />
            </Suspense>
          </CloudBoundary>
          <OrbitControls makeDefault enabled={ready} enableDamping={!reducedMotion} {...NAVIGATION_SETTINGS} onStart={onManual} />
          {show3dAxesHelper && <axesHelper args={[150]} />}
        </Canvas>
        </CloudBoundary>
        {!ready && !failed && !unavailable && <div role="status" className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 bg-neutral-950 text-sm text-neutral-200"><LoaderCircle aria-hidden="true" className="size-4 motion-safe:animate-spin" />Loading 3D model…</div>}
        {failed && <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-neutral-950 p-6 text-center text-neutral-200">
          <AlertCircle aria-hidden="true" className="size-5" />
          <p className="text-sm">Couldn’t load this 3D model. Please try again.</p>
          <p className="text-xs text-neutral-400">Access may have changed. Refresh the survey if retrying does not help.</p>
          <Button type="button" variant="secondary" className="h-11" onClick={() => { focusAfterRetry.current = true; useLoader.clear(WorkshopPCDLoader, url); setAttempt((value) => value + 1); }}>Retry</Button>
        </div>}
      </div>
      {fullscreenError && <p role="alert" className="shrink-0 border-t px-3 py-2 text-sm text-destructive">{fullscreenError}</p>}
    </section>
  );
}
