/** Smoke test for the data layer outside Next.js. Run: npx tsx scripts/smoke-db.ts */
import { getDb } from "../src/lib/db";
import { listInsights, listProjects, listServices, createLead, listLeads, search } from "../src/lib/queries";

const db = getDb();
console.log("sqlite:", (db.prepare("select sqlite_version() as v").get() as { v: string }).v);
console.log("services:", listServices().length);
console.log("projects:", listProjects().length);
console.log("insights:", listInsights().length);

const lead = createLead({
  name: "Smoke Test",
  email: "smoke@example.com",
  country: "Portugal",
  services: ["rack-and-stack"],
  consentPrivacy: true,
  consentMarketing: false,
  source: "smoke-test",
});
console.log("lead created:", lead.reference, "total leads:", listLeads().length);
console.log("search 'fibre':", search("fibre").length, "hits");
console.log("OK");
