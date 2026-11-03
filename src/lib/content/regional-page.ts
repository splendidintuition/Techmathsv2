import type { CoverageCountry, Faq, Service } from "@/lib/types";
import {
  COUNTRY_PROFILES,
  REGIONAL_COUNTRY_CODES,
  type CountryProfile,
} from "@/lib/content/regional";

/**
 * Regional landing pages: `/services/[slug]/[country]`.
 *
 * These are not templated doorways. Every page is composed from three real
 * data sources — the service record, the country's regulatory/standards
 * profile, and the live coverage record (hubs + mobilisation hours) — so the
 * standards a German page cites differ from the ones a US page cites, because
 * they genuinely do.
 */

export type RegionalFact = { label: string; value: string };

export type RegionalSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type RegionalPage = {
  service: Service;
  country: CountryProfile;
  coverage: CoverageCountry;
  path: string;
  servicePath: string;
  coveragePath: string;
  title: string;
  description: string;
  headline: string;
  lede: string;
  facts: RegionalFact[];
  market: RegionalSection;
  standards: RegionalSection;
  delivery: RegionalSection;
  localFaqs: Faq[];
  faqSchema: Faq[];
  otherCountries: Array<{ slug: string; name: string; code: string }>;
  canonical: string;
};

/* ------------------------------------------- service-specific regional angle */

type Angle = (c: CountryProfile, cov: CoverageCountry) => { paragraph: string; bullets: string[] };

