"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Popup, useMap } from "@vis.gl/react-maplibre";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SurveyPopupShell({
  longitude, latitude, title, description, children, footer, onClose,
}: {
  longitude: number;
  latitude: number;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
}) {
  const { current: map } = useMap();
  const titleId = useId();
  const descriptionId = useId();
  const content = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 320, height: 360 });

  useEffect(() => {
    const container = map?.getContainer();
    if (!container) return;
    const update = () => {
      const width = Math.max(120, Math.min(320, container.clientWidth - 32, window.innerWidth - 32));
      const height = Math.max(120, Math.min(360, container.clientHeight - 34, window.innerHeight - 66));
      setSize((previous) => previous.width === width && previous.height === height ? previous : { width, height });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    window.addEventListener("resize", update);
    return () => { observer.disconnect(); window.removeEventListener("resize", update); };
  }, [map]);

  useEffect(() => {
    const element = content.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = requestAnimationFrame(() => element?.focus({ preventScroll: true }));
    return () => {
      cancelAnimationFrame(frame);
      // Leave focus alone when the user has deliberately moved elsewhere.
      const shouldRestore = document.activeElement === document.body || Boolean(element?.contains(document.activeElement));
      if (shouldRestore) {
        const target = previous?.isConnected && previous !== document.body ? previous : map?.getCanvas();
        if (target?.isConnected) target.focus({ preventScroll: true });
      }
    };
  }, [map]);

  return (
    <Popup longitude={longitude} latitude={latitude} offset={12}
      className="survey-map-popup" closeButton={false} focusAfterOpen={false}
      closeOnClick={false} closeOnMove={false} maxWidth={String(size.width) + "px"} onClose={onClose}>
      <div ref={content} role="dialog" aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined} tabIndex={-1}
        className="flex min-h-0 flex-col outline-none" style={{ maxHeight: size.height }}
        onClick={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === "Escape") { event.preventDefault(); onClose(); }
        }}>
        <div className="flex shrink-0 items-start justify-between gap-3 px-4 pb-2 pt-4">
          <div className="min-w-0">
            <h3 id={titleId} className="break-words text-sm font-semibold leading-5">{title}</h3>
            {description && <div id={descriptionId} className="mt-0.5 text-xs leading-5 text-muted-foreground">{description}</div>}
          </div>
          <Button type="button" variant="ghost" size="icon" aria-label="Close survey popup"
            className="-mr-2 -mt-2 size-11 shrink-0 text-muted-foreground sm:size-8" onClick={onClose}>
            <X aria-hidden="true" className="size-4" />
          </Button>
        </div>
        <div className="min-h-0 overflow-y-auto overscroll-contain px-2 pb-2">{children}</div>
        {footer && <div className="shrink-0 border-t px-4 py-3">{footer}</div>}
      </div>
    </Popup>
  );
}
