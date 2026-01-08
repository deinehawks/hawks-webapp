export const PIN_IMAGES = {
  yellow: `<svg width="40" height="56" viewBox="0 0 40 56" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="shadow-yellow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="4"/>
        <feOffset dx="0" dy="4" result="offsetblur"/>
        <feFlood flood-color="#000000" flood-opacity="0.6"/>
        <feComposite in2="offsetblur" operator="in"/>
        <feMerge>
          <feMergeNode/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <!-- Black outline shadow -->
    <path d="M20 4C11.72 4 6 11.16 6 18c0 9.5 14 32 14 32s14-22.5 14-32c0-6.84-5.72-14-14-14z" fill="#000" opacity="0.4"/>
    <!-- Thick black border for visibility -->
    <path d="M20 3C11.72 3 5 9.72 5 18c0 9.5 15 33 15 33s15-23.5 15-33c0-8.28-6.72-15-15-15z" fill="#fbbf24" stroke="#000" stroke-width="4" filter="url(#shadow-yellow)"/>
    <!-- White inner border -->
    <path d="M20 3C11.72 3 5 9.72 5 18c0 9.5 15 33 15 33s15-23.5 15-33c0-8.28-6.72-15-15-15z" fill="none" stroke="#fff" stroke-width="2.5"/>
    <!-- Center dot - larger and high contrast -->
    <circle cx="20" cy="18" r="6" fill="#fff" stroke="#000" stroke-width="2"/>
    <circle cx="20" cy="18" r="3.5" fill="#fbbf24"/>
  </svg>`,

  red: `<svg width="40" height="56" viewBox="0 0 40 56" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="shadow-red" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="4"/>
        <feOffset dx="0" dy="4" result="offsetblur"/>
        <feFlood flood-color="#000000" flood-opacity="0.6"/>
        <feComposite in2="offsetblur" operator="in"/>
        <feMerge>
          <feMergeNode/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <!-- Black outline shadow -->
    <path d="M20 4C11.72 4 6 11.16 6 18c0 9.5 14 32 14 32s14-22.5 14-32c0-6.84-5.72-14-14-14z" fill="#000" opacity="0.4"/>
    <!-- Thick black border for visibility -->
    <path d="M20 3C11.72 3 5 9.72 5 18c0 9.5 15 33 15 33s15-23.5 15-33c0-8.28-6.72-15-15-15z" fill="#dc2626" stroke="#000" stroke-width="4" filter="url(#shadow-red)"/>
    <!-- White inner border -->
    <path d="M20 3C11.72 3 5 9.72 5 18c0 9.5 15 33 15 33s15-23.5 15-33c0-8.28-6.72-15-15-15z" fill="none" stroke="#fff" stroke-width="2.5"/>
    <!-- Center dot - larger and high contrast -->
    <circle cx="20" cy="18" r="6" fill="#fff" stroke="#000" stroke-width="2"/>
    <circle cx="20" cy="18" r="3.5" fill="#dc2626"/>
  </svg>`,
} as const;

export type PinColor = keyof typeof PIN_IMAGES;
