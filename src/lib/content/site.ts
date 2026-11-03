import type { CoverageCountry, Industry, TeamMember, Testimonial } from "../types";

/**
 * Company facts.
 *
 * Anything marked `placeholder` or listed in PLACEHOLDER_REGISTER is content the
 * company must supply before launch (see docs/HANDOVER.md). It is written so the
 * site is complete and reviewable today, and impossible to mistake for verified
 * fact once you read the handover list.
 */
export const COMPANY = {
  name: "Tech Maths",
  legalName: "Tech Maths, Lda.", // PLACEHOLDER — confirm legal entity and registration
  registration: "NIF 000 000 000", // PLACEHOLDER
  tagline: "Hands-on data center engineering, anywhere you build.",
  positioning:
    "We are a specialist data center delivery partner. Our engineers build racks, pull and certify cable, install and configure servers and networks, commission the result and stay on call afterwards — in Lisbon, across Europe, and in the UK, US and India.",
  founded: 2019, // PLACEHOLDER — confirm founding year
  email: "hello@techmaths.com", // PLACEHOLDER
  leadsEmail: "leads@techmaths.com", // PLACEHOLDER
  phone: "+351 21 000 0000", // PLACEHOLDER
  whatsapp: "+351900000000", // PLACEHOLDER
  domain: "techmaths.com", // PLACEHOLDER — confirm domain
  headquarters: {
    city: "Lisbon",
    country: "Portugal",
    address: "Av. da Liberdade 000, 1250-096 Lisboa, Portugal", // PLACEHOLDER
    timezone: "Europe/Lisbon",
  },
  offices: [
    { city: "Lisbon", country: "PT", role: "Headquarters & Iberia hub", address: "Av. da Liberdade 000, Lisboa", placeholder: true },
    { city: "Frankfurt", country: "DE", role: "DACH & Central Europe hub", address: "Frankfurt am Main", placeholder: true },
    { city: "London", country: "GB", role: "UK & Ireland hub", address: "London", placeholder: true },
    { city: "Amsterdam", country: "NL", role: "Benelux & Nordics hub", address: "Amsterdam", placeholder: true },
    { city: "Ashburn, VA", country: "US", role: "US East coverage", address: "Northern Virginia", placeholder: true },
    { city: "Mumbai", country: "IN", role: "India coverage", address: "Mumbai", placeholder: true },
  ],
  languages: ["English", "Português", "Español", "Deutsch", "Français"],
  responsePromise: "Quoted within 4 business hours. Emergency remote hands mobilised from the nearest hub.",
};

/**
 * Headline figures for the trust strip.
 * PLACEHOLDER: these must be replaced with audited figures before launch.
 */
export const STATS = [
  { value: "28", label: "countries covered", suffix: "", note: "placeholder" },
  { value: "380", label: "projects delivered", suffix: "+", note: "placeholder" },
  { value: "60", label: "field engineers", suffix: "+", note: "placeholder" },
  { value: "4h", label: "average quote response", suffix: "", note: "placeholder" },
] as const;

export const TRUST_POINTS = [
  { label: "ESD-controlled crews", detail: "ANSI/ESD S20.20 handling on every site" },
  { label: "Certified cabling", detail: "100% link certification with native test exports" },
  { label: "Documented handover", detail: "As-builts, asset register and evidence pack" },
  { label: "Insured & vetted", detail: "Public liability, background checks, site inductions" },
];

