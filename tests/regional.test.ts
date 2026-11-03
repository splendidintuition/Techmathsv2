import { describe, expect, it } from "vitest";
import {
  COUNTRY_PROFILES,
  REGIONAL_COUNTRY_CODES,
  getCountryProfile,
  regionalCode,
  regionalSlug,
} from "@/lib/content/regional";
import { buildRegionalPage } from "@/lib/content/regional-page";
import { listCoverage, listServices } from "@/lib/queries";

/**
 * Regional landing pages are generated, so the tests assert on the generator
 * rather than on hand-written copy: every combination must exist, be complete,
 * and be specific to the market it claims to describe.
 */

const services = listServices();
const regional = listCoverage().filter((c) =>
  (REGIONAL_COUNTRY_CODES as readonly string[]).includes(c.code)
);

describe("regional country set", () => {
  it("covers fifteen markets", () => {
    expect(REGIONAL_COUNTRY_CODES).toHaveLength(15);
    expect(regional).toHaveLength(15);
  });

  it("every listed code resolves to both a profile and a coverage record", () => {
    for (const code of REGIONAL_COUNTRY_CODES) {
      expect(getCountryProfile(code), `profile for ${code}`).not.toBeNull();
      expect(
        regional.find((c) => c.code === code),
        `coverage record for ${code}`
      ).toBeTruthy();
    }
  });

  it("every profile is fully populated", () => {
    for (const code of REGIONAL_COUNTRY_CODES) {
      const p = COUNTRY_PROFILES[code];
      expect(p.name.length).toBeGreaterThan(2);
      expect(p.slug).toMatch(/^[a-z-]+$/);
      expect(p.standards.length).toBeGreaterThanOrEqual(3);
      expect(p.compliance.length).toBeGreaterThanOrEqual(2);
      expect(p.safety.length).toBeGreaterThanOrEqual(2);
      expect(p.languages.length).toBeGreaterThanOrEqual(1);
      expect(p.faqs).toHaveLength(3);
      for (const f of p.faqs) {
        expect(f.q.length).toBeGreaterThan(15);
        expect(f.a.length).toBeGreaterThan(40);
      }
    }
  });

  it("returns null for a country with no profile", () => {
    const br = listCoverage().find((c) => c.code === "BR");
    expect(getCountryProfile("BR")).toBeNull();
    if (br) expect(buildRegionalPage(services[0], br)).toBeNull();
  });
});

