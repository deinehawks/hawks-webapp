export const PIN_ANIMATION_STYLES = `
  @keyframes dropPin {
    0% { opacity: 0; transform: translateY(-30px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  .pin-drop { animation: dropPin 0.6s ease-out forwards; }
`;
