/**
 * Generates src/lib/content/worldmap.ts from Natural Earth 110m data.
 *
 * Run once: `node scripts/gen-map.mjs`. The output is a dependency-free
 * TypeScript module so the coverage page ships zero mapping libraries —
 * country outlines and hub coordinates are pre-projected to a fixed viewBox.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { feature } from "topojson-client";
import { geoNaturalEarth1, geoPath } from "d3-geo";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const W = 1000;
const H = 520;

const projection = geoNaturalEarth1().precision(0.6);
const bbox = { type: "Polygon", coordinates: [[[-168, -56], [180, -56], [180, 80], [-168, 80], [-168, -56]]] };
projection.fitExtent([[0, 0], [W, H]], bbox);
const pathGen = geoPath(projection);

/** Numeric ISO 3166-1 id -> alpha-2, for the countries Tech Maths covers. */
const NUMERIC = {
  PT: "620", ES: "724", FR: "250", IE: "372", GB: "826", NL: "528", BE: "56",
  LU: "442", DE: "276", AT: "40", CH: "756", DK: "208", SE: "752", NO: "578",
  FI: "246", IS: "352", IT: "380", GR: "300", PL: "616", CZ: "203", SK: "703",
  HU: "348", RO: "642", US: "840", CA: "124", IN: "356", AE: "784", SG: "702",
};

const CITIES = [
  ["Lisbon", "PT", 38.7223, -9.1393, true], ["Porto", "PT", 41.1579, -8.6291],
  ["Madrid", "ES", 40.4168, -3.7038], ["Barcelona", "ES", 41.3874, 2.1686],
  ["Paris", "FR", 48.8566, 2.3522], ["Marseille", "FR", 43.2965, 5.3698],
  ["Dublin", "IE", 53.3498, -6.2603], ["London", "GB", 51.5074, -0.1278],
  ["Manchester", "GB", 53.4808, -2.2426], ["Amsterdam", "NL", 52.3676, 4.9041],
  ["Rotterdam", "NL", 51.9244, 4.4777], ["Brussels", "BE", 50.8503, 4.3517],
  ["Luxembourg City", "LU", 49.6116, 6.1319], ["Frankfurt", "DE", 50.1109, 8.6821],
  ["Berlin", "DE", 52.52, 13.405], ["Munich", "DE", 48.1351, 11.582],
  ["Vienna", "AT", 48.2082, 16.3738], ["Zurich", "CH", 47.3769, 8.5417],
  ["Geneva", "CH", 46.2044, 6.1432], ["Copenhagen", "DK", 55.6761, 12.5683],
  ["Stockholm", "SE", 59.3293, 18.0686], ["Oslo", "NO", 59.9139, 10.7522],
  ["Helsinki", "FI", 60.1699, 24.9384], ["Reykjavik", "IS", 64.1466, -21.9426],
  ["Milan", "IT", 45.4642, 9.19], ["Athens", "GR", 37.9838, 23.7275],
  ["Warsaw", "PL", 52.2297, 21.0122], ["Prague", "CZ", 50.0755, 14.4378],
  ["Bratislava", "SK", 48.1486, 17.1077], ["Budapest", "HU", 47.4979, 19.0402],
  ["Bucharest", "RO", 44.4268, 26.1025], ["Ashburn, VA", "US", 39.0438, -77.4874],
  ["Chicago", "US", 41.8781, -87.6298], ["Dallas", "US", 32.7767, -96.797],
  ["Bay Area", "US", 37.3382, -121.8863], ["Toronto", "CA", 43.6532, -79.3832],
  ["Montreal", "CA", 45.5017, -73.5673], ["Mumbai", "IN", 19.076, 72.8777],
  ["Bengaluru", "IN", 12.9716, 77.5946], ["Chennai", "IN", 13.0827, 80.2707],
  ["Hyderabad", "IN", 17.385, 78.4867], ["Delhi NCR", "IN", 28.6139, 77.209],
  ["Dubai", "AE", 25.2048, 55.2708], ["Singapore", "SG", 1.3521, 103.8198],
];

const countries110 = JSON.parse(fs.readFileSync(require.resolve("world-atlas/countries-110m.json"), "utf8"));
const countries50 = JSON.parse(fs.readFileSync(require.resolve("world-atlas/countries-50m.json"), "utf8"));
const land = JSON.parse(fs.readFileSync(require.resolve("world-atlas/land-110m.json"), "utf8"));

// TopoJSON ids are zero-padded ISO 3166-1 numerics ("040"), and the 110m set
// omits a few small states — so look up 110m first, then fall back to 50m.
const byId = new Map();
for (const file of [countries50, countries110]) {
  for (const f of feature(file, file.objects.countries).features) byId.set(String(f.id).padStart(3, "0"), f);
}