const angles: Record<string, Angle> = {
  "rack-and-stack": (c, cov) => ({
    paragraph: `Rack build-out in ${c.name} is measured against ${c.standards[0].split(" for ")[0]}, and the detail that decides a sign-off is usually mechanical: rack orientation against the containment envelope, correct blanking, and cable entry that does not fight the airflow. Our teams work to ${cov.mobiliseHours}-hour mobilisation from ${cov.hubs[0]}.`,
    bullets: [
      `Rack positioning and levelling verified against the facility's containment layout before any equipment is unpacked`,
      `Blanking panels fitted to every unused U — a routine omission that measurably raises inlet temperature in ${c.name}'s higher-density halls`,
      `Cable entry from overhead tray or underfloor, matched to the facility's own routing convention rather than imposed on it`,
      `PDU mounting and phase balance recorded per rack, with ${c.power.split(".")[0]} feeds confirmed before power-on`,
      `Weight and seismic/floor-loading checks where the facility specifies them`,
    ],
  }),

  "structured-cabling": (c) => ({
    paragraph: `This is where regional standards bite hardest. ${c.name} specifies against ${c.standards.filter((s) => /cabling/i.test(s)).join(", ") || c.standards[0]}, and the test regime that proves compliance is ${c.testing.split(" with ")[0].split(", with")[0]}. Installing to the wrong family produces a plant that works and still fails sign-off.`,
    bullets: [
      `Design and installation practice per ${c.standards.filter((s) => /50173|568|11801|561|16605/i.test(s)).join(" and ") || c.standards[0]}`,
      `Pathways, spaces and separation distances maintained to the applicable standard, not to habit`,
      `Administration and labelling scheme agreed before the first cable is pulled, so the register is right from the start`,
      `Certification testing on every link — no sampling — with native results and a signed report per outlet`,
      `Fibre cleaned, inspected and re-inspected before mating, with end-face images retained for contentious links`,
    ],
  }),

  "server-installation": (c) => ({
    paragraph: `Server deployment in ${c.name} starts with confirming the physical and electrical reality: ${c.power} at the rack, rail kits matched to the enclosure, and weight distribution planned across the rack rather than discovered mid-build. Equipment is unpacked, inspected and staged before it goes in.`,
    bullets: [
      `Rail kits fitted to manufacturer specification, with cable management arms only where the aisle depth allows`,
      `Weight distributed per the facility's loading limit, with heaviest equipment at or below the specified U`,
      `Power cords dressed to the correct side of the rack and connected to the intended A/B feeds`,
      `Asset tags and serial capture at install, not reconstructed afterwards from a spreadsheet`,
      `Damaged-on-arrival units photographed, quarantined and reported the same day`,
    ],
  }),

  "os-application-installation": (c) => ({
    paragraph: `OS and application build in ${c.name} is run to a written image and a documented baseline, so the ten-thousandth server is identical to the first. Where a customer's own hardening standard applies — and regulated operators in ${c.name} usually have one — we build to it and record the deviations rather than silently resolving them.`,
    bullets: [
      `Build to the customer's approved image or a documented baseline agreed at scoping`,
      `Firmware, driver and BIOS/UEFI settings captured and applied consistently, with versions recorded`,
      `Hardening applied to the customer's standard; deviations listed explicitly in the handover`,
      `Network configuration, VLAN membership and routing verified against the design before handover`,
      `Compliance and sector guidance relevant to ${c.name} referenced where the customer requires evidence of it`,
    ],
  }),

  "network-connection": (c) => ({
    paragraph: `Interconnection work in ${c.name} is usually cross-connects, meet-me rooms and carrier hand-offs, where the failure mode is not a bad link but a wrong demarcation. We confirm the demarc, the media type and the carrier's own requirements before cutting anything.`,
    bullets: [
      `Cross-connect routes confirmed against the facility's meet-me-room records before the cable is pulled`,
      `Media and connector type verified end to end — single-mode vs multimode, and polish type — before the hand-off`,
      `Carrier demarcation documented and photographed so responsibility is unambiguous`,
      `Labelling to the facility's administration scheme, not a private convention`,
      `Link tested and the result attached to the cross-connect record, so a fault later is quick to isolate`,
    ],
  }),

  "commissioning-testing": (c) => ({
    paragraph: `Commissioning in ${c.name} produces the evidence pack that closes the project: ${c.testing.split(" Native")[0].split(" with German")[0]} Every test is traceable to a link, an outlet or a rack, because an aggregate pass rate is not something an auditor can use.`,
    bullets: [
      `Test plan agreed in advance, naming the standard, the limits and the pass criteria`,
      `Copper and fibre certification on 100% of links, with failures re-terminated and re-tested`,
      `Native test files delivered alongside the human-readable report, so results can be re-verified independently`,
      `Power-on and functional checks recorded per rack, including failover where it is in scope`,
      `Punch list closed out and re-tested before the handover is signed`,
    ],
  }),

  "remote-smart-hands": (c, cov) => ({
    paragraph: `Remote hands in ${c.name} is a response-time business. From ${cov.hubs.join(", ")} we target ${cov.mobiliseHours}-hour mobilisation, and the value is in doing the right thing first time rather than closing the ticket fast. Every intervention is photographed and reported back the same shift.`,
    bullets: [
      `Named engineer with site access, not an on-call pool discovering the facility on arrival`,
      `Photo evidence before and after every intervention, attached to your ticket`,
      `Console access, reboots, media swaps and cable moves performed to written instruction`,
      `Escalation path agreed in advance, with a named contact and a defined decision threshold`,
      `Intervention logged against your asset record, not only against ours`,
    ],
  }),

  "decommissioning-migration": (c) => ({
    paragraph: `Decommissioning in ${c.name} carries a data-handling obligation as well as a physical one, and ${c.compliance[0].split(" under")[0].split(" supervised")[0]} sets the expectation. Media is accounted for unit by unit from removal to the certificate, with no unrecorded steps in between.`,
    bullets: [
      `Serial-level inventory captured at removal and reconciled at destination`,
      `Data sanitisation to the customer's standard, with certificates issued per device`,
      `Chain of custody documented for every movement, including intermediate storage`,
      `Racks, trays and cabling removed and the space left in an agreed condition`,
      `Waste streams handled by licensed contractors with transfer documentation retained`,
    ],
  }),

  "maintenance-field-support": (c) => ({
    paragraph: `Scheduled support in ${c.name} is priced and staffed as a rota, not as ad-hoc call-outs, because the cost difference is large and the quality difference is larger. ${c.shiftNote}`,
    bullets: [
      `Agreed rota with named engineers who already hold site access and know the plant`,
      `Planned maintenance batched to reduce visits, travel and disruption`,
      `Visual and thermal inspection with findings logged against the asset record`,
      `Spares and consumables staged on site where the contract specifies it`,
      `Reporting per visit, with trends surfaced rather than buried in tickets`,
    ],
  }),
};

/* ------------------------------------------------------------------ builder */

function factsFor(c: CountryProfile, cov: CoverageCountry): RegionalFact[] {
  return [
    { label: "Mobilisation", value: `${cov.mobiliseHours} hours` },
    { label: "Hubs", value: cov.hubs.join(" · ") },
    { label: "Region", value: cov.region },
    { label: "Mains supply", value: c.power.split(".")[0].trim() },
    { label: "On-site languages", value: c.languages.slice(0, 2).join(", ") },
    { label: "Local entity", value: cov.hq ? "Headquarters — Lisbon" : "Field hubs and partners" },
  ];
}

