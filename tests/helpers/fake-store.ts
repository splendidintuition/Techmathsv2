import type { Lead, LeadInput } from "@/lib/types";

/** In-memory stand-in for src/lib/store.ts so API tests run without Postgres. */
export function createFakeStore() {
  const leads: Lead[] = [];
  const subscribers = new Set<string>();
  const events: Array<{ type: string; path?: string; at: Date }> = [];
  let nextId = 1;

  return {
    makeReference: () => `TM-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 7).toUpperCase().padEnd(5, "0")}`,
    async createLead(input: LeadInput): Promise<Lead> {
      const lead: Lead = {
        ...input,
        id: nextId++,
        reference: `TM-${new Date().getFullYear()}-${String(nextId).padStart(5, "0")}`,
        createdAt: new Date().toISOString(),
        status: "new",
        notified: false,
      };
      leads.unshift(lead);
      return lead;
    },
    async listLeads(limit = 100) {
      return leads.slice(0, limit);
    },
    async leadStats() {
      const byStatus = new Map<string, number>();
      for (const l of leads) byStatus.set(l.status, (byStatus.get(l.status) ?? 0) + 1);
      return { total: leads.length, last30: leads.length, byStatus: [...byStatus].map(([status, n]) => ({ status, n })) };
    },
    async setLeadStatus(id: number, status: string) {
      const lead = leads.find((l) => l.id === id);
      if (lead) lead.status = status;
      return Boolean(lead);
    },
    async markLeadNotified(id: number) {
      const lead = leads.find((l) => l.id === id);
      if (lead) lead.notified = true;
    },
    async addSubscriber(email: string) {
      const key = email.toLowerCase();
      const duplicate = subscribers.has(key);
      subscribers.add(key);
      return { ok: true, duplicate };
    },
    async subscriberCount() {
      return subscribers.size;
    },
    async trackEvent(type: string, data: { path?: string } = {}) {
      events.push({ type, path: data.path, at: new Date() });
    },
    async trafficStats() {
      return { views: [] as Array<{ day: string; n: number }>, topPaths: [] as Array<{ path: string; n: number }> };
    },
    async pingDatabase() {},
  };
}
