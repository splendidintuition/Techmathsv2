export type CountryProfile = {
  /** ISO 3166-1 alpha-2, uppercase — joins to the `coverage` table */
  code: string;
  name: string;
  slug: string;
  /** "German", "US", "Emirati" — used in prose */
  adjective: string;
  /** What actually distinguishes this market for field services */
  marketNote: string;
  /** Mains supply and rack PDUs an engineer will meet on site */
  power: string;
  /** Cabling / data-centre design standards the build is signed off against */
  standards: string[];
  /** Regulatory frames the customer's auditors will ask about */
  compliance: string[];
  /** Site-access and safety regimes our engineers must satisfy */
  safety: string[];
  /** Languages our field engineers work in */
  languages: string[];
  /** Test regime and evidence format */
  testing: string;
  /** Escorting, vetting and permits */
  accessNote: string;
  /** Working-window reality */
  shiftNote: string;
  faqs: Array<{ q: string; a: string }>;
};

/**
 * The fifteen markets that get dedicated service landing pages.
 * Chosen on operator density and on where a mobilisation-time answer
 * actually changes a buying decision.
 */
export const REGIONAL_COUNTRY_CODES = [
  "PT",
  "DE",
  "NL",
  "GB",
  "IE",
  "FR",
  "ES",
  "CH",
  "IT",
  "SE",
  "PL",
  "US",
  "AE",
  "IN",
  "SG",
] as const;

