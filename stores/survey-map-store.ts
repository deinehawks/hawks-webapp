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
    } | null,
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
  hoveredPairId: null,
  selectedVegetationIndex: "ndvi",
  selectedDemType: "dsm",
  selectedDemColor: "viridis",
  selectedDemShading: "normal",
  selected3dModel: "",
  show3dAxesHelper: false,
};

export const createSurveyMapStore = (
  initState: SurveyMapState = defaultInitState,
) => {
  return createStore<SurveyMapStore>()((set) => ({
    ...initState,
    setActiveTab: (activeTab) => set(() => ({ activeTab })),
    setSelectedFoi: (selectedFoi) => set(() => ({ selectedFoi })),
    setPopupInfo: (popupInfo) => set(() => ({ popupInfo })),
    setHoveredPairId: (hoveredPairId) => set(() => ({ hoveredPairId })),
    setSelectedVegetationIndex: (selectedVegetationIndex) =>
      set(() => ({ selectedVegetationIndex })),
    setSelectedDemType: (selectedDemType) => set(() => ({ selectedDemType })),
    setSelectedDemColor: (selectedDemColor) =>
      set(() => ({ selectedDemColor })),
    setSelectedDemShading: (selectedDemShading) =>
      set(() => ({ selectedDemShading })),
    setSelected3dModel: (selected3dModel) => set(() => ({ selected3dModel })),
    setShow3dAxesHelper: (show3dAxesHelper) =>
      set(() => ({ show3dAxesHelper })),
  }));
};
