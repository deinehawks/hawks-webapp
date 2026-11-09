"use client";

import type { ReactNode } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { ArrowDownToLine, Box, Expand, HelpCircle, Minimize, Scan, X, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { ThreeDimensionalAxesHelperSwitch } from "@/components/selectors/3d-model-selector";
import type { SurveyView } from "@/lib/three/point-cloud-navigation";

type ViewerControlsProps = {
  ready: boolean;
  activeView: "3d" | "top" | "custom";
  container: HTMLElement | null;
  fullscreen: boolean;
  fullscreenAvailable: boolean;
  onZoom: (closer: boolean) => void;
  onView: (view: SurveyView) => void;
  onFullscreen: () => void;
};

function ControlTip({ label, container, children }: { label: string; container?: HTMLElement | null; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipPrimitive.Portal container={container}>
        <TooltipPrimitive.Content sideOffset={6} className="z-50 rounded-md border bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md">
          {label}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </Tooltip>
  );
}

export function ViewerControls({ ready, activeView, container, fullscreen, fullscreenAvailable, onZoom, onView, onFullscreen }: ViewerControlsProps) {
  // Query containers in the page create a containing block for fixed popups.
  // Escape those ancestors normally; only fullscreen needs an in-viewer portal.
  const portalContainer = fullscreen ? container : undefined;
  return (
    <div role="group" aria-label="3D navigation" className="flex min-w-0 shrink-0 flex-wrap items-center gap-2 border-b bg-background p-3 text-foreground">
      <div className="flex gap-1" role="group" aria-label="Zoom">
        <ControlTip label="Zoom in (+)" container={portalContainer}>
          <Button type="button" variant="outline" size="icon" className="size-11" aria-label="Zoom in" disabled={!ready} onClick={() => onZoom(true)}><ZoomIn aria-hidden="true" className="size-4" /></Button>
        </ControlTip>
        <ControlTip label="Zoom out (−)" container={portalContainer}>
          <Button type="button" variant="outline" size="icon" className="size-11" aria-label="Zoom out" disabled={!ready} onClick={() => onZoom(false)}><ZoomOut aria-hidden="true" className="size-4" /></Button>
        </ControlTip>
      </div>
      <Button type="button" variant="outline" className="h-11" disabled={!ready} onClick={() => onView("fit")}><Scan aria-hidden="true" className="size-4" />Fit survey</Button>
      <div className="flex gap-1" role="group" aria-label="Preset views">
        <Button type="button" variant={activeView === "top" ? "secondary" : "outline"} className="h-11" aria-pressed={activeView === "top"} disabled={!ready} onClick={() => onView("top")}><ArrowDownToLine aria-hidden="true" className="size-4" />Top view</Button>
        <Button type="button" variant={activeView === "3d" ? "secondary" : "outline"} className="h-11" aria-pressed={activeView === "3d"} disabled={!ready} onClick={() => onView("3d")}><Box aria-hidden="true" className="size-4" />3D view</Button>
      </div>
      <div className="ml-auto flex flex-wrap gap-2">
        {fullscreenAvailable && <Button type="button" variant="outline" className="h-11" aria-pressed={fullscreen} onClick={onFullscreen}>
          {fullscreen ? <Minimize aria-hidden="true" className="size-4" /> : <Expand aria-hidden="true" className="size-4" />}{fullscreen ? "Exit full screen" : "Full screen"}
        </Button>}
        <Popover>
          <PopoverTrigger asChild><Button type="button" variant="outline" className="h-11"><HelpCircle aria-hidden="true" className="size-4" />Controls</Button></PopoverTrigger>
          <PopoverPrimitive.Portal container={portalContainer}>
            <PopoverPrimitive.Content aria-label="3D navigation controls" side="bottom" align="end" sideOffset={8} collisionPadding={16}
              className="z-50 flex max-h-[min(24rem,var(--radix-popover-content-available-height,80dvh))] w-72 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-md focus:outline-none">
              <div className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2">
                <h3 className="text-sm font-semibold">Navigation controls</h3>
                <PopoverPrimitive.Close asChild>
                  <Button type="button" variant="ghost" size="icon" className="size-8" aria-label="Close controls"><X aria-hidden="true" className="size-4" /></Button>
                </PopoverPrimitive.Close>
              </div>
              <div className="min-h-0 overflow-y-auto overscroll-contain p-3 text-xs leading-5">
                <dl className="grid grid-cols-[4rem_1fr] gap-x-3 gap-y-2">
                  <dt className="font-medium">Rotate</dt><dd className="text-muted-foreground">Left-click and drag.</dd>
                  <dt className="font-medium">Move</dt><dd className="text-muted-foreground">Right-click and drag, or Shift + left-drag.</dd>
                  <dt className="font-medium">Zoom</dt><dd className="text-muted-foreground">Scroll or use the + / − buttons.</dd>
                  <dt className="font-medium">Keyboard</dt><dd className="text-muted-foreground">Click the model. Arrows move, + / − zoom, F fits.</dd>
                  <dt className="font-medium">Touch</dt><dd className="text-muted-foreground">One finger rotates; two move or pinch to zoom.</dd>
                </dl>
                <p className="mt-3 text-muted-foreground">Lost the model? Choose <span className="font-medium text-foreground">Fit survey</span>. Esc closes this guide.</p>
              </div>
              <div className="shrink-0 border-t px-3"><ThreeDimensionalAxesHelperSwitch /></div>
            </PopoverPrimitive.Content>
          </PopoverPrimitive.Portal>
        </Popover>
      </div>
    </div>
  );
}