/** How We Work — the eight-stage process with quality gates. */
export const PROCESS = [
  {
    id: "brief",
    step: "01",
    title: "Brief",
    duration: "Day 0",
    summary: "You send the hardware list, the drawings you have and the deadline. We ask the questions that decide feasibility.",
    detail:
      "We confirm site access windows, power and cooling readiness, security and induction requirements, and whether the scope is a build, a migration or a mixed programme. Anything ambiguous is resolved here, in writing, before a price is issued.",
    outputs: ["Scope confirmation", "Access and security requirements", "Indicative pricing within 4 business hours"],
    gate: "Scope signed off before mobilisation planning starts.",
  },
  {
    id: "survey",
    step: "02",
    title: "Survey",
    duration: "Day 1–3",
    summary: "A site visit or a structured remote survey. We measure what is actually there, not what the drawing says.",
    detail:
      "Rack space, containment capacity, power feeds and phases, cooling behaviour, cable routes, lifting and access constraints, and the state of anything we have to work around. Remote surveys use a guided checklist with your site team when travel is not justified.",
    outputs: ["Site survey report", "Risk and constraint register", "Route and containment assessment"],
    gate: "Constraints logged and priced — no surprises left for the floor.",
  },
  {
    id: "plan",
    step: "03",
    title: "Plan",
    duration: "Day 3–7",
    summary: "Rack elevations, cable schedules, port maps and a sequenced programme you can approve line by line.",
    detail:
      "The plan is the deliverable that keeps the project honest: what goes where, in which order, by whom, with which tests at which point. Change after this point goes through a documented change record rather than an informal conversation.",
    outputs: ["Rack elevations and cable schedule", "Port map and addressing plan", "Programme with milestones and dependencies"],
    gate: "Plan approved and baselined before mobilisation.",
  },
  {
    id: "mobilise",
    step: "04",
    title: "Mobilise",
    duration: "Day 7+",
    summary: "Crews, tooling, spares and logistics in place — including inductions, permits and site-specific briefings.",
    detail:
      "Engineers are briefed on the plan and the site before they arrive. Tooling is calibrated, ESD equipment checked, and any local access or licensing requirements arranged in advance so the first day on the floor is spent building, not waiting.",
    outputs: ["Named crew and schedule", "Calibrated tooling and ESD kits", "Access, permits and inductions confirmed"],
    gate: "Crew briefed and inducted before first touch of live equipment.",
  },
  {
    id: "execute",
    step: "05",
    title: "Execute",
    duration: "Per programme",
    summary: "The build: racks, cable, hardware, OS, network. Daily progress against plan, deviations logged as they happen.",
    detail:
      "Work runs in batches so specification faults surface on the first units rather than the last hundred. Daily reports cover completed work, blockers and deviations. Nothing is silently re-planned: if reality disagrees with the plan, you hear about it the same day.",
    outputs: ["Daily progress report", "Deviation log with approvals", "Work-in-progress photo record"],
    gate: "Daily quality check by the lead engineer before the crew signs off.",
  },
  {
    id: "test",
    step: "06",
    title: "Test",
    duration: "Per programme",
    summary: "Certification and acceptance testing, including deliberate fault injection to prove redundancy claims.",
    detail:
      "Copper and fibre certified per link, power paths verified on both feeds, and failover tested by removing feeds, links or nodes under observation. Results are recorded live. A failing test stays failing until it is fixed and re-tested.",
    outputs: ["Certification results (native export)", "Acceptance test report", "Defect register with severity and owner"],
    gate: "All defects closed or formally accepted with residual risk in writing.",
  },
  {
    id: "document",
    step: "07",
    title: "Document",
    duration: "Parallel",
    summary: "As-builts, asset register, port maps, runbooks and the photo evidence that makes them believable.",
    detail:
      "Documentation is written during the job, not reconstructed at the end — which is why our as-builts match what is actually in the hall. Formats follow your document structure if you have one.",
    outputs: ["As-built drawings (PDF + DWG)", "Asset register with serials", "Port map and cabling schedules", "Runbooks"],
    gate: "Documentation reviewed by a second engineer before issue.",
  },
  {
    id: "handover",
    step: "08",
    title: "Handover",
    duration: "Go-live",
    summary: "A walkthrough with your team, a signed acceptance pack, and field support already scoped for what comes next.",
    detail:
      "We walk your operations team through what was built and how it is documented, transfer credentials and access properly, and agree the support model for the operating phase. Most projects move straight into a maintenance and field support agreement.",
    outputs: ["Signed acceptance pack", "Knowledge transfer session", "Support and SLA proposal"],
    gate: "Client acceptance signed; residual risks acknowledged in writing.",
  },
];

export const SAFETY_STANDARDS = [
  {
    title: "ESD control",
    detail: "ANSI/ESD S20.20 aligned handling: wrist straps, ESD-safe surfaces, continuous monitoring where the site requires it, and controlled packaging for any component that leaves the hall.",
  },
  {
    title: "Site safety",
    detail: "Method statements and risk assessments for lifts, ladder work, overhead containment and live-environment working. Local site inductions completed before first access, and PPE to site standard.",
  },
  {
    title: "Change control",
    detail: "ITIL-aligned change records for anything touching production. Rollback defined before work starts, maintenance windows agreed in advance, and no undocumented changes — ever.",
  },
  {
    title: "Data and security",
    detail: "GDPR-aligned handling of personal data, chain-of-custody for media and assets, NIST SP 800-88 sanitisation methods, and confidentiality agreements for every engineer on site.",
  },
];

