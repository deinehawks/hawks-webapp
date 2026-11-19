"use client";

export function HeatmapModeHint({
  visible,
  message = "Heatmap view: zoom in for pins",
}: {
  visible: boolean;
  message?: string;
}) {
  if (!visible) return null;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
      <div className="bg-white/95 backdrop-blur border border-gray-200 text-gray-900 px-4 py-2 rounded-lg shadow-lg text-sm flex items-center gap-2">
        <svg
          className="w-4 h-4 text-gray-700 flex-shrink-0"
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
        <span>{message}</span>
      </div>
    </div>
  );
}