/**
 * Hand-rolled path builder: projects each ring, drops points closer than
 * `epsilon` pixels and rings smaller than `minBox` pixels. The stock
 * d3 pathGen output is ~60KB for the world landmass; this keeps the visual
 * result identical at the sizes we render while cutting most of the weight.
 */
function buildPath(geo, { epsilon = 0.9, minBox = 3, decimals = 0 } = {}) {
  const polys = geo.type === "MultiPolygon" ? geo.coordinates : [geo.coordinates];
  const parts = [];
  for (const poly of polys) {
    for (const ring of poly) {
      const pts = [];
      let last = null;
      for (const coord of ring) {
        const p = projection(coord);
        if (!p) continue;
        if (last && Math.hypot(p[0] - last[0], p[1] - last[1]) < epsilon) continue;
        pts.push(p);
        last = p;
      }
      if (pts.length < 4) continue;
      const xs = pts.map((p) => p[0]);
      const ys = pts.map((p) => p[1]);
      const w = Math.max(...xs) - Math.min(...xs);
      const h = Math.max(...ys) - Math.min(...ys);
      if (w < minBox && h < minBox) continue;
      const q = (n) => (decimals ? n.toFixed(decimals) : String(Math.round(n)));
      parts.push("M" + pts.map((p) => `${q(p[0])},${q(p[1])}`).join("L") + "Z");
    }
  }
  return parts.join("");
}

const countryPaths = {};
const centroids = {};
const tiny = [];
for (const [alpha2, numeric] of Object.entries(NUMERIC)) {
  const f = byId.get(String(numeric).padStart(3, "0"));
  if (!f) throw new Error(`Missing country geometry for ${alpha2} (id ${numeric})`);
  const c = pathGen.centroid(f);
  const cx = Math.round(c[0] * 10) / 10;
  const cy = Math.round(c[1] * 10) / 10;
  centroids[alpha2] = [cx, cy];

  let d = buildPath(f.geometry, { epsilon: 0.45, minBox: 0.4, decimals: 1 });
  if (!d) {
    // City-states (Singapore) fall below a pixel at world scale: emit a small
    // disc so the country still has a hit target and a visible marker.
    const r = 3;
    d = `M${(cx - r).toFixed(1)},${cy}a${r},${r} 0 1,0 ${(r * 2).toFixed(1)},0a${r},${r} 0 1,0 ${(-r * 2).toFixed(1)},0Z`;
    tiny.push(alpha2);
  }
  countryPaths[alpha2] = d;
}
if (tiny.length) console.log(`sub-pixel countries rendered as markers: ${tiny.join(", ")}`);

const landFc = feature(land, land.objects.land);
const landGeoms = landFc.features ? landFc.features.map((f) => f.geometry) : [landFc.geometry];
const landPath = landGeoms
  .map((g) => buildPath(g, { epsilon: 1.1, minBox: 4, decimals: 0 }))
  .join("");

const hubs = CITIES.map(([name, code, lat, lon, hq]) => {
  const p = projection([lon, lat]);
  if (!p) throw new Error(`Projection failed for ${name}`);
  return { name, code, x: Math.round(p[0] * 10) / 10, y: Math.round(p[1] * 10) / 10, hq: Boolean(hq) };
});

const lisbon = hubs.find((h) => h.name === "Lisbon");

const out = `/* GENERATED by scripts/gen-map.mjs — do not edit by hand.
 * Natural Earth 110m, pre-projected with geoNaturalEarth1 to a ${W}x${H} viewBox. */

export const MAP_VIEWBOX = "0 0 ${W} ${H}";

/** Base landmass, rendered dim behind the covered countries. */
export const LAND_PATH = ${JSON.stringify(landPath)};

/** alpha-2 -> SVG path for every country Tech Maths covers. */
export const COUNTRY_PATHS: Record<string, string> = ${JSON.stringify(countryPaths, null, 0).replace(/,"/g, ',\n  "')};

/** Pre-projected centroid of each covered country (for labels and hit areas). */
export const COUNTRY_CENTROIDS: Record<string, [number, number]> = ${JSON.stringify(centroids).replace(/,"/g, ',\n  "')};

export type HubPoint = { name: string; code: string; x: number; y: number; hq: boolean };

/** Engineer hub locations, projected into the same coordinate space. */
export const HUB_POINTS: HubPoint[] = ${JSON.stringify(hubs, null, 2)};

export const HQ_POINT: HubPoint = ${JSON.stringify(lisbon)};
`;

const dest = path.join(root, "src/lib/content/worldmap.ts");
fs.writeFileSync(dest, out);
console.log(`wrote ${dest}`);
console.log(`countries=${Object.keys(countryPaths).length} hubs=${hubs.length} size=${(out.length / 1024).toFixed(1)}KB`);
