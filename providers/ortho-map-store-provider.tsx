"use client";

import { createContext, useContext, useRef } from "react";
import { useStore } from "zustand";
import {
  type OrthoMapStore,
  createOrthoMapStore,
  initOrthoMapStore,
} from "@/stores/ortho-map-store";

export type OrthoMapStoreApi = ReturnType<typeof createOrthoMapStore>;

export const OrthoMapStoreContext = createContext<OrthoMapStoreApi | undefined>(
  undefined
);

export interface OrthoMapStoreProviderProps {
  children: React.ReactNode;
}

export const OrthoMapStoreProvider = ({
  children,
}: OrthoMapStoreProviderProps) => {
  const storeRef = useRef<OrthoMapStoreApi | null>(null);
  if (storeRef.current === null) {
    storeRef.current = createOrthoMapStore(initOrthoMapStore());
  }

  return (
    <OrthoMapStoreContext.Provider value={storeRef.current}>
      {children}
    </OrthoMapStoreContext.Provider>
  );
};

export const useOrthoMapStore = <T,>(
  selector: (store: OrthoMapStore) => T
): T => {
  const orthoMapStoreContext = useContext(OrthoMapStoreContext);

  if (!orthoMapStoreContext) {
    throw new Error(
      "useOrthoMapStore must be used within a OrthoMapStoreProvider"
    );
  }
  return useStore(orthoMapStoreContext, selector);
};