export const COUNTRY_PROFILES: Record<string, CountryProfile> = {
  PT: {
    code: "PT",
    name: "Portugal",
    slug: "portugal",
    adjective: "Portuguese",
    marketNote:
      "Our home market. Lisbon is a subsea landing point for the transatlantic cables and a fast-growing edge and colocation location, which means short cable routes, tight access windows in older buildings and a genuine premium on engineers who can work in Portuguese with the building's own staff.",
    power: "230/400 V, 50 Hz. IEC 60320 C13 and C19 at the rack; Type F Schuko on auxiliary circuits.",
    standards: [
      "EN 50173 and EN 50174 for structured cabling design and installation practice",
      "EN 50600 for data-centre facility design, availability class and operational management",
      "IEC 61935-1 for installed cabling test results",
    ],
    compliance: [
      "EU GDPR, supervised locally by the CNPD",
      "NIS2 transposition for operators of essential and important services",
      "ANACOM rules where the connection touches public electronic communications networks",
    ],
    safety: [
      "Portuguese occupational safety law (Lei 102/2009 framework) and site-specific induction",
      "Written electrical permit and lockout/tagout before any work on live distribution",
    ],
    languages: ["Portuguese (native)", "English"],
    testing:
      "Copper certified to IEC 61935-1, fibre to IEC 61280-4-2 with OLTS and an OTDR trace for every link. Native XML plus a signed PDF per outlet.",
    accessNote:
      "Photo ID plus signed confidentiality undertaking is standard. Colocation facilities in Lisbon and Porto typically require 24 hours notice for escorted access; we hold standing access agreements with the main facilities.",
    shiftNote:
      "Lisbon and Porto hubs give same-day response inside Portugal. Change windows are usually overnight 22:00–06:00 WET to avoid tenant impact.",
    faqs: [
      {
        q: "Do your engineers work in Portuguese with our building staff?",
        a: "Yes. Portugal is our headquarters market and the default working language on site is Portuguese, with English used for the technical record and the handover pack.",
      },
      {
        q: "How quickly can you be on site in Lisbon or Porto?",
        a: "Four hours is our standard mobilisation target for mainland Portugal, from our Lisbon and Porto hubs. Emergency smart-hands calls are typically attended inside two hours in the Lisbon metro area.",
      },
      {
        q: "Can you handle subsea cable landing station work?",
        a: "We support landing-station operators with rack build-out, structured cabling and commissioning inside the station. Wet plant and jointing are outside our scope and we will say so rather than subcontract silently.",
      },
    ],
  },
  DE: {
    code: "DE",
    name: "Germany",
    slug: "germany",
    adjective: "German",
    marketNote:
      "Frankfurt is continental Europe's densest interconnection market, and German operators document everything. The commercial reality is that a field engineer who cannot produce a German-language test record and a signed Übergabeprotokoll is not useful, however fast they are.",
    power: "230/400 V, 50 Hz. IEC 60320 C13 and C19; CEE 16 A and 32 A for distribution and test loads.",
    standards: [
      "DIN EN 50173 and DIN EN 50174 — the normative reference, not a guideline",
      "DIN EN 50600 series, including 50600-4 for operational management",
      "IEC 61935-1 for installed cabling certification",
    ],
    compliance: [
      "BSI IT-Grundschutz where the customer is public sector or critical infrastructure",
      "TISAX for automotive and supply-chain customers",
      "NIS2 through the German implementation, plus KRITIS obligations for affected operators",
      "EU GDPR under Bundesdatenschutzgesetz",
    ],
    safety: [
      "DGUV Vorschrift 3 for electrical installations and equipment testing",
      "SiGeKo coordination and written Gefährdungsbeurteilung where construction work is involved",
      "SCC or equivalent safety certification for contract engineers on industrial sites",
    ],
    languages: ["German (native)", "English"],
    testing:
      "Certification to IEC 61935-1 with German-language reports. fibre links tested to IEC 61280-4-2 with OLTS and OTDR traces retained per link.",
    accessNote:
      "Personnel vetting is common in Frankfurt facilities. We provide named engineer lists in advance, photo ID on arrival and signed NDAs. Some operators require a Werkschutz escort for the full duration.",
    shiftNote:
      "Frankfurt, Berlin and Munich hubs give six-hour mobilisation. German operators frequently require written change approval (Änderungsantrag) before the window opens — allow two working days.",
    faqs: [
      {
        q: "Do you provide test documentation in German?",
        a: "Yes. Native XML test results plus a German-language PDF handover and Übergabeprotokoll. The record is written to be handed straight to an auditor.",
      },
      {
        q: "Can your engineers satisfy BSI or TISAX audits?",
        a: "Our engineers work to BSI IT-Grundschutz handling expectations and we can produce the personnel and process evidence a TISAX assessment asks for. We are not a certification body and will not claim to be.",
      },
      {
        q: "How do you handle DGUV V3 obligations?",
        a: "Electrical testing of equipment is a separate competence from our install scope. We can identify what needs testing and hand it to a qualified Prüftechniker, or work alongside yours.",
      },
    ],
  },
  NL: {
    code: "NL",
    name: "Netherlands",
    slug: "netherlands",
    adjective: "Dutch",
    marketNote:
      "Amsterdam remains one of Europe's top interconnection markets and the Dutch are unusually disciplined about energy and sustainability reporting. Expect operators to ask about the carbon intensity of your travel and whether your materials carry an EPD.",
    power: "230/400 V, 50 Hz. IEC 60320 C13 and C19; Type F on auxiliary circuits.",
    standards: [
      "NEN-EN 50173 and NEN-EN 50174 for cabling",
      "NEN-EN 50600 for facility design and operations",
      "NEN 1010 and NEN 3140 for low-voltage installation and safe operation",
    ],
    compliance: [
      "EU GDPR under the AVG, supervised by the Autoriteit Persoonsgegevens",
      "BIR/BIO where the customer is government or a government supplier",
      "CSRD sustainability reporting for in-scope operators",
    ],
    safety: [
      "VCA certification for contract staff on operator and industrial sites",
      "NEN 3140 competent-person rules for work on or near live electrical parts",
    ],
    languages: ["Dutch", "English (fluent, default on site)"],
    testing:
      "IEC 61935-1 certification with bilingual NL/EN reporting on request. Fibre tested to IEC 61280-4-2.",
    accessNote:
      "Amsterdam facilities are escort-heavy and camera-controlled. Named engineer lists 24 hours ahead is normal; some require a Dutch-language work permit for non-EU staff.",
    shiftNote:
      "Amsterdam and Rotterdam hubs give six-hour mobilisation. Overnight windows 23:00–05:00 CET are standard for tenant-impacting work.",
    faqs: [
      {
        q: "Are your engineers VCA certified?",
        a: "Engineers working on Dutch operator and industrial sites hold VCA-B or equivalent. We provide certificates before mobilisation rather than on request.",
      },
      {
        q: "Can you report on the carbon cost of a call-out?",
        a: "Yes. We record travel distance and mode per job and can report embodied and travel carbon per intervention, which supports CSRD and Scope 3 reporting.",
      },
      {
        q: "Do you work in Dutch with site staff?",
        a: "Yes where it matters. Technical work is commonly run in English in Amsterdam facilities, but our engineers can brief building staff and write incident notes in Dutch.",
      },
    ],
  },
  GB: {
    code: "GB",
    name: "United Kingdom",
    slug: "united-kingdom",
    adjective: "UK",
    marketNote:
      "London's Slough and Docklands clusters plus Manchester and Edinburgh give a mature colocation market. The distinctive constraint is the CDM regime: as soon as work is construction, principal-contractor duties and written method statements apply, and operators audit for them.",
    power: "230 V single-phase, 400 V three-phase, 50 Hz. IEC 60320 C13 and C19; BS 1363 on auxiliary circuits.",
    standards: [
      "BS EN 50173 and BS EN 50174 for cabling",
      "BS EN 50600 for facility design and operations",
      "BS 7671 (IET Wiring Regulations) for electrical installation",
      "TIA-942 where a US-headquartered customer imposes it",
    ],
    compliance: [
      "UK GDPR and the Data Protection Act 2018, supervised by the ICO",
      "NIS Regulations 2018 for operators of essential services",
      "FCA operational resilience rules for financial-services tenants",
    ],
    safety: [
      "CDM Regulations 2015 — principal contractor duties, RAMS, written method statements",
      "CSCS or ECS cards for site personnel",
      "Permit-to-work and lockout/tagout on live distribution",
    ],
    languages: ["English"],
    testing:
      "IEC 61935-1 certification, fibre to IEC 61280-4-2 with OTDR traces. Reports written for UK operator sign-off.",
    accessNote:
      "Photo ID, signed NDA and often a basic DBS check for sites with public-sector tenants. Slough and Docklands facilities typically need 24–48 hours notice for escorted access.",
    shiftNote:
      "London and Manchester hubs give six-hour mobilisation across England and Wales. Change advisory boards usually sit weekly, so submit early.",
    faqs: [
      {
        q: "Do you produce RAMS for CDM compliance?",
        a: "Yes. Every UK job ships with risk assessments and a written method statement, and we will work as principal contractor or as a contractor under your principal contractor, whichever the project structure requires.",
      },
      {
        q: "Are your engineers CSCS or ECS carded?",
        a: "Engineers working on construction-classified sites hold the appropriate ECS card. We provide card details in advance for site registration.",
      },
      {
        q: "Can you support FCA operational resilience requirements?",
        a: "We can supply the change records, test evidence and handover documentation that a financial-services tenant needs for its important business services evidence. We do not provide compliance advice.",
      },
    ],
  },
  IE: {
    code: "IE",
    name: "Ireland",
    slug: "ireland",
    adjective: "Irish",
    marketNote:
      "Dublin hosts an unusually high concentration of hyperscale capacity relative to population, and grid connection constraints mean operators care intensely about anything that reduces on-site rework. Fast right-first-time work is the commercial argument here.",
    power: "230/400 V, 50 Hz. IEC 60320 C13 and C19; Type G on auxiliary circuits.",
    standards: [
      "I.S. EN 50173 and I.S. EN 50174 for cabling",
      "I.S. EN 50600 for facility design and operations",
      "I.S. 10101 (ETCI National Rules for Electrical Installations) for electrical work",
    ],
    compliance: [
      "EU GDPR under the Data Protection Acts 1988–2018, supervised by the DPC",
      "NIS2 through the Irish implementation",
      "Central Bank of Ireland outsourcing rules for financial tenants",
    ],
    safety: [
      "Safe Pass card required for construction-classified sites",
      "Permit-to-work and lockout/tagout under the operator's electrical safety rules",
    ],
    languages: ["English"],
    testing:
      "IEC 61935-1 certification, fibre to IEC 61280-4-2. Full evidence pack retained for the operator's asset register.",
    accessNote:
      "Hyperscale campuses require advance named-engineer registration, photo ID and often a site-specific induction video completed before arrival. Allow 48 hours for first-time access.",
    shiftNote:
      "Dublin hub gives eight-hour mobilisation. Campus work frequently runs to a fixed window coordinated with the operator's change calendar.",
    faqs: [
      {
        q: "Can you work to hyperscale campus standards?",
        a: "Yes. Our teams work to written methods, photograph every stage and hand over evidence packs that a hyperscale operator can drop straight into its asset and change records.",
      },
      {
        q: "How long does first-time site registration take?",
        a: "Plan for 48 hours for a new campus. Once our engineers are registered, subsequent mobilisation is inside eight hours and emergency calls faster.",
      },
      {
        q: "Do you cover regional sites outside Dublin?",
        a: "Yes, from Dublin, with Cork and the west served by scheduled mobilisation rather than an on-call rota. We will give you a realistic attendance time rather than a headline number.",
      },
    ],
  },
  FR: {
    code: "FR",
    name: "France",
    slug: "france",
    adjective: "French",
    marketNote:
      "Paris is a top-five European interconnection market and Marseille is a major subsea landing point for routes into the Mediterranean, Africa and Asia. French operators expect French-language documentation and are strict about habilitation électrique.",
    power: "230/400 V, 50 Hz. IEC 60320 C13 and C19; Type E on auxiliary circuits.",
    standards: [
      "NF EN 50173 and NF EN 50174 for cabling",
      "NF EN 50600 for facility design and operations",
      "NF C 15-100 for low-voltage electrical installation",
    ],
    compliance: [
      "EU GDPR supervised by the CNIL",
      "HDS certification requirements where health data is hosted",
      "ANSSI guidance and SecNumCloud where the tenant is public sector",
      "NIS2 through the French implementation",
    ],
    safety: [
      "Habilitation électrique (B1V, B2V, BR, BC) matched to the work",
      "Plan de prévention for contractor intervention on an occupied site",
    ],
    languages: ["French (native)", "English"],
    testing:
      "IEC 61935-1 certification with French-language reporting. Fibre tested to IEC 61280-4-2 with OTDR traces per link.",
    accessNote:
      "Plan de prévention must be agreed before intervention on occupied sites. Photo ID and a signed engagement de confidentialité are standard.",
    shiftNote:
      "Paris and Marseille hubs give eight-hour mobilisation. French sites commonly close works in August — plan major projects around it.",
    faqs: [
      {
        q: "Do your engineers hold habilitation électrique?",
        a: "Yes, matched to the task — B1V or B2V for execution, BR for intervention, BC for consignation. Certificates are supplied before mobilisation.",
      },
      {
        q: "Is the documentation in French?",
        a: "Yes. Test results, handover notes and the procès-verbal de réception are produced in French, with an English version on request.",
      },
      {
        q: "Can you work on HDS-scoped infrastructure?",
        a: "We work to the handling and traceability controls an HDS-certified host requires, and we can sign the confidentiality and processing agreements. We do not hold HDS certification ourselves and will not imply it.",
      },
    ],
  },
  ES: {
    code: "ES",
    name: "Spain",
    slug: "spain",
    adjective: "Spanish",
    marketNote:
      "Madrid has become one of Europe's fastest-growing colocation markets, with Marseille–Madrid fibre routes and new subsea landings pulling capacity south. Spanish-language site crews are the norm outside hyperscale campuses.",
    power: "230/400 V, 50 Hz. IEC 60320 C13 and C19; Type F on auxiliary circuits.",
    standards: [
      "UNE-EN 50173 and UNE-EN 50174 for cabling",
      "UNE-EN 50600 for facility design and operations",
      "REBT (Reglamento Electrotécnico para Baja Tensión) for electrical installation",
    ],
    compliance: [
      "EU GDPR through the LOPDGDD, supervised by the AEPD",
      "ENS (Esquema Nacional de Seguridad) for public-sector tenants",
      "NIS2 through the Spanish implementation",
    ],
    safety: [
      "RD 1215/1997 and RD 614/2001 for equipment use and electrical risk",
      "Coordinación de actividades empresariales documentation before site entry",
    ],
    languages: ["Spanish (native)", "English", "Catalan where required"],
    testing:
      "IEC 61935-1 certification with Spanish-language reporting. Fibre tested to IEC 61280-4-2.",
    accessNote:
      "CAE documentation (coordinación de actividades empresariales) is routinely required before contractors enter Spanish sites. Allow time for the exchange.",
    shiftNote:
      "Madrid and Barcelona hubs give six-hour mobilisation on the peninsula. Balearic and Canary Islands work is scheduled, not on-call.",
    faqs: [
      {
        q: "Do you handle CAE documentation?",
        a: "Yes. We supply the coordination paperwork Spanish operators require before site entry, including risk assessment, training records and insurance certificates.",
      },
      {
        q: "Can you cover the Balearic or Canary Islands?",
        a: "Yes, as scheduled mobilisation from Madrid with travel planned in. We quote these as planned projects rather than emergency response, and we say so up front.",
      },
      {
        q: "Is on-site work done in Spanish?",
        a: "Yes. Outside the large hyperscale campuses in Madrid, Spanish is the working language, and our engineers brief site staff in Spanish.",
      },
    ],
  },
  CH: {
    code: "CH",
    name: "Switzerland",
    slug: "switzerland",
    adjective: "Swiss",
    marketNote:
      "Switzerland combines very high on-site cost with strict data-residency expectations, so operators optimise for getting it right in one visit. Canton-level language differences and bank-sector scrutiny shape how work is documented.",
    power: "230/400 V, 50 Hz. IEC 60320 C13 and C19; Type J (SEV 1011) on auxiliary circuits.",
    standards: [
      "SN EN 50173 and SN EN 50174 for cabling",
      "SN EN 50600 for facility design and operations",
      "NIN / ESTI requirements for low-voltage installation",
    ],
    compliance: [
      "nFADP (revised Federal Act on Data Protection) and Swiss data-residency expectations",
      "FINMA circulars on outsourcing for banks and insurers",
      "EU GDPR where Swiss operations touch EU personal data",
    ],
    safety: [
      "SUVA rules and EKAS directives for contractor safety",
      "Written permit for work on or near live electrical parts",
    ],
    languages: ["German", "French", "English", "Italian in Ticino"],
    testing:
      "IEC 61935-1 certification, fibre to IEC 61280-4-2. Reports delivered in the language of the canton or in English.",
    accessNote:
      "Banking-sector sites require named engineers, photo ID and often a background declaration. Plan 48 hours for first access.",
    shiftNote:
      "Zurich and Geneva hubs give ten-hour mobilisation. High labour cost makes planned multi-task visits more economical than repeated call-outs.",
    faqs: [
      {
        q: "Can you guarantee Swiss data residency?",
        a: "Our Swiss work is performed by engineers resident in Switzerland or the EU, and no customer data leaves the site. We do not operate a Swiss-registered entity, which matters if you require a purely domestic contractor.",
      },
      {
        q: "How do you keep cost down given Swiss rates?",
        a: "By batching. We combine rack build, cabling and commissioning into a single mobilisation and pre-stage materials, so you pay for one visit rather than three.",
      },
      {
        q: "Which languages do your engineers cover?",
        a: "German, French and English across Zurich and Geneva, with Italian available for Ticino. Tell us the site and we will staff to match.",
      },
    ],
  },
  IT: {
    code: "IT",
    name: "Italy",
    slug: "italy",
    adjective: "Italian",
    marketNote:
      "Milan is Italy's interconnection hub and the landing point for several Mediterranean routes. Italian sites are documentation-heavy and the DURC requirement is a hard gate before any contractor sets foot on site.",
    power: "230/400 V, 50 Hz. IEC 60320 C13 and C19; Type L (CEI 23-50) and Type F on auxiliary circuits.",
    standards: [
      "CEI EN 50173 and CEI EN 50174 for cabling",
      "CEI EN 50600 for facility design and operations",
      "CEI 64-8 for low-voltage electrical installation",
    ],
    compliance: [
      "EU GDPR supervised by the Garante per la protezione dei dati personali",
      "Perimetro di sicurezza nazionale cibernetica for strategic operators",
      "AGID requirements for public-sector and cloud tenants",
    ],
    safety: [
      "D.Lgs 81/2008 — DUVRI and PSC where construction-classified work applies",
      "PES/PAV electrical competence qualifications under CEI 11-27",
    ],
    languages: ["Italian (native)", "English"],
    testing:
      "IEC 61935-1 certification with Italian-language reporting, fibre to IEC 61280-4-2.",
    accessNote:
      "DURC (regolarità contributiva) must be valid and exchanged before site entry, along with the DUVRI. This is non-negotiable on Italian sites and takes time on first engagement.",
    shiftNote:
      "Milan hub gives ten-hour mobilisation across the north. Central and southern Italy are served by planned mobilisation.",
    faqs: [
      {
        q: "Do you provide DURC and DUVRI documentation?",
        a: "We provide the contribution-regularity documentation and cooperate fully on the DUVRI. For non-Italian entities the paperwork differs, so we are explicit about which route applies before you commit.",
      },
      {
        q: "Are your engineers qualified under CEI 11-27?",
        a: "Electrical competence is held at PES or PAV level as the work requires, and certificates are supplied before mobilisation.",
      },
      {
        q: "Is documentation delivered in Italian?",
        a: "Yes — test results, handover and the verbale di collaudo are produced in Italian, with English on request.",
      },
    ],
  },
  SE: {
    code: "SE",
    name: "Sweden",
    slug: "sweden",
    adjective: "Swedish",
    marketNote:
      "The Nordics win on low-carbon power and cool climates, and Swedish operators are early adopters of energy and emissions reporting. Expect questions about travel carbon, material EPDs and whether your work supports their CSRD disclosures.",
    power: "230/400 V, 50 Hz. IEC 60320 C13 and C19; Type F on auxiliary circuits.",
    standards: [
      "SS-EN 50173 and SS-EN 50174 for cabling",
      "SS-EN 50600 for facility design and operations",
      "SS 437 01 40 (Elsäkerhetsverket regulations) for electrical installation",
    ],
    compliance: [
      "EU GDPR supervised by IMY",
      "NIS2 through the Swedish implementation",
      "CSRD sustainability reporting for in-scope operators",
    ],
    safety: [
      "Arbetsmiljöverket requirements and site-specific risk assessment",
      "Elsäkerhetsverket competence rules for work on electrical installations",
    ],
    languages: ["Swedish", "English (default on site)"],
    testing:
      "IEC 61935-1 certification, fibre to IEC 61280-4-2, with travel and material carbon recorded per job.",
    accessNote:
      "Swedish facilities are generally efficient about access with 24 hours notice and photo ID. Some require a signed personuppgiftsbiträdesavtal where personal data could be touched.",
    shiftNote:
      "Stockholm hub gives fourteen-hour mobilisation. Gothenburg and Malmö are served by scheduled mobilisation from Stockholm or Copenhagen.",
    faqs: [
      {
        q: "Can you report the carbon footprint of your interventions?",
        a: "Yes. We log distance, mode and materials per job and can report travel and embodied carbon, which supports your Scope 3 and CSRD disclosures.",
      },
      {
        q: "Do you work in Swedish?",
        a: "Our engineers work in English by default in Stockholm facilities and can brief site staff in Swedish where needed. Full Swedish-language documentation is available on request.",
      },
      {
        q: "How do you cover sites outside Stockholm?",
        a: "Gothenburg and Malmö are served by planned mobilisation, often combined with the Copenhagen hub to cut travel. We will give you an honest attendance time per site.",
      },
    ],
  },
  PL: {
    code: "PL",
    name: "Poland",
    slug: "poland",
    adjective: "Polish",
    marketNote:
      "Warsaw has become central Europe's growth market, with hyperscale investment and strong engineering depth. Cost efficiency matters, but so does NIS2 readiness — Polish operators are actively closing gaps rather than just documenting them.",
    power: "230/400 V, 50 Hz. IEC 60320 C13 and C19; Type E on auxiliary circuits.",
    standards: [
      "PN-EN 50173 and PN-EN 50174 for cabling",
      "PN-EN 50600 for facility design and operations",
      "N SEP-E-001 and HD 60364 for electrical installation",
    ],
    compliance: [
      "EU GDPR under the national implementation, supervised by UODO",
      "KSC (Krajowe Ramy Cyberbezpieczeństwa) and NIS2 for essential services",
      "KNF requirements for financial-sector tenants",
    ],
    safety: [
      "SEP E/D qualifications (eksploatacja / dozór) for electrical work",
      "Written permit and lockout/tagout on live distribution",
    ],
    languages: ["Polish (native)", "English"],
    testing:
      "IEC 61935-1 certification with Polish or English reporting, fibre to IEC 61280-4-2.",
    accessNote:
      "Warsaw facilities typically need 24 hours notice and photo ID. Personnel clearance may be required for sites with government tenants.",
    shiftNote:
      "Warsaw hub gives twelve-hour mobilisation. Kraków, Wrocław and Poznań are served by scheduled mobilisation from Warsaw.",
    faqs: [
      {
        q: "Can you support NIS2 readiness work?",
        a: "We supply the technical implementation and evidence — asset records, test results, as-built documentation — that a NIS2 gap remediation needs. We do not provide legal or compliance advice.",
      },
      {
        q: "Are your engineers SEP qualified?",
        a: "Yes, holding E and D group qualifications appropriate to the voltage and the work. Certificates are provided before mobilisation.",
      },
      {
        q: "How do you cover cities outside Warsaw?",
        a: "By planned mobilisation from Warsaw, usually batching several tasks into one visit. Emergency response outside Warsaw is possible but slower, and we quote it honestly.",
      },
    ],
  },
  US: {
    code: "US",
    name: "United States",
    slug: "united-states",
    adjective: "US",
    marketNote:
      "Northern Virginia alone holds more data-centre capacity than most countries, and the standards stack is different from Europe — TIA rather than EN, NFPA 70E arc-flash rules, and union labour considerations in several markets. An engineer arriving with European assumptions will fail a sign-off.",
    power: "120/208 V, 60 Hz. IEC 60320 C13 and C19 at the rack; NEMA 5-15, L5-30, L6-30 and L21-30 on distribution.",
    standards: [
      "ANSI/TIA-568.2-D and 568.3-D for copper and fibre cabling",
      "ANSI/TIA-569 for pathways and spaces, TIA-606 for administration and labelling",
      "ANSI/TIA-942 for data-centre infrastructure tiering",
      "BICSI TDMM as the installation reference",
    ],
    compliance: [
      "SOC 2 Type II for service organisations",
      "HIPAA where protected health information is in scope",
      "FedRAMP and CMMC where federal workloads are involved",
      "State privacy laws, including CCPA/CPRA in California",
    ],
    safety: [
      "NFPA 70E arc-flash risk assessment and PPE category for energised work",
      "OSHA 10 or 30 hour training, plus site-specific orientation",
      "Lockout/tagout under OSHA 29 CFR 1910.147",
    ],
    languages: ["English", "Spanish where required"],
    testing:
      "Certification to TIA-1152 (Level IV / IVe) for copper, fibre to TIA-526-14 with OLTS and OTDR traces. Native results plus PDF per link.",
    accessNote:
      "Ashburn and other major markets require photo ID, background screening and often a badging appointment days in advance. Union jurisdiction applies to some electrical work in certain metros.",
    shiftNote:
      "Hubs in Ashburn VA, Chicago, Dallas and the Bay Area give 24-hour mobilisation. Coast-to-coast work is scheduled rather than on-call.",
    faqs: [
      {
        q: "Do you certify to TIA-1152 rather than IEC 61935?",
        a: "Yes. US projects are certified to TIA-1152 Level IV or IVe, with fibre tested to TIA-526-14. We can additionally supply IEC 61935 results where a European parent company requires them.",
      },
      {
        q: "Are your engineers NFPA 70E and OSHA trained?",
        a: "Engineers working on or near energised equipment hold current NFPA 70E training and OSHA 10 or 30 cards, and we follow the site's arc-flash boundary and PPE category rules.",
      },
      {
        q: "How do you handle union jurisdictions?",
        a: "We identify union jurisdiction at scoping and either work within it or flag it before you commit. Discovering it on site is expensive for everyone.",
      },
    ],
  },
  AE: {
    code: "AE",
    name: "United Arab Emirates",
    slug: "united-arab-emirates",
    adjective: "Emirati",
    marketNote:
      "Dubai and Abu Dhabi are building capacity fast, and the operating environment is distinctive: high ambient temperatures that stress both equipment and crews, free-zone regulatory patchwork, and DESC information-assurance requirements for Dubai entities.",
    power: "230/400 V, 50 Hz. IEC 60320 C13 and C19; Type G (BS 1363) on auxiliary circuits.",
    standards: [
      "EN 50173 and EN 50174, commonly specified alongside TIA-568",
      "TIA-942 tier ratings frequently used by developers and tenants",
      "UAE.S / DEWA requirements for electrical installation in Dubai",
    ],
    compliance: [
      "UAE Federal Decree-Law 45 of 2021 on personal data protection",
      "DESC Information Assurance Regulation for Dubai government and regulated entities",
      "DIFC and ADGM data protection regimes inside the free zones",
    ],
    safety: [
      "Site-specific HSE induction and permit-to-work, often to a developer's own standard",
      "Heat-stress management for work in non-conditioned plant rooms",
    ],
    languages: ["English", "Arabic", "Hindi and Urdu commonly available"],
    testing:
      "TIA-1152 or IEC 61935-1 certification depending on the specification, fibre to TIA-526-14 or IEC 61280-4-2. Reports in English.",
    accessNote:
      "Free-zone sites have their own access regimes and often require a work permit plus an escort. Allow 48–72 hours for first-time access.",
    shiftNote:
      "Dubai hub gives 28-hour mobilisation. Summer plant-room work is scheduled outside peak heat where the cooling envelope allows.",
    faqs: [
      {
        q: "Do you work inside the DIFC or ADGM free zones?",
        a: "Yes, subject to the zone's own access and permit rules. Free-zone data-protection regimes differ from onshore UAE law and we follow the regime that applies to the site.",
      },
      {
        q: "How do you handle high ambient temperatures?",
        a: "By scheduling, hydration and rotation for the crew, and by verifying that equipment is rated for the actual plant-room conditions rather than the datasheet nominal.",
      },
      {
        q: "Which standards do you certify against?",
        a: "Whichever the specification names — TIA-568 and TIA-1152 on developer-led projects, EN 50173 and IEC 61935 on European-operator projects. We confirm this at scoping so sign-off is not a surprise.",
      },
    ],
  },
  IN: {
    code: "IN",
    name: "India",
    slug: "india",
    adjective: "Indian",
    marketNote:
      "India is adding capacity faster than almost any market, across Mumbai, Delhi NCR, Bengaluru, Chennai and Hyderabad. The practical differentiators are BIS-compliant materials, sector regulators with their own rules, and the sheer scale of campus builds.",
    power: "230/415 V, 50 Hz. IEC 60320 C13 and C19; Type D and Type M on auxiliary circuits.",
    standards: [
      "IS/ISO/IEC 11801 and IS 16605 for cabling, alongside EN or TIA specifications from the client",
      "TIA-942 tier ratings widely referenced by developers",
      "IS 732 and NBC 2016 Part 8 for electrical installation",
    ],
    compliance: [
      "DPDP Act 2023 and rules for personal data processing",
      "RBI outsourcing and IT-governance directions for banks and NBFCs",
      "IRDAI and SEBI guidance for insurance and capital-markets tenants",
      "MeitY empanelled-auditor requirements for CERT-In directions",
    ],
    safety: [
      "Factory Act and site-specific permit-to-work regimes",
      "Electrical work by licensed personnel under the state electricity rules",
    ],
    languages: ["English", "Hindi", "Tamil, Telugu, Marathi and Kannada by location"],
    testing:
      "IEC 61935-1 or TIA-1152 certification to match the specification, fibre to IEC 61280-4-2 with OTDR traces. English reporting.",
    accessNote:
      "Campus access requires photo ID and advance registration, sometimes with police verification for long-term personnel. Allow 48 hours for first-time access.",
    shiftNote:
      "Mumbai, Bengaluru, Chennai, Hyderabad and Delhi NCR hubs give 24-hour mobilisation in those metros. Tier-2 cities are served by scheduled mobilisation.",
    faqs: [
      {
        q: "Do you use BIS-compliant materials?",
        a: "Yes. Cables, cords and accessories are BIS-marked where the standard applies, and we supply the conformity documentation with the handover pack.",
      },
      {
        q: "Can you support RBI or IRDAI-regulated tenants?",
        a: "We provide the change records, test evidence and asset documentation those regulators expect from a service provider. We do not provide regulatory advice.",
      },
      {
        q: "How do you handle large campus builds?",
        a: "With a fixed team and a phased plan, so knowledge stays on site and quality does not drift across phases. We size crews per phase and report daily.",
      },
    ],
  },
  SG: {
    code: "SG",
    name: "Singapore",
    slug: "singapore",
    adjective: "Singapore",
    marketNote:
      "Singapore is dense, tropical and tightly regulated, with a moratorium-era legacy of efficiency requirements — PUE targets, Green Mark certification and MAS technology-risk expectations for financial tenants. Space is expensive, so build precision matters more than usual.",
    power: "230/400 V, 50 Hz. IEC 60320 C13 and C19; Type G (BS 1363) on auxiliary circuits.",
    standards: [
      "SS 561 and SS 482 for structured cabling, commonly specified with EN 50173 or TIA-568",
      "TIA-942 tier ratings used by most developers",
      "SS 638 and EMA requirements for electrical installation",
    ],
    compliance: [
      "PDPA 2012 for personal data protection",
      "MAS Technology Risk Management Guidelines for financial institutions",
      "IMDA and BCA Green Mark requirements for data-centre efficiency",
    ],
    safety: [
      "WSH Act requirements, bizSAFE certification and site-specific induction",
      "Permit-to-work for energised and working-at-height tasks",
    ],
    languages: ["English", "Mandarin and Malay commonly available"],
    testing:
      "TIA-1152 or IEC 61935-1 certification per specification, fibre to IEC 61280-4-2. English reporting with OTDR traces retained.",
    accessNote:
      "Singapore facilities are strict and well-run: photo ID, advance registration and escort are standard. Allow 24–48 hours for first access.",
    shiftNote:
      "Singapore hub gives 30-hour mobilisation, and the country's compact size means once on the island, travel between sites is short.",
    faqs: [
      {
        q: "Can you work to Green Mark and PUE requirements?",
        a: "We build to the airflow and containment discipline those schemes assume — proper blanking, correct cable routing and no obstruction of cold aisles — and we document it for your submission.",
      },
      {
        q: "Do you support MAS TRM expectations?",
        a: "We provide the change management records, test evidence and handover documentation a financial institution needs for its TRM evidence. We do not provide compliance advice.",
      },
      {
        q: "How do you handle high humidity?",
        a: "By controlling fibre handling and connector cleanliness rigorously, verifying equipment ratings against actual conditions, and scheduling work so open racks are not left exposed in plant rooms.",
      },
    ],
  },
};

export function getCountryProfile(code: string): CountryProfile | null {
  return COUNTRY_PROFILES[code] ?? null;
}

export function regionalCountrySlugs(): Array<{ code: string; slug: string; name: string }> {
  return REGIONAL_COUNTRY_CODES.map((code) => {
    const p = COUNTRY_PROFILES[code];
    return { code, slug: p.slug, name: p.name };
  });
}

/** URL segment for a country — the readable slug, e.g. `united-kingdom`. */
export function regionalSlug(code: string): string {
  return COUNTRY_PROFILES[code]?.slug ?? code.toLowerCase();
}

/** Reverse lookup used by the dynamic routes. */
export function regionalCode(slug: string): string | null {
  const hit = REGIONAL_COUNTRY_CODES.find((c) => COUNTRY_PROFILES[c].slug === slug);
  return hit ?? null;
}
