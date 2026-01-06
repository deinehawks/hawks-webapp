import { createStore } from "zustand/vanilla";

export type OrthoMapState = {
  flightYear: string;
  selectedFoi: string;
  currentLoadingSource: string;
  areAllSourcesLoaded: boolean;
  popupInfo: unknown;
  hoveredPairId: string | null;
  plantPopupInfo: {
    pairId: string;
    areaId: string;
    centerLng: number;
    centerLat: number;
  } | null;
};

export type OrthoMapActions = {
  setFlightYear: (flightYear: string) => void;
  setSelectedFoi: (selectedFoi: string) => void;
  setCurrentLoadingSource: (currentLoadingSource: string) => void;
  setAreAllSourcesLoaded: (areAllSourcesLoaded: boolean) => void;
  setPopupInfo: (popupInfo: unknown) => void;
  setHoveredPairId: (hoveredPairId: string | null) => void;
  setPlantPopupInfo: (plantPopupInfo: OrthoMapState["plantPopupInfo"]) => void;
};

export type OrthoMapStore = OrthoMapState & OrthoMapActions;

export const initOrthoMapStore = (): OrthoMapState => {
  return {
    flightYear: "",
    selectedFoi: "",
    currentLoadingSource: "",
    areAllSourcesLoaded: false,
    popupInfo: null,
    hoveredPairId: null,
    plantPopupInfo: null,
  };
};

export const defaultInitState: OrthoMapState = {
  flightYear: "2025",
  selectedFoi: "none",
  currentLoadingSource: "",
  areAllSourcesLoaded: false,
  popupInfo: null,
  hoveredPairId: null,
  plantPopupInfo: null,
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
    setPopupInfo: (popupInfo: unknown) => set(() => ({ popupInfo })),
    // Add new setters:
    setHoveredPairId: (hoveredPairId: string | null) =>
      set(() => ({ hoveredPairId })),
    setPlantPopupInfo: (plantPopupInfo: OrthoMapState["plantPopupInfo"]) =>
      set(() => ({ plantPopupInfo })),
  }));
};
