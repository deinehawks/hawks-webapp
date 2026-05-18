"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import { MAP_COLORS } from "@/lib/constants/map-colors";
import { AnimatePresence, motion, LayoutGroup } from "framer-motion";
import { useSurveyModeStore } from "@/stores/survey-mode-store";

type MapLegendProps = {
  visible?: boolean;
  forcePins?: boolean;
  onToggleForcePins?: () => void;
  title?: string;
  healthyLabel?: string;
  healthyDesc?: string;
  unhealthyLabel?: string;
  unhealthyDesc?: string;
  showHeatmapSection?: boolean;
};

export default function MapLegend({
  visible = true,
  forcePins = false,
  onToggleForcePins,
  title = "Map Legend",
  healthyLabel = "Healthy Plants",
  healthyDesc = "No signs of disease",
  unhealthyLabel = "Infected Plants",
  unhealthyDesc = "Disease or pest detected",
  showHeatmapSection = true,
}: MapLegendProps) {
  const [isOpen, setIsOpen] = useState(true);
  const { surveyMode } = useSurveyModeStore();

  if (!visible) return null;
  if (surveyMode === "inventory") return null;

  return (
    <div className="absolute bottom-8 left-8 z-10 flex items-end gap-3">
      <LayoutGroup>
        <AnimatePresence initial={false} mode="popLayout">
          {isOpen && (
            <motion.div
              key="legend"
              layout
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 28,
                mass: 0.9,
              }}
              className="origin-left overflow-hidden"
            >
              <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-neutral-200/60 shadow-lg  w-65 sm:w-70 md:w-75">
                <div className="p-4">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-4 rounded-full bg-neutral-900" />
                    <h3 className="text-sm font-semibold text-neutral-900 tracking-tight">
                      {title}
                    </h3>
                  </div>

                  {/* Legend Items */}
                  <div className="space-y-3">
                    {/* Healthy */}
                    <div className="flex items-start gap-3 group">
                      <div
                        className="w-6 h-6 rounded-full border-2 border-neutral-900/80 shadow-sm transition-transform duration-200 group-hover:scale-110 mt-0.5 shrink-0"
                        style={{ backgroundColor: MAP_COLORS.healthy.base }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-neutral-900 leading-tight">
                          {healthyLabel}
                        </div>
                        <div className="text-xs text-neutral-500 mt-0.5 leading-snug">
                          {healthyDesc}
                        </div>
                      </div>
                    </div>

                    {/* Unhealthy */}
                    <div className="flex items-start gap-3 group">
                      <div
                        className="w-6 h-6 rounded-full border-2 border-neutral-900/80 shadow-sm transition-transform duration-200 group-hover:scale-110 mt-0.5 shrink-0"
                        style={{ backgroundColor: MAP_COLORS.unhealthy.base }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-neutral-900 leading-tight">
                          {unhealthyLabel}
                        </div>
                        <div className="text-xs text-neutral-500 mt-0.5 leading-snug">
                          {unhealthyDesc}
                        </div>
                      </div>
                    </div>

                    {showHeatmapSection && (
                      <>
                        <div className="h-px bg-linear-to-r from-transparent via-neutral-200 to-transparent my-3" />

                        <div className="space-y-2.5">
                          <div className="text-[10px] font-semibold text-neutral-700 uppercase tracking-wider">
                            Heatmap View
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="flex flex-1 gap-px rounded-md overflow-hidden shadow-sm border border-neutral-200/50">
                                {[0.15, 0.3, 0.45, 0.6, 0.75].map(
                                  (opacity, i) => (
                                    <div
                                      key={i}
                                      className="h-4 flex-1"
                                      style={{
                                        backgroundColor: `rgba(${MAP_COLORS.healthy.heatmap}, ${opacity})`,
                                      }}
                                    />
                                  ),
                                )}
                              </div>
                              <span className="text-xs text-neutral-600 whitespace-nowrap font-medium">
                                Density
                              </span>
                            </div>

                            <div className="flex justify-between text-[10px] text-neutral-400 px-1">
                              <span>Low</span>
                              <span>High</span>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Toggle Control */}
                  {onToggleForcePins && (
                    <div className="mt-4 pt-3 border-t border-neutral-100">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1">
                          <div className="text-xs font-medium text-neutral-700">
                            Display Mode
                          </div>
                          <div className="text-[10px] text-neutral-500 mt-0.5">
                            Auto-switches when dense
                          </div>
                        </div>

                        <button
                          onClick={onToggleForcePins}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                            forcePins
                              ? "bg-neutral-900 text-white shadow-sm"
                              : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                          }`}
                        >
                          {forcePins ? "Pins" : "Auto"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="mt-4 pt-3 border-t border-neutral-100">
                    <div className="flex items-start gap-2 text-xs text-neutral-500">
                      <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-neutral-900" />
                      <span className="leading-relaxed">
                        Hover or click plants to see detection area
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </LayoutGroup>

      {/* Toggle Button */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => setIsOpen((v) => !v)}
        className="shrink-0 p-3 bg-white/95 backdrop-blur-sm rounded-xl border border-neutral-200/60 hover:bg-neutral-50 hover:border-neutral-300 transition-all duration-200 shadow-lg group"
        aria-label={isOpen ? "Hide legend" : "Show legend"}
      >
        {isOpen ? (
          <ChevronLeft className="w-5 h-5 text-neutral-700 transition-transform duration-200 group-hover:-translate-x-0.5" />
        ) : (
          <ChevronRight className="w-5 h-5 text-neutral-700 transition-transform duration-200 group-hover:translate-x-0.5" />
        )}
      </motion.button>
    </div>
  );
}