export const INDUSTRIES: Industry[] = [
  {
    slug: "colocation",
    position: 1,
    title: "Colocation providers",
    summary:
      "Extra hands for customer deployments, cross-connect work and fit-outs that arrive faster than your in-house team can absorb. Your customers get a fast, tidy deployment; your team keeps control of the facility.",
    pressures: [
      "Customer deployment requests arrive in bursts, not evenly",
      "Cross-connect and meet-me-room work is skilled but low-margin to staff permanently",
      "Every deployment reflects on your facility's standards",
      "SLAs to customers are contractual, and delays cost you directly",
    ],
    services: ["rack-and-stack", "structured-cabling", "remote-smart-hands", "commissioning-testing"],
    proofPoint: "Crews work to your facility standard and your customer-facing process, so deployments look like your own team did them.",
  },
  {
    slug: "hyperscale",
    position: 2,
    title: "Hyperscale & large build-outs",
    summary:
      "High-volume rack, cable and server deployment where consistency matters more than heroics. Repeatable method, batch validation and documentation that scales to thousands of units.",
    pressures: [
      "Volume deadlines with little tolerance for rework",
      "Configuration drift across thousands of nodes",
      "Multi-vendor coordination on a single floor",
      "Acceptance evidence at scale, not just samples",
    ],
    services: ["rack-and-stack", "structured-cabling", "server-installation", "os-application-installation", "commissioning-testing"],
    proofPoint: "Wave-based execution with validation between waves: a specification error is caught on the first batch, not the last thousand.",
  },
  {
    slug: "enterprise",
    position: 3,
    title: "Enterprise server rooms",
    summary:
      "Companies building or moving a private server room or rack estate. One accountable partner from survey through to handover, including the awkward parts: out-of-hours work, live environments and legacy cabling.",
    pressures: [
      "No in-house data center engineering team",
      "Migration windows measured in hours, outside business time",
      "Legacy cabling and undocumented racks",
      "Internal stakeholders who need plain-language updates",
    ],
    services: ["decommissioning-migration", "rack-and-stack", "network-connection", "maintenance-field-support"],
    proofPoint: "Staged migrations with rollback positions, and a single point of contact who translates progress for your stakeholders.",
  },
  {
    slug: "telecom",
    position: 4,
    title: "Telecom & network operators",
    summary:
      "Edge sites, PoPs and network equipment deployments across many locations. Standardised builds delivered by crews who follow the same method in every country.",
    pressures: [
      "Many small sites rather than a few large ones",
      "Strict standards across every location",
      "Cross-connect and carrier hand-off coordination",
      "Access windows dictated by other operators",
    ],
    services: ["network-connection", "structured-cabling", "rack-and-stack", "maintenance-field-support"],
    proofPoint: "One method, one documentation standard, applied identically in Lisbon, Frankfurt, London and Mumbai.",
  },
  {
    slug: "edge",
    position: 5,
    title: "Edge & distributed infrastructure",
    summary:
      "Small footprints in many places, often in locations without a local engineering presence. We mobilise from the nearest hub and deliver to the same standard as a flagship site.",
    pressures: [
      "Sites in locations with no local specialist labour",
      "Short windows and high travel overhead per site",
      "Limited remote management until connectivity is live",
      "Standardisation across heterogeneous locations",
    ],
    services: ["remote-smart-hands", "rack-and-stack", "network-connection", "maintenance-field-support"],
    proofPoint: "Hub-based mobilisation with quoted travel times before you commit, and photo-evidenced closure on every task.",
  },
];

