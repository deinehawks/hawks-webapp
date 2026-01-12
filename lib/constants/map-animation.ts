/* export const PIN_ANIMATION_STYLES = `
  @keyframes dropPin {
    0% { opacity: 0; transform: translateY(-30px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  .pin-drop { animation: dropPin 0.6s ease-out forwards; }
`;*/

export const PIN_ANIMATION_STYLES = `
  @keyframes pin-pulse {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.1);
    }
  }

  .maplibregl-canvas-container.maplibregl-interactive {
    cursor: inherit;
  }
  
  .maplibregl-canvas-container.maplibregl-interactive:active {
    cursor: inherit;
  }
`;
