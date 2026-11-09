"use client";

import type { ReactNode } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { ArrowDownToLine, Box, Expand, HelpCircle, Minimize, Scan, ZoomIn, ZoomOut } from "lucide-react";
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

function ControlTip({ label, container, children }: { label: string; container: HTMLElement | null; children: ReactNode }) {
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
  return (
    <div role="group" aria-label="3D navigation" className="flex min-w-0 shrink-0 flex-wrap items-center gap-2 border-b bg-background p-3 text-foreground">
      <div className="flex gap-1" role="group" aria-label="Zoom">
        <ControlTip label="Zoom in (+)" container={container}>
          <Button type="button" variant="outline" size="icon" className="size-11" aria-label="Zoom in" disabled={!ready} onClick={() => onZoom(true)}><ZoomIn aria-hidden="true" className="size-4" /></Button>
        </ControlTip>
        <ControlTip label="Zoom out (−)" container={container}>
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
          {/* Keep the portal inside the fullscreen element, including its focus scope. */}
          <PopoverPrimitive.Portal container={container}>
            <PopoverPrimitive.Content aria-label="3D navigation controls" align="end" sideOffset={8} className="z-50 max-h-[min(28rem,80vh)] w-80 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-lg border bg-popover p-4 text-sm text-popover-foreground shadow-md focus:outline-none">
              <h3 className="font-semibold">Explore the survey</h3>
              <dl className="mt-3 space-y-2">
                <div><dt className="font-medium">Rotate</dt><dd className="text-muted-foreground">Left-click and drag.</dd></div>
                <div><dt className="font-medium">Move</dt><dd className="text-muted-foreground">Right-click and drag, or hold Shift while click-dragging.</dd></div>
                <div><dt className="font-medium">Zoom</dt><dd className="text-muted-foreground">Scroll the mouse wheel or trackpad, or use the zoom buttons.</dd></div>
                <div><dt className="font-medium">Keyboard</dt><dd className="text-muted-foreground">Click or Tab into the model. Arrow keys move, + / − zoom, and F fits the survey.</dd></div>
                <div><dt className="font-medium">Touch</dt><dd className="text-muted-foreground">Drag with one finger to rotate. Use two fingers to move or pinch to zoom.</dd></div>
              </dl>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">Lost the survey? Choose Fit survey to bring it back. Escape exits full screen or closes this guide.</p>
              <div className="mt-3 border-t pt-3"><ThreeDimensionalAxesHelperSwitch /></div>
            </PopoverPrimitive.Content>
          </PopoverPrimitive.Portal>
        </Popover>
      </div>
    </div>
  );
}
