import type { Lead } from "./types";

/** Sync saved enquiries without enrolling contacts in marketing. */
export async function syncLeadToHubSpot(lead: Lead): Promise<void> {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token || (lead.spamScore ?? 0) > 0) return;

  const request = (path: string, method: string, body: unknown) => fetch(
    `https://api.hubapi.com${path}`,
    {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    },
  );
  const [firstname, ...rest] = lead.name.trim().split(/\s+/);
  const properties = {
    email: lead.email, firstname, lastname: rest.join(" "), country: lead.country,
    ...(lead.company ? { company: lead.company } : {}),
    ...(lead.phone ? { phone: lead.phone } : {}),
  };
  let response = await request("/crm/v3/objects/contacts", "POST", { properties });
  if (response.status === 409) {
    response = await request(`/crm/v3/objects/contacts/${encodeURIComponent(lead.email)}?idProperty=email`, "PATCH", { properties });
  }
  if (!response.ok) throw new Error(`HubSpot contact sync failed (HTTP ${response.status})`);
  const contact = await response.json() as { id?: string };
  if (!contact.id) throw new Error("HubSpot contact response missing ID");

  const lines = [
    `Website enquiry ${lead.reference}`, `Name: ${lead.name}`, `Email: ${lead.email}`,
    `Services: ${lead.services.join(", ")}`, `Country: ${lead.country}`,
    `Site: ${lead.siteLocation ?? ""}`, `Racks: ${lead.racks ?? ""}`,
    `Servers: ${lead.servers ?? ""}`, `Ports: ${lead.ports ?? ""}`,
    `Timeline: ${lead.timeline ?? ""}`, `Urgency: ${lead.urgency ?? ""}`,
    `Source: ${lead.source ?? "website"}`, `Marketing consent: ${lead.consentMarketing ? "yes" : "no"}`,
    lead.message ?? "",
  ];
  const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const note = await request("/crm/v3/objects/notes", "POST", {
    properties: { hs_timestamp: new Date(lead.createdAt).toISOString(), hs_note_body: lines.map(escape).join("<br>") },
    associations: [{ to: { id: contact.id }, types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 202 }] }],
  });
  if (!note.ok) throw new Error(`HubSpot enquiry note failed (HTTP ${note.status})`);
}