/** Coverage: base in Lisbon, engineers deployable across Europe, UK, US and India. */
export const COVERAGE: CoverageCountry[] = [
  { code: "PT", name: "Portugal", region: "Iberia", mobiliseHours: 4, note: "Headquarters. Lisbon-based crews with direct access to every Portuguese facility and the main Lisbon data center corridor.", hubs: ["Lisbon", "Porto"], hq: true },
  { code: "ES", name: "Spain", region: "Iberia", mobiliseHours: 6, note: "Madrid and Barcelona covered from the Lisbon hub with local engineers for repeat sites.", hubs: ["Madrid", "Barcelona"] },
  { code: "FR", name: "France", region: "Western Europe", mobiliseHours: 8, note: "Paris region and Marseille landing stations covered from the Frankfurt and Lisbon hubs.", hubs: ["Paris", "Marseille"] },
  { code: "IE", name: "Ireland", region: "UK & Ireland", mobiliseHours: 8, note: "Dublin corridor — one of Europe's densest data center markets — served from the London hub.", hubs: ["Dublin"] },
  { code: "GB", name: "United Kingdom", region: "UK & Ireland", mobiliseHours: 6, note: "London hub covering Slough, Docklands, Manchester and Edinburgh. Post-Brexit customs paperwork handled for equipment moves.", hubs: ["London", "Manchester"] },
  { code: "NL", name: "Netherlands", region: "Benelux", mobiliseHours: 6, note: "Amsterdam hub serving the Amsterdam and Rotterdam corridors plus cross-connect work in carrier hotels.", hubs: ["Amsterdam", "Rotterdam"] },
  { code: "BE", name: "Belgium", region: "Benelux", mobiliseHours: 8, note: "Brussels and Antwerp covered from the Amsterdam hub.", hubs: ["Brussels"] },
  { code: "LU", name: "Luxembourg", region: "Benelux", mobiliseHours: 8, note: "Covered from Frankfurt; frequent work for financial-sector private racks.", hubs: ["Luxembourg City"] },
  { code: "DE", name: "Germany", region: "DACH", mobiliseHours: 6, note: "Frankfurt hub — our largest continental operation. Full coverage of FRA, plus Berlin, Hamburg, Munich and Düsseldorf.", hubs: ["Frankfurt", "Berlin", "Munich"] },
  { code: "AT", name: "Austria", region: "DACH", mobiliseHours: 10, note: "Vienna covered from the Frankfurt hub.", hubs: ["Vienna"] },
  { code: "CH", name: "Switzerland", region: "DACH", mobiliseHours: 10, note: "Zurich and Geneva covered from Frankfurt. Swiss customs procedures for equipment import handled.", hubs: ["Zurich", "Geneva"] },
  { code: "DK", name: "Denmark", region: "Nordics", mobiliseHours: 12, note: "Copenhagen and the Nordic renewable-powered build wave covered from Amsterdam and Frankfurt.", hubs: ["Copenhagen"] },
  { code: "SE", name: "Sweden", region: "Nordics", mobiliseHours: 14, note: "Stockholm and the northern hyperscale sites; long-stay crews available for remote locations.", hubs: ["Stockholm"] },
  { code: "NO", name: "Norway", region: "Nordics", mobiliseHours: 14, note: "Oslo covered from the Nordics rota; travel and logistics arranged per site.", hubs: ["Oslo"] },
  { code: "FI", name: "Finland", region: "Nordics", mobiliseHours: 16, note: "Helsinki and Oulu; cold-climate sites handled with appropriate scheduling and kit.", hubs: ["Helsinki"] },
  { code: "IS", name: "Iceland", region: "Nordics", mobiliseHours: 20, note: "Reykjavík area covered on a scheduled basis for long-stay deployments.", hubs: ["Reykjavík"] },
  { code: "IT", name: "Italy", region: "Southern Europe", mobiliseHours: 10, note: "Milan corridor covered from Frankfurt; Rome and Palermo on request.", hubs: ["Milan"] },
  { code: "GR", name: "Greece", region: "Southern Europe", mobiliseHours: 16, note: "Athens covered on a scheduled basis; landing-station work supported.", hubs: ["Athens"] },
  { code: "PL", name: "Poland", region: "Central & Eastern Europe", mobiliseHours: 12, note: "Warsaw hub for the fastest-growing data center market in Central Europe.", hubs: ["Warsaw"] },
  { code: "CZ", name: "Czechia", region: "Central & Eastern Europe", mobiliseHours: 12, note: "Prague covered from the Warsaw and Frankfurt hubs.", hubs: ["Prague"] },
  { code: "SK", name: "Slovakia", region: "Central & Eastern Europe", mobiliseHours: 14, note: "Bratislava covered from Vienna and Warsaw rotations.", hubs: ["Bratislava"] },
  { code: "HU", name: "Hungary", region: "Central & Eastern Europe", mobiliseHours: 14, note: "Budapest covered on a scheduled basis.", hubs: ["Budapest"] },
  { code: "RO", name: "Romania", region: "Central & Eastern Europe", mobiliseHours: 16, note: "Bucharest covered from the Warsaw hub.", hubs: ["Bucharest"] },
  { code: "US", name: "United States", region: "Americas", mobiliseHours: 24, note: "US East coverage from Northern Virginia, plus Chicago, Dallas and the Bay Area. Site-specific travel quotes issued before commitment.", hubs: ["Ashburn, VA", "Chicago", "Dallas", "Bay Area"] },
  { code: "CA", name: "Canada", region: "Americas", mobiliseHours: 30, note: "Toronto and Montréal covered on a scheduled basis from US East rotations.", hubs: ["Toronto", "Montréal"] },
  { code: "IN", name: "India", region: "Asia-Pacific", mobiliseHours: 24, note: "Mumbai, Bengaluru, Chennai, Hyderabad and Delhi NCR. Local engineering teams for build-outs and field support at scale.", hubs: ["Mumbai", "Bengaluru", "Chennai", "Hyderabad", "Delhi NCR"] },
  { code: "AE", name: "United Arab Emirates", region: "Asia-Pacific", mobiliseHours: 28, note: "Dubai and Abu Dhabi covered from the India base for Gulf deployments.", hubs: ["Dubai"] },
  { code: "SG", name: "Singapore", region: "Asia-Pacific", mobiliseHours: 30, note: "Covered on a scheduled basis from the India base.", hubs: ["Singapore"] },
];

