import React from "react";

interface IconProps extends React.SVGAttributes<SVGElement> {
  size?: number;
}

const defaults = (p: IconProps) => ({
  width: p.size || 20,
  height: p.size || 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...p,
  size: undefined,
});

export const IconDashboard = (p: IconProps) => (
  <svg {...defaults(p)}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="4" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="11" width="7" height="10" rx="1.5" />
  </svg>
);

export const IconGear = (p: IconProps) => (
  <svg {...defaults(p)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32 1.41-1.41" />
  </svg>
);

export const IconMachine = (p: IconProps) => (
  <svg {...defaults(p)}>
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <circle cx="8" cy="12" r="2.5" />
    <circle cx="16" cy="12" r="2.5" />
    <path d="M10.5 12h3" />
    <path d="M2 10h2M20 10h2M2 14h2M20 14h2" />
  </svg>
);

export const IconEquipment = (p: IconProps) => (
  <svg {...defaults(p)}>
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z" />
  </svg>
);

export const IconFactory = (p: IconProps) => (
  <svg {...defaults(p)}>
    <path d="M2 20V8l5 4V8l5 4V8l5 4h5v8H2Z" />
    <path d="M7 20v-4h3v4" />
    <path d="M14 20v-3h3v3" />
    <rect x="4" y="2" width="3" height="6" rx="0.5" />
    <line x1="5.5" y1="2" x2="5.5" y2="0" strokeWidth="2" />
  </svg>
);

export const IconSpare = (p: IconProps) => (
  <svg {...defaults(p)}>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="m3.27 6.96 8.73 5.05 8.73-5.05" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

export const IconTicket = (p: IconProps) => (
  <svg {...defaults(p)}>
    <path d="M12 2L2 7l10 5 10-5-10-5Z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
    <circle cx="12" cy="7" r="1" fill="currentColor" stroke="none" />
  </svg>
);

export const IconPreventive = (p: IconProps) => (
  <svg {...defaults(p)}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <path d="m9 16 2 2 4-4" />
  </svg>
);

export const IconShift = (p: IconProps) => (
  <svg {...defaults(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 3" />
    <path d="M16.5 3.5A10 10 0 0 1 22 12" strokeDasharray="3 2" />
  </svg>
);

export const IconAnalytics = (p: IconProps) => (
  <svg {...defaults(p)}>
    <path d="M3 3v18h18" />
    <path d="M7 17l4-6 4 3 5-7" />
    <circle cx="7" cy="17" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="11" cy="11" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="15" cy="14" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="20" cy="7" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);

export const IconChart = (p: IconProps) => (
  <svg {...defaults(p)}>
    <rect x="3" y="12" width="4" height="9" rx="1" />
    <rect x="10" y="7" width="4" height="14" rx="1" />
    <rect x="17" y="3" width="4" height="18" rx="1" />
  </svg>
);

export const IconOrder = (p: IconProps) => (
  <svg {...defaults(p)}>
    <path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z" />
    <path d="M15 3v4a1 1 0 0 0 1 1h4" />
    <line x1="7" y1="12" x2="17" y2="12" />
    <line x1="7" y1="16" x2="13" y2="16" />
  </svg>
);

export const IconProduct = (p: IconProps) => (
  <svg {...defaults(p)}>
    <path d="M12 2L2 7v10l10 5 10-5V7L12 2Z" />
    <path d="M12 22V12" />
    <path d="M22 7L12 12 2 7" />
    <path d="M17 4.5L7 9.5" />
  </svg>
);

export const IconArticle = (p: IconProps) => (
  <svg {...defaults(p)}>
    <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    <circle cx="12" cy="7" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);

export const IconRecipe = (p: IconProps) => (
  <svg {...defaults(p)}>
    <path d="M4 19h16" />
    <path d="M4 15c0-3 2-6 8-6s8 3 8 6" />
    <path d="M9 9V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4" />
    <line x1="12" y1="15" x2="12" y2="19" />
    <circle cx="8" cy="17" r="0.8" fill="currentColor" stroke="none" />
    <circle cx="16" cy="17" r="0.8" fill="currentColor" stroke="none" />
  </svg>
);

export const IconTimer = (p: IconProps) => (
  <svg {...defaults(p)}>
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9v4l2.5 2.5" />
    <path d="M10 2h4" />
    <path d="M12 2v2" />
    <path d="M20 5l-1.5 1.5" />
  </svg>
);

export const IconConsumption = (p: IconProps) => (
  <svg {...defaults(p)}>
    <path d="M12 22c5.52 0 10-3.13 10-7v-2c0-3.87-4.48-7-10-7S2 9.13 2 13v2c0 3.87 4.48 7 10 7Z" />
    <path d="M2 13c0-3.87 4.48-7 10-7s10 3.13 10 7" />
    <ellipse cx="12" cy="8" rx="10" ry="5" />
    <path d="M12 3v3" />
  </svg>
);

export const IconStop = (p: IconProps) => (
  <svg {...defaults(p)}>
    <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <circle cx="12" cy="16" r="0.8" fill="currentColor" stroke="none" />
  </svg>
);

export const IconSettings = (p: IconProps) => (
  <svg {...defaults(p)}>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const IconLogout = (p: IconProps) => (
  <svg {...defaults(p)}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

export const IconMaintenance = (p: IconProps) => (
  <svg {...defaults(p)}>
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z" />
  </svg>
);

export const IconProduction = (p: IconProps) => (
  <svg {...defaults(p)}>
    <path d="M2 20V8l5 4V8l5 4V8l5 4h5v8H2Z" />
    <path d="M4 2h3v4H4z" />
    <line x1="5.5" y1="0" x2="5.5" y2="2" strokeWidth="1.5" />
  </svg>
);

export const IconBell = (p: IconProps) => (
  <svg {...defaults(p)}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

export const IconSearch = (p: IconProps) => (
  <svg {...defaults(p)}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
