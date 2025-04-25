import { createStore } from "zustand/vanilla";

export type OrthoMapState = {
  flightYear: string;
  selectedFoi: string;
};

export type OrthoMapActions = {
  setFlightYear: (flightYear: string) => void;
  setSelectedFoi: (selectedFoi: string) => void;
};

export type OrthoMapStore = OrthoMapState & OrthoMapActions;

export const initOrthoMapStore = (): OrthoMapState => {
  return {
    flightYear: "",
    selectedFoi: "",
  };
};

export const defaultInitState: OrthoMapState = {
  flightYear: "2025",
  selectedFoi: "none",
};

export const createOrthoMapStore = (
  initState: OrthoMapState = defaultInitState
) => {
  return createStore<OrthoMapStore>()((set) => ({
    ...initState,
    setFlightYear: (flightYear: string) => set(() => ({ flightYear })),
    setSelectedFoi: (selectedFoi: string) => set(() => ({ selectedFoi })),
  }));
};
