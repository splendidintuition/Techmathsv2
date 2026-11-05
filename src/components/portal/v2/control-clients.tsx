"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  Building2,
  KeyRound,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Ticket,
} from "lucide-react";
import {
  controlApi,
  coverageSummary,
  describeError,
  humanise,
  siteSubtitle,
  type ClientRecord,
  type ClientSite,
} from "@/lib/portal-v2";
import { Button, Empty, ErrorNote, Field, Loading, Modal, Panel, Pill, Stat, inputClass } from "@/components/portal/v2/ui";

type ClientDraft = {
  id: string | null;
  name: string;
  billingEmail: string;
  vatNumber: string;
  countryCode: string;
};

type SiteDraft = {
  id: string | null;
  organizationId: string;
  name: string;
  address: string;
  countryCode: string;
  latitude: string;
  longitude: string;
  geofence: string;
};

const EMPTY_CLIENT: ClientDraft = { id: null, name: "", billingEmail: "", vatNumber: "", countryCode: "" };

/**
 * R4 Clients & sites (§3.4). Creating a client and a site is the prerequisite for
 * every ticket, quote and invoice in the product, so this screen is the front door
 * of the console. Access procedure text is a separate, sensitive permission.
 */
export function ControlClients({
  canEdit,
  canSeeAccess,
}: {
  canEdit: boolean;
  canSeeAccess: boolean;
}) {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const [clientDraft, setClientDraft] = useState<ClientDraft | null>(null);
  const [siteDraft, setSiteDraft] = useState<SiteDraft | null>(null);
  const [accessSite, setAccessSite] = useState<{ site: ClientSite; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setClients(await controlApi.listClients());
    } catch (caught) {
      setError(describeError(caught).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = useMemo(() => coverageSummary(clients), [clients]);
  const filtered = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    if (!needle) return clients;
    return clients.filter((client) => {
      const haystack = [client.name, client.billing_email, client.vat_number, client.country_code]
        .concat(client.sites.map((site) => `${site.name} ${site.address}`))
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [clients, deferredQuery]);

  const run = async (task: () => Promise<unknown>, success: string) => {
    setBusy(true);
    setNote("");
    try {
      await task();
      setNote(success);
      await load();
    } catch (caught) {
      setNote(describeError(caught).message);
    } finally {
      setBusy(false);
    }
  };

  const submitClient = async () => {
    if (!clientDraft) return;
    await run(
      () =>
        controlApi.saveClient({
          id: clientDraft.id,
          name: clientDraft.name,
          billingEmail: clientDraft.billingEmail,
          vatNumber: clientDraft.vatNumber,
          countryCode: clientDraft.countryCode,
        }),
      clientDraft.id ? "Client updated." : "Client created. Add a site next so tickets can be raised against it.",
    );
    setClientDraft(null);
  };

  const submitSite = async () => {
    if (!siteDraft) return;
    const lat = siteDraft.latitude.trim() ? Number(siteDraft.latitude) : null;
    const lon = siteDraft.longitude.trim() ? Number(siteDraft.longitude) : null;
    const geofence = siteDraft.geofence.trim() ? Number(siteDraft.geofence) : 150;
    await run(
      () =>
        controlApi.saveSite({
          id: siteDraft.id,
          organizationId: siteDraft.organizationId,
          name: siteDraft.name,
          address: siteDraft.address,
          countryCode: siteDraft.countryCode,
          latitude: Number.isFinite(lat as number) ? lat : null,
          longitude: Number.isFinite(lon as number) ? lon : null,
          geofenceRadiusM: Number.isFinite(geofence) ? geofence : 150,
        }),
      siteDraft.id ? "Site updated." : "Site created. It now appears in the ticket and quote pickers.",
    );
    setSiteDraft(null);
  };

  const openAccess = async (site: ClientSite) => {
    setAccessSite({ site, text: "" });
    try {
      const payload = await controlApi.getSiteAccess(site.id);
      setAccessSite({ site, text: payload.instructions });
    } catch (caught) {
      setNote(describeError(caught).message);
      setAccessSite(null);
    }
  };

  const saveAccess = async () => {
    if (!accessSite) return;
    await run(
      () => controlApi.saveSiteAccess(accessSite.site.id, accessSite.text),
      "Access procedure saved. Engineers assigned to a ticket at this site can read it.",
    );
    setAccessSite(null);
  };

  if (loading && clients.length === 0) return <Loading label="Loading clients" />;

  return (
    <div className="space-y-4">
      {error && <ErrorNote message={error} onRetry={() => void load()} />}
      {note && <div className="rounded-[10px] border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[12px] text-[#C7D3E3]">{note}</div>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Clients" value={String(totals.clients)} hint="Organizations you can see" />
        <Stat label="Sites" value={String(totals.sites)} hint={`${totals.withAccess} with an access procedure`} tone={totals.sites > totals.withAccess ? "warn" : "good"} />
        <Stat label="Open tickets" value={String(totals.tickets)} hint="Across every client below" />
        <Stat label="Coverage gaps" value={String(Math.max(0, totals.sites - totals.withAccess))} hint="Sites without access notes" tone={totals.sites > totals.withAccess ? "warn" : "good"} />
      </div>

      <Panel
        title="Clients and sites"
        subtitle="Every ticket, quote, invoice and asset hangs off these records"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5F6F84]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search clients or sites"
                className={`${inputClass} w-[210px] pl-7`}
                aria-label="Search clients or sites"
              />
            </div>
            <Button onClick={() => void load()} disabled={loading}>
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
            </Button>
            {canEdit && (
              <Button variant="primary" onClick={() => setClientDraft({ ...EMPTY_CLIENT })}>
                <Plus size={13} /> New client
              </Button>
            )}
          </div>
        }
      >
        {filtered.length === 0 ? (
          <Empty
            title={clients.length === 0 ? "No clients yet" : "Nothing matches that search"}
            body={
              clients.length === 0
                ? canEdit
                  ? "Create the first client, then add its site. Ticket, quote and invoice pickers fill from these records."
                  : "An Admin or Staff member with clients.edit can create the first client."
                : "Try a shorter search, or clear it to see every client."
            }
            action={clients.length === 0 && canEdit ? <Button variant="primary" onClick={() => setClientDraft({ ...EMPTY_CLIENT })}><Plus size={13} /> New client</Button> : undefined}
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((client) => (
              <div key={client.id} className="rounded-[12px] border border-white/[0.07] bg-white/[0.015]">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.06] px-3.5 py-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Building2 size={14} className="text-[#29E6FF]" />
                      <h3 className="truncate text-[13.5px] font-semibold text-[#E8EEF9]">{client.name}</h3>
                      <Pill tone="muted">{client.type}</Pill>
                      {client.is_demo && <Pill tone="warn">demo</Pill>}
                      <Pill tone={client.open_tickets > 0 ? "accent" : "muted"}>
                        <Ticket size={10} /> {client.open_tickets} open
                      </Pill>
                    </div>
                    <p className="mt-1 truncate text-[11.5px] text-[#8A99AB]">
                      {[client.billing_email || "no billing email", client.vat_number ? `VAT ${client.vat_number}` : "no VAT number", client.country_code || "no country"]
                        .join(" · ")}
                    </p>
                  </div>
                  {canEdit && (
                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        onClick={() =>
                          setClientDraft({
                            id: client.id,
                            name: client.name,
                            billingEmail: client.billing_email ?? "",
                            vatNumber: client.vat_number ?? "",
                            countryCode: client.country_code ?? "",
                          })
                        }
                      >
                        <Pencil size={12} /> Edit
                      </Button>
                      <Button
                        onClick={() =>
                          setSiteDraft({
                            id: null,
                            organizationId: client.id,
                            name: "",
                            address: "",
                            countryCode: client.country_code ?? "",
                            latitude: "",
                            longitude: "",
                            geofence: "150",
                          })
                        }
                      >
                        <Plus size={12} /> Site
                      </Button>
                    </div>
                  )}
                </div>

                {client.sites.length === 0 ? (
                  <p className="px-3.5 py-3 text-[11.5px] text-[#FFD48A]">
                    No sites yet — a ticket needs one. {canEdit ? "Use “Site” above to add the first." : ""}
                  </p>
                ) : (
                  <ul className="divide-y divide-white/[0.05]">
                    {client.sites.map((site) => (
                      <li key={site.id} className="flex flex-wrap items-start justify-between gap-3 px-3.5 py-2.5">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <MapPin size={12} className="text-[#7E8CA0]" />
                            <span className="truncate text-[12.5px] text-[#D7E1EF]">{site.name}</span>
                            {site.has_access_notes ? (
                              <Pill tone="good">access notes</Pill>
                            ) : (
                              <Pill tone="danger">
                                <ShieldAlert size={10} /> no access notes
                              </Pill>
                            )}
                            {site.assets > 0 && <Pill tone="muted">{site.assets} assets</Pill>}
                          </div>
                          <p className="mt-0.5 truncate text-[11px] text-[#7E8CA0]">{siteSubtitle(site)}</p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {canSeeAccess && (
                            <Button onClick={() => void openAccess(site)}>
                              <KeyRound size={12} /> Access
                            </Button>
                          )}
                          {canEdit && (
                            <Button
                              onClick={() =>
                                setSiteDraft({
                                  id: site.id,
                                  organizationId: client.id,
                                  name: site.name,
                                  address: site.address,
                                  countryCode: site.country_code ?? "",
                                  latitude: site.latitude === null ? "" : String(site.latitude),
                                  longitude: site.longitude === null ? "" : String(site.longitude),
                                  geofence: String(site.geofence_radius_m),
                                })
                              }
                            >
                              <Pencil size={12} /> Edit
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </Panel>

      {clientDraft && (
        <Modal title={clientDraft.id ? "Edit client" : "New client"} onClose={() => setClientDraft(null)}>
          <div className="space-y-3">
            <Field label="Client name">
              <input
                className={inputClass}
                value={clientDraft.name}
                onChange={(event) => setClientDraft({ ...clientDraft, name: event.target.value })}
                placeholder="e.g. Start Campus Sines"
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Billing email">
                <input
                  className={inputClass}
                  value={clientDraft.billingEmail}
                  onChange={(event) => setClientDraft({ ...clientDraft, billingEmail: event.target.value })}
                  placeholder="ap@client.com"
                />
              </Field>
              <Field label="VAT number">
                <input
                  className={inputClass}
                  value={clientDraft.vatNumber}
                  onChange={(event) => setClientDraft({ ...clientDraft, vatNumber: event.target.value })}
                  placeholder="PT123456789"
                />
              </Field>
            </div>
            <Field label="Country" hint="Two-letter ISO code, used for VAT and language defaults.">
              <input
                className={inputClass}
                value={clientDraft.countryCode}
                onChange={(event) => setClientDraft({ ...clientDraft, countryCode: event.target.value })}
                placeholder="PT"
                maxLength={2}
              />
            </Field>
            <div className="flex justify-end gap-2 pt-1">
              <Button onClick={() => setClientDraft(null)}>Cancel</Button>
              <Button variant="primary" onClick={() => void submitClient()} disabled={busy || !clientDraft.name.trim()}>
                {clientDraft.id ? "Save client" : "Create client"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {siteDraft && (
        <Modal title={siteDraft.id ? "Edit site" : "New site"} onClose={() => setSiteDraft(null)}>
          <div className="space-y-3">
            <Field label="Site name">
              <input
                className={inputClass}
                value={siteDraft.name}
                onChange={(event) => setSiteDraft({ ...siteDraft, name: event.target.value })}
                placeholder="e.g. Lisbon DC1 — Hall 2"
              />
            </Field>
            <Field label="Address">
              <input
                className={inputClass}
                value={siteDraft.address}
                onChange={(event) => setSiteDraft({ ...siteDraft, address: event.target.value })}
                placeholder="Rua …, Lisbon"
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Country">
                <input
                  className={inputClass}
                  value={siteDraft.countryCode}
                  onChange={(event) => setSiteDraft({ ...siteDraft, countryCode: event.target.value })}
                  placeholder="PT"
                  maxLength={2}
                />
              </Field>
              <Field label="Latitude">
                <input
                  className={inputClass}
                  value={siteDraft.latitude}
                  onChange={(event) => setSiteDraft({ ...siteDraft, latitude: event.target.value })}
                  placeholder="38.72"
                  inputMode="decimal"
                />
              </Field>
              <Field label="Longitude">
                <input
                  className={inputClass}
                  value={siteDraft.longitude}
                  onChange={(event) => setSiteDraft({ ...siteDraft, longitude: event.target.value })}
                  placeholder="-9.14"
                  inputMode="decimal"
                />
              </Field>
            </div>
            <Field label="Geofence radius (m)" hint="Between 25 and 2000. Used for on-site check-in.">
              <input
                className={inputClass}
                value={siteDraft.geofence}
                onChange={(event) => setSiteDraft({ ...siteDraft, geofence: event.target.value })}
                inputMode="numeric"
              />
            </Field>
            <div className="flex justify-end gap-2 pt-1">
              <Button onClick={() => setSiteDraft(null)}>Cancel</Button>
              <Button
                variant="primary"
                onClick={() => void submitSite()}
                disabled={busy || !siteDraft.name.trim() || !siteDraft.address.trim()}
              >
                {siteDraft.id ? "Save site" : "Create site"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {accessSite && (
        <Modal title={`Access procedure · ${accessSite.site.name}`} onClose={() => setAccessSite(null)}>
          <div className="space-y-3">
            <p className="rounded-[10px] border border-[#FFB020]/25 bg-[#FFB020]/10 px-3 py-2 text-[11.5px] text-[#FFD48A]">
              Sensitive. Visible only to accounts holding <span className="font-mono">clients.access_codes</span>, and to the engineer assigned after they accept.
              The text is never included in list payloads and is not written to the audit log.
            </p>
            <Field label="Entry, escort, parking and security contacts">
              <textarea
                className={`${inputClass} min-h-[140px]`}
                value={accessSite.text}
                onChange={(event) => setAccessSite({ ...accessSite, text: event.target.value })}
                placeholder={"Gate 3, ring the intercom for security.\nAsk for the duty manager, escort required past the mantrap.\nParking in bay 12."}
              />
            </Field>
            <div className="flex justify-end gap-2 pt-1">
              <Button onClick={() => setAccessSite(null)}>Cancel</Button>
              <Button variant="primary" onClick={() => void saveAccess()} disabled={busy}>
                Save access procedure
              </Button>
            </div>
          </div>
        </Modal>
      )}

      <p className="text-center font-mono text-[9.5px] uppercase tracking-[0.14em] text-[#3F4C5D]">
        {humanise("clients")} · {totals.clients} organizations · {totals.sites} sites · enforced by row-level security
      </p>
    </div>
  );
}
