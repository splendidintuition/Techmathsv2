import type { ReactElement, SVGProps } from "react";

/**
 * Inline SVG icon set — no icon library, so nothing extra ships to the client.
 * Service icons are keyed by the `icon` string stored in the database.
 */

type P = SVGProps<SVGSVGElement>;

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.25,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const IconRack = (p: P) => (
  <svg {...base} {...p}>
    <rect x="4" y="2.5" width="16" height="19" rx="1.5" />
    <path d="M4 7h16M4 11.5h16M4 16h16" />
    <path d="M7 4.75h.01M7 9.25h.01M7 13.75h.01" strokeWidth="2" />
    <path d="M17 18.5h1.5" />
  </svg>
);

export const IconCable = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 3v5a3 3 0 0 0 3 3h10a3 3 0 0 1 3 3v7" />
    <path d="M4 3h3M17 21h3" />
    <rect x="2.5" y="1.5" width="6" height="2.5" rx="0.75" />
    <rect x="15.5" y="19.5" width="6" height="2.5" rx="0.75" />
    <path d="M9.5 11v2.5M14.5 11v2.5" opacity="0.5" />
  </svg>
);

export const IconServer = (p: P) => (
  <svg {...base} {...p}>
    <rect x="2.5" y="4" width="19" height="6" rx="1.25" />
    <rect x="2.5" y="14" width="19" height="6" rx="1.25" />
    <path d="M6 7h.01M6 17h.01" strokeWidth="2" />
    <path d="M10 7h6M10 17h6" opacity="0.55" />
  </svg>
);

export const IconTerminal = (p: P) => (
  <svg {...base} {...p}>
    <rect x="2.5" y="3.5" width="19" height="17" rx="1.75" />
    <path d="M6.5 9l2.5 2.5-2.5 2.5M12 14.5h5" />
  </svg>
);

export const IconNetwork = (p: P) => (
  <svg {...base} {...p}>
    <rect x="9" y="2.5" width="6" height="5" rx="1" />
    <rect x="2.5" y="16.5" width="6" height="5" rx="1" />
    <rect x="15.5" y="16.5" width="6" height="5" rx="1" />
    <path d="M12 7.5v4.5M5.5 16.5v-2.5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v2.5" />
  </svg>
);

export const IconCheck = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 2.5l8 3.2v6c0 4.6-3.3 8.6-8 9.8-4.7-1.2-8-5.2-8-9.8v-6z" />
    <path d="M8.5 12l2.5 2.5 4.5-5" />
  </svg>
);

export const IconHand = (p: P) => (
  <svg {...base} {...p}>
    <path d="M9 11V4.8a1.3 1.3 0 0 1 2.6 0V11" />
    <path d="M11.6 10.6V3.9a1.3 1.3 0 0 1 2.6 0v6.7" />
    <path d="M14.2 11V6.2a1.3 1.3 0 0 1 2.6 0V14" />
    <path d="M9 11V9.4a1.3 1.3 0 0 0-2.6 0v5.4c0 3.6 2.6 6.7 6.2 6.7 3.2 0 5.2-2 5.9-5" />
  </svg>
);

export const IconMove = (p: P) => (
  <svg {...base} {...p}>
    <path d="M3 8.5l9-5 9 5-9 5z" />
    <path d="M3 12.5l9 5 9-5" opacity="0.6" />
    <path d="M3 16.5l9 5 9-5" opacity="0.35" />
  </svg>
);

export const IconWrench = (p: P) => (
  <svg {...base} {...p}>
    <path d="M15.5 3.5a5 5 0 0 0-6.2 6.2L3.8 15.2a2 2 0 1 0 2.8 2.8l5.5-5.5a5 5 0 0 0 6.2-6.2l-2.9 2.9-2.4-.5-.5-2.4z" />
  </svg>
);

export const IconArrow = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 12h15M13 6l6 6-6 6" />
  </svg>
);

export const IconArrowUpRight = (p: P) => (
  <svg {...base} {...p}>
    <path d="M7 17L17 7M8.5 7H17v8.5" />
  </svg>
);

export const IconChevron = (p: P) => (
  <svg {...base} {...p}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);