/**
 * Team profiles.
 * PLACEHOLDER: replace with real engineers, real bios and real photographs.
 */
export const TEAM: TeamMember[] = [
  {
    name: "Harmeet Singh",
    role: "Founder & Delivery Director",
    bio: "Fifteen years delivering data center build-outs across Europe, from single-rack enterprise installs to multi-thousand-unit hyperscale deployments. Runs the delivery standard every Tech Maths crew works to.",
    certifications: ["BICSI Installer 2", "Vendor-neutral DCOS awareness", "IOSH Managing Safely"],
    isPlaceholder: true,
  },
  {
    name: "Ana Ferreira",
    role: "Head of Structured Cabling",
    bio: "Certification obsessive. Has never handed over a link she would not test again in front of a client. Leads the fibre and copper teams across Iberia and DACH.",
    certifications: ["BICSI Installer 2 Copper & Fibre", "Fluke Networks certified tester", "TIA-606-D administration"],
    isPlaceholder: true,
  },
  {
    name: "Miguel Costa",
    role: "Lead Network Engineer",
    bio: "Brings up fabric for a living: LACP, MLAG, BGP and the deliberate failover tests that prove a design is real. Covers carrier hotels and cross-connect work across Europe.",
    certifications: ["CCNP Enterprise", "JNCIP-DC", "Arista EOS specialist"],
    isPlaceholder: true,
  },
  {
    name: "Priya Nair",
    role: "India Operations Lead",
    bio: "Runs build-outs and field support across Mumbai, Bengaluru, Chennai and Hyderabad. Known for taking multi-site programmes and making them boringly predictable.",
    certifications: ["ITIL 4 Managing Professional", "Vendor server specialist", "Project management (PRINCE2 Practitioner)"],
    isPlaceholder: true,
  },
  {
    name: "Tomasz Wójcik",
    role: "Field Support Manager, CEE",
    bio: "Owns SLA performance across Central and Eastern Europe. Turns recurring faults into permanent fixes rather than repeat visits.",
    certifications: ["ITIL 4 Foundation", "Vendor storage specialist", "ESD S20.20 handling"],
    isPlaceholder: true,
  },
  {
    name: "Sofia Lindqvist",
    role: "Commissioning & QA Lead",
    bio: "Writes the acceptance test plans and refuses to sign anything she cannot evidence. Second-engineer reviewer on every handover pack we issue.",
    certifications: ["ISO 9001 internal auditor", "ASHRAE thermal guidelines", "EN 50600 awareness"],
    isPlaceholder: true,
  },
];

/**
 * Testimonials.
 * PLACEHOLDER: every quote below is illustrative and must be replaced with a
 * real, permissioned reference before launch.
 */
