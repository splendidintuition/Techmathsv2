/** Service groupings used by the hub filter and related-service blocks. */
export const SERVICE_CATEGORIES = [
  {
    id: "build",
    label: "Build",
    blurb: "Physical infrastructure: racks, containment and cabling.",
    slugs: ["rack-and-stack", "structured-cabling"],
  },
  {
    id: "install",
    label: "Install",
    blurb: "Hardware and software brought to a known-good baseline.",
    slugs: ["server-installation", "os-application-installation", "network-connection"],
  },
  {
    id: "validate",
    label: "Validate",
    blurb: "Prove the deployment does what the design claims.",
    slugs: ["commissioning-testing"],
  },
  {
    id: "operate",
    label: "Operate",
    blurb: "Day-two support, moves and lifecycle work.",
    slugs: ["remote-smart-hands", "decommissioning-migration", "maintenance-field-support"],
  },
] as const;

export type CategoryId = (typeof SERVICE_CATEGORIES)[number]["id"];

export function categoryOf(slug: string): { id: CategoryId; label: string } {
  for (const c of SERVICE_CATEGORIES) {
    if ((c.slugs as readonly string[]).includes(slug)) return { id: c.id, label: c.label };
  }
  return { id: "operate", label: "Operate" };
}

/** Services commonly delivered alongside a given one — used for cross-links. */
const RELATED: Record<string, string[]> = {
  "rack-and-stack": ["structured-cabling", "server-installation", "commissioning-testing"],
  "structured-cabling": ["rack-and-stack", "network-connection", "commissioning-testing"],
  "server-installation": ["rack-and-stack", "os-application-installation", "commissioning-testing"],
  "os-application-installation": ["server-installation", "network-connection", "commissioning-testing"],
  "network-connection": ["structured-cabling", "os-application-installation", "commissioning-testing"],
  "commissioning-testing": ["network-connection", "server-installation", "maintenance-field-support"],
  "remote-smart-hands": ["maintenance-field-support", "rack-and-stack", "structured-cabling"],
  "decommissioning-migration": ["rack-and-stack", "network-connection", "maintenance-field-support"],
  "maintenance-field-support": ["remote-smart-hands", "commissioning-testing", "server-installation"],
};

export function relatedSlugs(slug: string): string[] {
  return RELATED[slug] ?? [];
}