export function buildRegionalPage(
  service: Service,
  coverage: CoverageCountry,
): RegionalPage | null {
  const country = COUNTRY_PROFILES[coverage.code];
  if (!country) return null;

  const angle = angles[service.slug];
  if (!angle) return null;
  const a = angle(country, coverage);

  const path = `/services/${service.slug}/${country.slug}`;
  const servicePath = `/services/${service.slug}`;

  /** No brand suffix here: SITE_METADATA's title template appends " — Tech Maths". */
  const title = `${service.title} in ${country.name}`;

  const description =
    `${service.title} in ${country.name}. ${coverage.mobiliseHours}-hour mobilisation from ` +
    `${coverage.hubs[0]}, work to ${shortStandard(country)}, certified testing on every link.`;

  const headline = `${service.title} in ${country.name}`;

  const lede =
    `${service.short} delivered in ${country.name} by engineers who work to the standards, ` +
    `safety regime and documentation expectations of this market. Mobilisation from ` +
    `${coverage.hubs[0]} in ${coverage.mobiliseHours} hours. ${country.marketNote}`;

  const market: RegionalSection = {
    heading: `The ${country.name} market`,
    paragraphs: [
      country.marketNote,
      `We mobilise from ${coverage.hubs.join(" and ")} with a target of ${coverage.mobiliseHours} hours ` +
        `to site. ${country.shiftNote}`,
    ],
  };

  const standards: RegionalSection = {
    heading: `Standards and compliance in ${country.name}`,
    paragraphs: [
      `Work is signed off against the standards that actually apply here, not the ones our engineers ` +
        `are most familiar with. In ${country.name} that means ${country.standards[0].split(" for ")[0]} ` +
        `as the primary reference, with ${testRegime(country).toLowerCase()} as the test regime.`,
      `Site safety runs under ${country.safety[0].split(" for ")[0].split(" matched")[0]}. ` +
        `We supply certificates before mobilisation rather than on request.`,
    ],
    bullets: country.standards.concat(country.compliance).map((s) => s),
  };

  const delivery: RegionalSection = {
    heading: `How we deliver ${service.title.toLowerCase()} here`,
    paragraphs: [a.paragraph],
    bullets: a.bullets,
  };

  const localFaqs: Faq[] = country.faqs;

  const faqSchema: Faq[] = [
    {
      q: `How quickly can Tech Maths be on site in ${country.name}?`,
      a: `Our target mobilisation time for ${country.name} is ${coverage.mobiliseHours} hours from our ` +
        `${coverage.hubs.join(" and ")} hub${coverage.hubs.length > 1 ? "s" : ""}. Emergency attendance can be ` +
        `faster in the immediate metro area, and we will confirm the realistic time for your specific site at scoping.`,
    },
    {
      q: `Which standards do you work to in ${country.name}?`,
      a: `Primarily ${country.standards[0].split(" for ")[0]}, with ${country.standards
        .slice(1, 3)
        .map((s) => s.split(" for ")[0].split(",")[0].trim())
        .join(" and ")} as applicable. ` +
        `Testing is performed to ${testRegime(country)}.`,
    },
    ...localFaqs,
  ];

  const otherCountries = REGIONAL_COUNTRY_CODES.filter((code) => code !== coverage.code)
    .map((code) => ({
      code,
      slug: COUNTRY_PROFILES[code].slug,
      name: COUNTRY_PROFILES[code].name,
    }))
    .slice(0, 8);

  return {
    service,
    country,
    coverage,
    path,
    servicePath,
    coveragePath: "/coverage",
    title,
    description,
    headline,
    lede,
    facts: factsFor(country, coverage),
    market,
    standards,
    delivery,
    localFaqs,
    faqSchema,
    otherCountries,
    canonical: path,
  };
}

/** Shortest honest form of the primary standard, for use inside a meta description. */
function shortStandard(c: CountryProfile): string {
  return c.standards[0].split(" for ")[0].split(" — ")[0].split(" and ")[0].split(",")[0].trim();
}

/** The test regime in one clause, e.g. "Certification to IEC 61935-1". */
function testRegime(c: CountryProfile): string {
  return c.testing.split(" with ")[0].split(",")[0].split(".")[0].trim();
}

export function isRegionalCountryCode(code: string): boolean {
  return (REGIONAL_COUNTRY_CODES as readonly string[]).includes(code);
}