export const TESTIMONIALS: Testimonial[] = [
  {
    quote: "They took 240 racks off our backlog in six weeks without a single deviation from our facility standard. The as-built documentation was better than what our own contractors produce.",
    author: "Operations Director",
    role: "Colocation provider",
    company: "Client reference — placeholder",
    isPlaceholder: true,
  },
  {
    quote: "The failover testing was the part that convinced us. They pulled feeds deliberately and measured the recovery instead of telling us it would be fine.",
    author: "Head of Infrastructure",
    role: "Financial services",
    company: "Client reference — placeholder",
    isPlaceholder: true,
  },
  {
    quote: "We needed certified cabling across four countries to one standard. Every link came with a native test export, and the label scheme matched ours exactly.",
    author: "Network Delivery Manager",
    role: "Telecom operator",
    company: "Client reference — placeholder",
    isPlaceholder: true,
  },
  {
    quote: "Migration of two server rooms in one weekend, with rollback positions agreed in advance. Monday morning nobody could tell anything had moved.",
    author: "IT Director",
    role: "Enterprise",
    company: "Client reference — placeholder",
    isPlaceholder: true,
  },
  {
    quote: "Remote hands requests answered inside two hours with photo evidence attached. It replaced a permanent on-site role for us.",
    author: "Service Delivery Manager",
    role: "Managed service provider",
    company: "Client reference — placeholder",
    isPlaceholder: true,
  },
];

/** Client logo strip — neutral placeholders, no invented brand names. */
export const CLIENT_LOGOS = [
  "Colocation operator",
  "Hyperscale provider",
  "Telecom operator",
  "Managed service provider",
  "Financial services",
  "Hardware vendor",
  "Edge platform",
  "System integrator",
];

export const HOME_FAQS = [
  {
    q: "Do you only work in Europe?",
    a: "Europe is our home market, with crews mobilising from Lisbon, Frankfurt, London, Amsterdam and Warsaw. We also deliver in the UK, the United States and India through regional teams, with travel time quoted per site before you commit.",
  },
  {
    q: "Can you work under our standards and change control?",
    a: "Yes, and we prefer it. Your rack standard, labelling scheme, change records and access procedures become our working method for the duration of the project.",
  },
  {
    q: "Do you supply hardware and materials?",
    a: "We can, from your approved vendor list, or install client-supplied equipment. Either way every item is checked in, serial-captured and reconciled against the packing list.",
  },
  {
    q: "What does a handover pack contain?",
    a: "As-built drawings, the asset register with serial numbers and U positions, port maps and cabling schedules, certification and acceptance test results, the defect register with closures, runbooks, and photographic evidence.",
  },
  {
    q: "How quickly can you mobilise?",
    a: "Quoted within four business hours for standard requests. Hub-site emergency remote hands typically mobilise inside two hours. Larger programmes are scheduled against a mobilisation plan agreed at the brief stage.",
  },
  {
    q: "Are your engineers insured and vetted?",
    a: "Yes. Public liability cover, background checks and site-specific inductions are completed before first access. Certifications and insurance documents are available on request.",
  },
];

/**
 * Everything on the site that is illustrative and must be replaced before launch.
 * Rendered in the admin console as a pre-launch checklist.
 */
export const PLACEHOLDER_REGISTER = [
  { item: "Company legal name, NIF and registered address", where: "src/lib/content/site.ts → COMPANY" },
  { item: "Contact details: email, phone, WhatsApp, office addresses", where: "src/lib/content/site.ts → COMPANY" },
  { item: "Headline figures in the trust strip (28 / 380 / 60 / 4h)", where: "src/lib/content/site.ts → STATS" },
  { item: "Case studies — all 8 are illustrative and flagged on-page", where: "src/lib/content/projects.ts" },
  { item: "Testimonials — all 5 are illustrative and flagged on-page", where: "src/lib/content/site.ts → TESTIMONIALS" },
  { item: "Client logos — neutral placeholders, no invented brands", where: "src/lib/content/site.ts → CLIENT_LOGOS" },
  { item: "Team bios, photographs and certifications", where: "src/lib/content/site.ts → TEAM" },
  { item: "Certifications and insurance documents (PDFs)", where: "public/downloads/" },
  { item: "Lead routing address and CRM webhook", where: ".env.local → LEAD_NOTIFY_EMAIL, LEAD_WEBHOOK_URL" },
  { item: "Canonical domain for SEO metadata", where: ".env.local → NEXT_PUBLIC_SITE_URL" },
];
