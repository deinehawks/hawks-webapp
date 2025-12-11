import { createStore } from "zustand/vanilla";

export type SurveyMapState = {
  activeTab: string;
  selectedFoi: string;
  popupInfo: {
    pairId: string;
    areaId: string;
    centerLng: number;
    centerLat: number;
  } | null;
  hoveredPairId: string | null;
  selectedVegetationIndex: string;
  selectedDemType: string;
  selectedDemColor: string;
  selectedDemShading: string;
  selected3dModel: string;
  show3dAxesHelper: boolean;
};

export type SurveyMapActions = {
  setActiveTab: (activeTab: string) => void;
  setSelectedFoi: (selectedFoi: string) => void;
  setPopupInfo: (
    popupInfo: {
      pairId: string;
      areaId: string;
      centerLng: number;
      centerLat: number;
    } | null
  ) => void;
  setHoveredPairId: (hoveredPairId: string | null) => void;
  setSelectedVegetationIndex: (selectedVegetationIndex: string) => void;
  setSelectedDemType: (selectedDemType: string) => void;
  setSelectedDemColor: (selectedDemColor: string) => void;
  setSelectedDemShading: (selectedDemShading: string) => void;
  setSelected3dModel: (selected3dModel: string) => void;
  setShow3dAxesHelper: (show3dAxesHelper: boolean) => void;
};

export type SurveyMapStore = SurveyMapState & SurveyMapActions;

export const initSurveyMapStore = (): SurveyMapState => {
  return {
    activeTab: "",
    selectedFoi: "",
    popupInfo: null,
    hoveredPairId: null,
    selectedVegetationIndex: "",
    selectedDemType: "",
    selectedDemColor: "",
    selectedDemShading: "",
    selected3dModel: "",
    show3dAxesHelper: false,
  };
};

export const defaultInitState: SurveyMapState = {
  activeTab: "ortho",
  selectedFoi: "none",
  popupInfo: null,
  hoveredPairId: null, // ADD THIS LINE
  selectedVegetationIndex: "ndvi",
  selectedDemType: "dsm",
  selectedDemColor: "viridis",
  selectedDemShading: "normal",
  selected3dModel: "pcd",
  show3dAxesHelper: false,
};

export const createSurveyMapStore = (
  initState: SurveyMapState = defaultInitState
) => {
  return createStore<SurveyMapStore>()((set) => ({
    ...initState,
    setActiveTab: (activeTab: string) => set(() => ({ activeTab })),
    setSelectedFoi: (selectedFoi: string) => set(() => ({ selectedFoi })),
    setPopupInfo: (
      popupInfo: {
        pairId: string;
        areaId: string;
        centerLng: number;
        centerLat: number;
      } | null
    ) => set(() => ({ popupInfo })),
    setHoveredPairId: (hoveredPairId: string | null) =>
      set(() => ({ hoveredPairId })),
    setSelectedVegetationIndex: (selectedVegetationIndex: string) =>
      set(() => ({ selectedVegetationIndex })),
    setSelectedDemType: (selectedDemType: string) =>
      set(() => ({ selectedDemType })),
    setSelectedDemColor: (selectedDemColor: string) =>
      set(() => ({ selectedDemColor })),
    setSelectedDemShading: (selectedDemShading: string) =>
      set(() => ({ selectedDemShading })),
    setSelected3dModel: (selected3dModel: string) =>
      set(() => ({ selected3dModel })),
    setShow3dAxesHelper: (show3dAxesHelper: boolean) =>
      set(() => ({ show3dAxesHelper })),
  }));
};
