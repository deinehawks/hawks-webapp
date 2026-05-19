const PIN_FILL_OPACITY = 1;

export const PIN_IMAGES = {
  yellow: `<svg width="40" height="56" viewBox="0 0 40 56" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="shadow-yellow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="4"/>
        <feOffset dx="0" dy="4" result="offsetblur"/>
        <feFlood flood-color="#000000" flood-opacity="0.8"/>
        <feComposite in2="offsetblur" operator="in"/>
        <feMerge>
          <feMergeNode/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>

    <!-- Black outline shadow -->
    <path d="M20 4C11.72 4 6 11.16 6 18c0 9.5 14 32 14 32s14-22.5 14-32c0-6.84-5.72-14-14-14z"
      fill="#000" opacity="0.4"/>

    <!-- Main pin fill (opacity adjusted here) -->
    <path d="M20 3C11.72 3 5 9.72 5 18c0 9.5 15 33 15 33s15-23.5 15-33c0-8.28-6.72-15-15-15z"
      fill="#FFFF00" fill-opacity="${PIN_FILL_OPACITY}"
      stroke="#000" stroke-width="4" filter="url(#shadow-yellow)"/>

    <!-- White inner border -->
    <path d="M20 3C11.72 3 5 9.72 5 18c0 9.5 15 33 15 33s15-23.5 15-33c0-8.28-6.72-15-15-15z"
      fill="none" stroke="#fff" stroke-width="2.5"/>

    <!-- Center dot -->
    <circle cx="20" cy="18" r="6" fill="#fff" stroke="#000" stroke-width="2"/>
    <circle cx="20" cy="18" r="3.5" fill="#FFFF00" fill-opacity="0.5"/>
  </svg>`,

  red: `<svg width="40" height="56" viewBox="0 0 40 56" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="shadow-red" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="4"/>
        <feOffset dx="0" dy="4" result="offsetblur"/>
        <feFlood flood-color="#000000" flood-opacity="0.8"/>
        <feComposite in2="offsetblur" operator="in"/>
        <feMerge>
          <feMergeNode/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>

    <!-- Black outline shadow -->
    <path d="M20 4C11.72 4 6 11.16 6 18c0 9.5 14 32 14 32s14-22.5 14-32c0-6.84-5.72-14-14-14z"
      fill="#000" opacity="0.4"/>

    <!-- Main pin fill (opacity adjusted here) -->
    <path d="M20 3C11.72 3 5 9.72 5 18c0 9.5 15 33 15 33s15-23.5 15-33c0-8.28-6.72-15-15-15z"
      fill="#dc2626" fill-opacity="${PIN_FILL_OPACITY}"
      stroke="#000" stroke-width="4" filter="url(#shadow-red)"/>

    <!-- White inner border -->
    <path d="M20 3C11.72 3 5 9.72 5 18c0 9.5 15 33 15 33s15-23.5 15-33c0-8.28-6.72-15-15-15z"
      fill="none" stroke="#fff" stroke-width="2.5"/>

    <!-- Center dot -->
    <circle cx="20" cy="18" r="6" fill="#fff" stroke="#000" stroke-width="2"/>
    <circle cx="20" cy="18" r="3.5" fill="#dc2626" fill-opacity="0.5"/>
  </svg>`,

  gray: `<svg width="40" height="56" viewBox="0 0 40 56" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="shadow-cyan" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="4"/>
        <feOffset dx="0" dy="4" result="offsetblur"/>
        <feFlood flood-color="#000000" flood-opacity="0.8"/>
        <feComposite in2="offsetblur" operator="in"/>
        <feMerge>
          <feMergeNode/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>

    <path d="M20 4C11.72 4 6 11.16 6 18c0 9.5 14 32 14 32s14-22.5 14-32c0-6.84-5.72-14-14-14z"
      fill="#000" opacity="0.4"/>

    <path d="M20 3C11.72 3 5 9.72 5 18c0 9.5 15 33 15 33s15-23.5 15-33c0-8.28-6.72-15-15-15z"
      fill="#06b6d4" fill-opacity="${PIN_FILL_OPACITY}"
      stroke="#000" stroke-width="4" filter="url(#shadow-cyan)"/>

    <path d="M20 3C11.72 3 5 9.72 5 18c0 9.5 15 33 15 33s15-23.5 15-33c0-8.28-6.72-15-15-15z"
      fill="none" stroke="#fff" stroke-width="2.5"/>

    <circle cx="20" cy="18" r="6" fill="#fff" stroke="#000" stroke-width="2"/>
    <circle cx="20" cy="18" r="3.5" fill="#06b6d4" fill-opacity="0.5"/>
  </svg>`,
} as const;

export type PinColor = keyof typeof PIN_IMAGES;

/* export const PIN_IMAGES = {
  healthy: `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="shadow-ring-h" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
        <feOffset dx="0" dy="2" result="offsetblur"/>
        <feFlood flood-color="#000000" flood-opacity="0.4"/>
        <feComposite in2="offsetblur" operator="in"/>
        <feMerge>
          <feMergeNode/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>

    <!-- Shadow ring -->
    <circle cx="16" cy="16" r="13" fill="#000000" opacity="0.3"/>

    <!-- Filled main pin -->
    <circle
      cx="16"
      cy="16"
      r="13"
      fill="#0173B2"
      fill-opacity="0.60"
      filter="url(#shadow-ring-h)"
    />

    <!-- White outline -->
    <circle cx="16" cy="16" r="13" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.8"/>

    <!-- Center dot -->
    <circle cx="16" cy="16" r="4" fill="none"  stroke="#ffffff" stroke-width="2"/>
  </svg>`,

  unhealthy: `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="shadow-ring-u" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
        <feOffset dx="0" dy="2" result="offsetblur"/>
        <feFlood flood-color="#000000" flood-opacity="0.4"/>
        <feComposite in2="offsetblur" operator="in"/>
        <feMerge>
          <feMergeNode/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>

    <!-- Shadow ring -->
    <circle cx="16" cy="16" r="13" fill="#000000" opacity="0.3"/>

    <!-- Filled main pin -->
    <circle
      cx="16"
      cy="16"
      r="13"
      fill="#DE8F05"
      fill-opacity="0.60"
      filter="url(#shadow-ring-u)"
    />

    <!-- White outline -->
    <circle cx="16" cy="16" r="13" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.8"/>

    <!-- Center dot -->
    <circle cx="16" cy="16" r="4" fill="none" stroke="#ffffff" stroke-width="2"/>
  </svg>`,
} as const; */
