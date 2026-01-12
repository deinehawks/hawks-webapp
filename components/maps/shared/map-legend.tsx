"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MAP_COLORS } from "@/lib/constants/map-colors";

type MapLegendProps = {
  visible?: boolean; // if false, render nothing
  forcePins?: boolean;
  onToggleForcePins?: () => void;

  // optional labels (defaults match your current UI)
  title?: string;
  healthyLabel?: string;
  healthyDesc?: string;
  unhealthyLabel?: string;
  unhealthyDesc?: string;

  // optional: hide the heatmap block entirely if you ever want
  showHeatmapSection?: boolean;
};

export function MapLegend({
  visible = true,
  forcePins = false,
  onToggleForcePins,
  title = "Map Legend",
  healthyLabel = "Healthy Plants",
  healthyDesc = "Yellow pins • No signs of disease",
  unhealthyLabel = "Infected Plants",
  unhealthyDesc = "Red pins • Disease or pest detected",
  showHeatmapSection = true,
}: MapLegendProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (!visible) return null;

  return (
    <div className="absolute bottom-8 left-8 z-10 flex items-end gap-2">
      <div
        className={`bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen
            ? "opacity-100 translate-x-0 w-80"
            : "opacity-0 -translate-x-4 w-0 pointer-events-none"
        }`}
      >
        <div className="p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <div
              className="w-1 h-4 rounded-full"
              style={{ backgroundColor: MAP_COLORS.boundary }}
            />
            {title}
          </h3>

          <div className="flex flex-col gap-4">
            {/* Healthy */}
            <div className="flex items-start gap-3 group">
              <div
                className="w-8 h-8 rounded-full border-2 border-black shadow-md transition-all duration-200 group-hover:scale-105 group-hover:shadow-lg mt-0.5"
                style={{
                  background: `linear-gradient(135deg, ${MAP_COLORS.healthy.base} 0%, ${MAP_COLORS.healthy.base} 100%)`,
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900">
                  {healthyLabel}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {healthyDesc}
                </div>
              </div>
            </div>

            {/* Unhealthy */}
            <div className="flex items-start gap-3 group">
              <div
                className="w-8 h-8 rounded-full border-2 border-black shadow-md transition-all duration-200 group-hover:scale-105 group-hover:shadow-lg mt-0.5"
                style={{
                  background: `linear-gradient(135deg, ${MAP_COLORS.unhealthy.base} 0%, ${MAP_COLORS.unhealthy.base} 100%)`,
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900">
                  {unhealthyLabel}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {unhealthyDesc}
                </div>
              </div>
            </div>

            {showHeatmapSection && (
              <>
                <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

                <div className="flex flex-col gap-2">
                  <div className="text-xs font-semibold text-gray-900 uppercase tracking-wide">
                    Heatmap View
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-1 gap-0.5 rounded overflow-hidden shadow-sm">
                        {[
                          `rgba(${MAP_COLORS.healthy.heatmap}, 0.15)`,
                          `rgba(${MAP_COLORS.healthy.heatmap}, 0.3)`,
                          `rgba(${MAP_COLORS.healthy.heatmap}, 0.45)`,
                          `rgba(${MAP_COLORS.healthy.heatmap}, 0.6)`,
                          `rgba(${MAP_COLORS.healthy.heatmap}, 0.75)`,
                        ].map((c, i) => (
                          <div
                            key={i}
                            className="h-6 flex-1" // <-- fills available width evenly
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>

                      <span className="text-xs text-gray-600 whitespace-nowrap">
                        Plant Density
                      </span>
                    </div>

                    <div className="flex justify-between text-[10px] text-gray-400 px-0.5">
                      <span>Low</span>
                      <span>High</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Optional toggle */}
          {onToggleForcePins && (
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
              <div className="text-xs text-gray-600">
                Heatmap mode
                <div className="text-[10px] text-gray-400">
                  Auto switches when dense
                </div>
              </div>

              <button
                onClick={onToggleForcePins}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                  forcePins
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-900 border-gray-200 hover:bg-gray-50"
                }`}
                title={
                  forcePins
                    ? "Pins always visible (heatmap off)"
                    : "Auto heatmap when dense"
                }
              >
                {forcePins ? "Always show pins" : "Auto"}
              </button>
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <svg
                className="w-3.5 h-3.5"
                style={{ color: MAP_COLORS.boundary }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>Hover or click plants to see detection area</span>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="shrink-0 p-3 bg-white rounded-lg shadow-lg border border-gray-200 hover:bg-gray-50 hover:shadow-xl hover:border-gray-300 transition-all duration-200 group"
        title={isOpen ? "Hide legend" : "Show legend"}
        aria-label={isOpen ? "Hide legend" : "Show legend"}
      >
        {isOpen ? (
          <ChevronLeft className="w-5 h-5 text-gray-700 transition-transform duration-200 group-hover:-translate-x-0.5" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-700 transition-transform duration-200 group-hover:translate-x-0.5" />
        )}
      </button>
    </div>
  );
}
