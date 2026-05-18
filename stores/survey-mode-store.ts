import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SurveyMode = "analysis" | "inventory";

type SurveyModeStore = {
  surveyMode: SurveyMode;
  setSurveyMode: (mode: SurveyMode) => void;
};

export const useSurveyModeStore = create<SurveyModeStore>()(
  persist(
    (set) => ({
      surveyMode: "analysis",
      setSurveyMode: (surveyMode) => set({ surveyMode }),
    }),
    { name: "survey-mode" }, // persists to localStorage so it survives page navigation
  ),
);
