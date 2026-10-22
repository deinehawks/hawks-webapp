"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Popup, useMap } from "@vis.gl/react-maplibre";
import type { Popup as MapLibrePopup } from "maplibre-gl";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SurveyPopupShell({
  longitude, latitude, title, description, icon, children, footer, onClose,
  width = 320, contentClassName = "px-4 pb-4", closeLabel = "Close survey popup",
}: {
  longitude: number;
  latitude: number;
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  width?: number;
  contentClassName?: string;
  closeLabel?: string;
}) {
  const { current: map } = useMap();
  const titleId = useId();
  const descriptionId = useId();
  const content = useRef<HTMLDivElement>(null);
  const popup = useRef<MapLibrePopup>(null);
  const [size, setSize] = useState({ width, height: 360, centered: false, offsetX: 0, offsetY: 0 });

  useEffect(() => {
    const container = map?.getContainer();
    if (!map || !container) return;
    const update = () => {
      const rect = container.getBoundingClientRect();
      const point = map.project([longitude, latitude]);
      const top = Math.max(0, -rect.top), bottom = Math.min(container.clientHeight, window.innerHeight - rect.top);
      const popupWidth = Math.max(120, Math.min(width, container.clientWidth - 32, window.innerWidth - 32));
      const verticalSpace = Math.max(point.y - top, bottom - point.y) - 28;
      // Short maps cannot fit the header, scroll area and action above/below
      // the click. Center the card in the visible map rather than clip it.
      const centered = verticalSpace < 200;
      const height = Math.max(120, Math.min(360, centered ? bottom - top - 34 : verticalSpace));
      const offsetX = centered ? container.clientWidth / 2 - point.x : 0;
      const offsetY = centered ? (top + bottom) / 2 - point.y : 0;
      setSize(previous => previous.width === popupWidth && previous.height === height && previous.centered === centered &&
        previous.offsetX === offsetX && previous.offsetY === offsetY ? previous : { width: popupWidth, height, centered, offsetX, offsetY });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    map.on("move", update);
    window.addEventListener("resize", update);
    return () => { observer.disconnect(); map.off("move", update); window.removeEventListener("resize", update); };
  }, [map, width, longitude, latitude]);

  useEffect(() => {
    if (!content.current) return;
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      // MapLibre does not reposition automatically when React content grows.
      frame = requestAnimationFrame(() => popup.current?.setLngLat([longitude, latitude]));
    });
    observer.observe(content.current);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [longitude, latitude]);

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
    <Popup ref={popup} longitude={longitude} latitude={latitude}
      anchor={size.centered ? "center" : undefined} offset={size.centered ? [size.offsetX, size.offsetY] : 12}
      className="survey-map-popup" closeButton={false} focusAfterOpen={false}
      closeOnClick={false} closeOnMove={false} maxWidth={String(size.width) + "px"}
      style={{ width: size.width }} onClose={onClose}>
      <div ref={content} role="dialog" aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined} tabIndex={-1}
        className="flex min-h-0 flex-col outline-none" style={{ maxHeight: size.height }}
        onClick={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onTouchStart={(event) => event.stopPropagation()}
        onWheel={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === "Escape") { event.preventDefault(); onClose(); }
        }}>
        <div className="flex shrink-0 items-start gap-3 px-4 pb-3 pt-4">
          {icon && <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted/40 text-muted-foreground [&_svg]:size-4">{icon}</span>}
          <div className="min-w-0 flex-1">
            <h3 id={titleId} className="break-words text-base font-semibold leading-6 tracking-tight">{title}</h3>
            {description && <div id={descriptionId} className="mt-0.5 text-xs leading-5 text-muted-foreground">{description}</div>}
          </div>
          <Button type="button" variant="ghost" size="icon" aria-label={closeLabel}
            className="-mr-2 -mt-2 size-11 shrink-0 rounded-lg text-muted-foreground hover:text-foreground sm:-mr-1 sm:-mt-1 sm:size-8" onClick={onClose}>
            <X aria-hidden="true" className="size-4" />
          </Button>
        </div>
        <div className={`min-h-0 overflow-y-auto overscroll-contain ${contentClassName}`}>{children}</div>
        {footer && <div className="shrink-0 border-t bg-muted/20 px-4 py-3">{footer}</div>}
      </div>
    </Popup>
  );
}
