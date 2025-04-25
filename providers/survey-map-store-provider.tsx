"use client";

import { createContext, useContext, useRef } from "react";
import { useStore } from "zustand";
import {
  type SurveyMapStore,
  createSurveyMapStore,
  initSurveyMapStore,
} from "@/stores/survey-map-store";

export type SurveyMapStoreApi = ReturnType<typeof createSurveyMapStore>;

export const SurveyMapStoreContext = createContext<
  SurveyMapStoreApi | undefined
>(undefined);

export interface SurveyMapStoreProviderProps {
  children: React.ReactNode;
}

export const SurveyMapStoreProvider = ({
  children,
}: SurveyMapStoreProviderProps) => {
  const storeRef = useRef<SurveyMapStoreApi | null>(null);
  if (storeRef.current === null) {
    storeRef.current = createSurveyMapStore(initSurveyMapStore());
  }

  return (
    <SurveyMapStoreContext.Provider value={storeRef.current}>
      {children}
    </SurveyMapStoreContext.Provider>
  );
};

export const useSurveyMapStore = <T,>(
  selector: (store: SurveyMapStore) => T
): T => {
  const surveyMapStoreContext = useContext(SurveyMapStoreContext);

  if (!surveyMapStoreContext) {
    throw new Error(
      "useSurveyMapStore must be used within a SurveyMapStoreProvider"
    );
  }
  return useStore(surveyMapStoreContext, selector);
};
