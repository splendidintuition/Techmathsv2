/** Shared content types — the contract between the database, the pages and the admin console. */

export type MethodStep = { title: string; detail: string };
export type Faq = { q: string; a: string };
export type Kpi = { value: string; label: string };
export type Metric = { value: string; label: string };

export type Service = {
  slug: string;
  position: number;
  title: string;
  short: string;
  icon: string;
  summary: string;
  included: string[];
  excluded: string[];
  deliverables: string[];
  method: MethodStep[];
  tooling: string[];
  standards: string[];
  faqs: Faq[];
  kpis: Kpi[];
  keywords: string[];
};

export type Project = {
  slug: string;
  position: number;
  title: string;
  client: string;
  summary: string;
  services: string[];
  industries: string[];
  country: string;
  region: string;
  year: number;
  duration: string;
  teamSize: number;
  challenge: string;
  scope: string[];
  result: string;
  metrics: Metric[];
  quote: string;
  isPlaceholder: boolean;
};

export type Insight = {
  slug: string;
  /** Optional shorter title used for <title>/OG when the display title is long. */
  seoTitle?: string;
  position: number;
  title: string;
  excerpt: string;
  body: string;
  kind: "article" | "checklist" | "guide";
  category: string;
  author: string;
  publishedOn: string;
  readMinutes: number;
  download: boolean;
  tags: string[];
};

export type Industry = {
  slug: string;
  position: number;
  title: string;
  summary: string;
  pressures: string[];
  services: string[];
  proofPoint: string;
};

export type CoverageCountry = {
  code: string;
  name: string;
  region:
    | "Iberia"
    | "Western Europe"
    | "Southern Europe"
    | "Nordics"
    | "DACH"
    | "Benelux"
    | "Central & Eastern Europe"
    | "UK & Ireland"
    | "Americas"
    | "Asia-Pacific";
  mobiliseHours: number;
  note: string;
  hubs: string[];
  hq?: boolean;
};

export type TeamMember = {
  name: string;
  role: string;
  bio: string;
  certifications: string[];
  isPlaceholder: boolean;
};

export type Testimonial = {
  quote: string;
  author: string;
  role: string;
  company: string;
  isPlaceholder: boolean;
};

export type LeadInput = {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  country: string;
  siteLocation?: string;
  services: string[];
  racks?: number;
  servers?: number;
  ports?: number;
  timeline?: string;
  urgency?: string;
  message?: string;
  source?: string;
  consentPrivacy: boolean;
  consentMarketing: boolean;
  spamScore?: number;
  ipHash?: string;
};

export type Lead = LeadInput & {
  id: number;
  reference: string;
  createdAt: string;
  status: string;
  notified: boolean;
};