export const IconClose = (p: P) => (
  <svg {...base} {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const IconMenu = (p: P) => (
  <svg {...base} {...p}>
    <path d="M3 7h18M3 12h18M3 17h18" />
  </svg>
);

export const IconSearch = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="M15.5 15.5L21 21" />
  </svg>
);

export const IconSun = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
  </svg>
);

export const IconMoon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
  </svg>
);

export const IconGlobe = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
  </svg>
);

export const IconClock = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5.2l3.2 2" />
  </svg>
);

export const IconPin = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);

export const IconMail = (p: P) => (
  <svg {...base} {...p}>
    <rect x="2.5" y="4.5" width="19" height="15" rx="1.75" />
    <path d="M3 6.5l9 6 9-6" />
  </svg>
);

export const IconPhone = (p: P) => (
  <svg {...base} {...p}>
    <path d="M6.5 3.5h3l1.5 4-2 1.5a12 12 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A17.5 17.5 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2z" />
  </svg>
);

export const IconWhatsapp = (p: P) => (
  <svg {...base} {...p}>
    <path d="M3.5 20.5l1.3-4.2A8.2 8.2 0 1 1 8 19.4z" />
    <path d="M9 9.2c0 3 2.3 5.3 5.3 5.3.5 0 1-.4 1-.9v-.8l-1.8-.7-.8 1a5.6 5.6 0 0 1-2-2l1-.8-.7-1.8h-.9c-.6 0-1.1.5-1.1 1z" />
  </svg>
);

export const IconLinkedIn = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M7.5 10.5V17M7.5 7.4v.1M11.5 17v-3.6a2.1 2.1 0 0 1 4.2 0V17" />
    <path d="M11.5 10.5V17" />
  </svg>
);

export const IconShield = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 2.8l7.5 3v5.6c0 4.4-3.1 8.2-7.5 9.4-4.4-1.2-7.5-5-7.5-9.4V5.8z" />
    <path d="M9 12.2l2 2 4-4.2" />
  </svg>
);

export const IconBolt = (p: P) => (
  <svg {...base} {...p}>
    <path d="M13.5 2.5L5 13.5h5.5L9.5 21.5 18.5 10H13z" />
  </svg>
);

export const IconDoc = (p: P) => (
  <svg {...base} {...p}>
    <path d="M13.5 2.5H7a1.5 1.5 0 0 0-1.5 1.5v16A1.5 1.5 0 0 0 7 21.5h10a1.5 1.5 0 0 0 1.5-1.5V7.5z" />
    <path d="M13.5 2.5v5h5M8.5 13h7M8.5 16.5h7" />
  </svg>
);

export const IconDownload = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3v12M7.5 10.5L12 15l4.5-4.5M4.5 19.5h15" />
  </svg>
);

export const IconFilter = (p: P) => (
  <svg {...base} {...p}>
    <path d="M3.5 5.5h17l-6.5 7.5v6l-4 2v-8z" />
  </svg>
);

export const IconPlus = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconSpark = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 2.5l1.8 6.2 6.2 1.8-6.2 1.8L12 18.5l-1.8-6.2L4 10.5l6.2-1.8z" />
  </svg>
);

export const IconLayers = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3l9 4.5-9 4.5-9-4.5z" />
    <path d="M3 12l9 4.5 9-4.5M3 16.5L12 21l9-4.5" opacity="0.6" />
  </svg>
);

export const IconUsers = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
    <path d="M16 5.2a3.2 3.2 0 0 1 0 6M17.5 14.8c2.1.6 3.5 2.4 3.5 5.2" opacity="0.6" />
  </svg>
);

/** Service icons keyed by the string stored against each service record. */
export const SERVICE_ICONS: Record<string, (p: P) => ReactElement> = {
  rack: IconRack,
  cable: IconCable,
  server: IconServer,
  terminal: IconTerminal,
  network: IconNetwork,
  check: IconCheck,
  hand: IconHand,
  move: IconMove,
  wrench: IconWrench,
};

export function ServiceIcon({ name, className }: { name: string; className?: string }) {
  const Cmp = SERVICE_ICONS[name] ?? IconLayers;
  return <Cmp className={className} />;
}
