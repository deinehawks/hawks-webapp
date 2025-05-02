import { createStore } from "zustand/vanilla";

export type OrthoMapState = {
  flightYear: string;
  selectedFoi: string;
  currentLoadingSource: string;
  areAllSourcesLoaded: boolean;
};

export type OrthoMapActions = {
  setFlightYear: (flightYear: string) => void;
  setSelectedFoi: (selectedFoi: string) => void;
  setCurrentLoadingSource: (currentLoadingSource: string) => void;
  setAreAllSourcesLoaded: (areAllSourcesLoaded: boolean) => void;
};

export type OrthoMapStore = OrthoMapState & OrthoMapActions;

export const initOrthoMapStore = (): OrthoMapState => {
  return {
    flightYear: "",
    selectedFoi: "",
    currentLoadingSource: "",
    areAllSourcesLoaded: false,
  };
};

export const defaultInitState: OrthoMapState = {
  flightYear: "2025",
  selectedFoi: "none",
  currentLoadingSource: "",
  areAllSourcesLoaded: false,
};

export const createOrthoMapStore = (
  initState: OrthoMapState = defaultInitState
) => {
  return createStore<OrthoMapStore>()((set) => ({
    ...initState,
    setFlightYear: (flightYear: string) => set(() => ({ flightYear })),
    setSelectedFoi: (selectedFoi: string) => set(() => ({ selectedFoi })),
    setCurrentLoadingSource: (currentLoadingSource: string) =>
      set(() => ({ currentLoadingSource })),
    setAreAllSourcesLoaded: (areAllSourcesLoaded: boolean) =>
      set(() => ({ areAllSourcesLoaded })),
  }));
};