describe("regional page generation", () => {
  const pages = services.flatMap((s) =>
    regional.map((c) => ({ s, c, p: buildRegionalPage(s, c) }))
  );

  it("generates a page for all 135 service x country combinations", () => {
    expect(services).toHaveLength(9);
    expect(pages).toHaveLength(135);
    for (const { p, s, c } of pages) {
      expect(p, `${s.slug} / ${c.code}`).not.toBeNull();
    }
  });

  it("builds the documented URL shape", () => {
    const p = pages[0].p!;
    expect(p.path).toBe(`/services/${pages[0].s.slug}/${regionalSlug(pages[0].c.code)}`);
    expect(p.servicePath).toBe(`/services/${pages[0].s.slug}`);
  });

  /**
   * Regression: the page used to build its canonical path from the country slug
   * while generateStaticParams and every link used the ISO code, so the cross
   * links pointed at routes that did not exist.
   */
  it("keeps the route param and the generated path in agreement", () => {
    for (const { s, c, p } of pages) {
      const param = regionalSlug(c.code);
      expect(p!.path).toBe(`/services/${s.slug}/${param}`);
      expect(regionalCode(param)).toBe(c.code);
      for (const other of p!.otherCountries) {
        expect(regionalCode(other.slug)).toBe(other.code);
        expect(other.slug).toBe(regionalSlug(other.code));
      }
    }
    for (const code of REGIONAL_COUNTRY_CODES) {
      expect(regionalCode(regionalSlug(code))).toBe(code);
    }
  });

  /**
   * SITE_METADATA applies the template "%s — Tech Maths", so the rendered
   * <title> is the page title plus that suffix. Measure the rendered string:
   * an earlier version asserted on the base title and shipped 79-char titles.
   */
  it("keeps rendered titles within the 70-character SEO budget", () => {
    const SUFFIX = " — Tech Maths";
    const rendered = pages.map(({ p }) => p!.title + SUFFIX);
    const tooLong = rendered.filter((t) => t.length > 70);
    expect(tooLong, "titles over 70 chars").toEqual([]);
    expect(rendered.every((t) => t.length >= 25)).toBe(true);
    expect(pages.every(({ p }) => !p!.title.includes("Tech Maths"))).toBe(true);
  });

  /** Google truncates around 155-160 characters; the observed range is 109-145. */
  it("writes meta descriptions inside the 100-160 character window", () => {
    const out = pages.filter(({ p }) => p!.description.length < 100 || p!.description.length > 160);
    expect(out.map(({ p }) => `${p!.description} (${p!.description.length})`)).toEqual([]);
    expect(pages.every(({ p }) => p!.description.endsWith("."))).toBe(true);
  });

  it("renders no template artefacts anywhere in the composed copy", () => {
    const blob = pages
      .flatMap(({ p }) => [
        p!.title,
        p!.description,
        p!.headline,
        p!.lede,
        ...p!.market.paragraphs,
        ...p!.standards.paragraphs,
        ...(p!.standards.bullets ?? []),
        ...p!.delivery.paragraphs,
        ...(p!.delivery.bullets ?? []),
        ...p!.facts.map((f) => `${f.label} ${f.value}`),
        ...p!.faqSchema.flatMap((f) => [f.q, f.a]),
      ])
      .join("\n");

    expect(blob).not.toContain("undefined");
    expect(blob).not.toContain("${");
    expect(blob).not.toContain("NaN");
    expect(blob).not.toContain("  ");
    expect(blob).not.toMatch(/\bwith and\b/);
    expect(blob).not.toMatch(/\band\s*\./);
  });

  it("gives every page real local substance", () => {
    for (const { p } of pages) {
      expect(p!.facts).toHaveLength(6);
      expect(p!.delivery.bullets!.length).toBeGreaterThanOrEqual(5);
      expect(p!.standards.bullets!.length).toBeGreaterThanOrEqual(5);
      expect(p!.localFaqs).toHaveLength(3);
      expect(p!.faqSchema.length).toBe(5);
      expect(p!.otherCountries).toHaveLength(8);
    }
  });

  it("cites the standards family that actually applies in that market", () => {
    const de = pages.find(({ c }) => c.code === "DE")!.p!;
    expect(de.standards.bullets!.join(" ")).toMatch(/DIN EN 50173/);
    expect(de.standards.bullets!.join(" ")).not.toMatch(/TIA-568/);

    const us = pages.find(({ c }) => c.code === "US")!.p!;
    expect(us.standards.bullets!.join(" ")).toMatch(/TIA-568/);
    expect(us.delivery.bullets!.join(" ") + us.standards.paragraphs.join(" ")).not.toMatch(/EN 50173/);

    const inPage = pages.find(({ c }) => c.code === "IN")!.p!;
    expect(inPage.standards.bullets!.join(" ")).toMatch(/DPDP/);

    const ae = pages.find(({ c }) => c.code === "AE")!.p!;
    expect(ae.standards.bullets!.join(" ")).toMatch(/DESC/);
  });

  it("carries the live mobilisation hours from the coverage table", () => {
    for (const { c, p } of pages) {
      expect(p!.facts[0].value).toBe(`${c.mobiliseHours} hours`);
      expect(p!.facts[1].value).toBe(c.hubs.join(" · "));
      expect(p!.lede).toContain(`${c.mobiliseHours} hours`);
    }
  });

  it("differentiates the service angle per market", () => {
    const cablingDE = pages.find(({ s, c }) => s.slug === "structured-cabling" && c.code === "DE")!;
    const cablingUS = pages.find(({ s, c }) => s.slug === "structured-cabling" && c.code === "US")!;
    expect(cablingDE.p!.delivery.bullets).not.toEqual(cablingUS.p!.delivery.bullets);

    const rackPT = pages.find(({ s, c }) => s.slug === "rack-and-stack" && c.code === "PT")!;
    const rackSG = pages.find(({ s, c }) => s.slug === "rack-and-stack" && c.code === "SG")!;
    expect(rackPT.p!.delivery.paragraphs[0]).not.toBe(rackSG.p!.delivery.paragraphs[0]);
  });
});
