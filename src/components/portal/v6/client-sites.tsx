"use client";

import { useState } from "react";
import { Building2, CalendarPlus, MapPin } from "lucide-react";
import { clientApi, clientError, dateTime, type ClientSite } from "@/lib/portal-client";
import { Button, Empty, ErrorNote, Field, Modal, Panel, Pill, inputClass } from "@/components/portal/v2/ui";

function RequestVisitSheet({
  sites,
  presetSiteId,
  onClose,
  onRequested,
}: {
  sites: ClientSite[];
  presetSiteId?: string;
  onClose: () => void;
  onRequested: () => Promise<void> | void;
}) {
  const [siteId, setSiteId] = useState(presetSiteId ?? sites[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [preferred, setPreferred] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      await clientApi.requestVisit(siteId, title.trim(), description.trim(), preferred || null);
      setDone(true);
      await onRequested();
    } catch (caught) {
      setError(clientError(caught).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={done ? "Request received" : "Request a visit"}
      onClose={onClose}
      footer={
        done ? (
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        ) : (
          <div className="flex justify-end gap-2">
            <Button onClick={onClose}>Cancel</Button>
            <Button variant="primary" disabled={saving || !siteId || title.trim().length < 3} onClick={() => void submit()}>
              {saving ? "Sending…" : "Send request"}
            </Button>
          </div>
        )
      }
    >
      {done ? (
        <div className="space-y-2 py-2">
          <p className="text-[12.5px] text-[#DCE6F5]">
            Your request is in the operations queue and the team has been notified. A coordinator confirms the
            date and assigns an engineer — you will see it on the Requests tab.
          </p>
          <p className="text-[11px] text-[#8A99AB]">Same-day and emergency work still goes through your on-call number.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {error && <ErrorNote message={error} />}
          <Field label="Site">
            <select value={siteId} onChange={(event) => setSiteId(event.target.value)} className={inputClass}>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="What do you need?" hint="A short title the team can act on.">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={240}
              placeholder="Install a 2U server in rack B4"
              className={inputClass}
            />
          </Field>
          <Field label="Details" hint="Hardware, access, contacts, anything the engineer must know.">
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              className={inputClass}
              placeholder="Two Dell R650s delivered on Monday, rack space reserved, escort required at reception."
            />
          </Field>
          <Field label="Preferred date" hint="Leave empty if it is flexible. The coordinator confirms the slot.">
            <input type="date" value={preferred} onChange={(event) => setPreferred(event.target.value)} className={inputClass} />
          </Field>
        </div>
      )}
    </Modal>
  );
}

export function ClientSites({ sites }: { sites: ClientSite[] }) {
  const [requesting, setRequesting] = useState(false);
  const [preset, setPreset] = useState<string | undefined>(undefined);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-3">
      <Panel
        title="Your sites"
        subtitle="Where we work for you. Raise a request straight from a site."
        action={
          sites.length > 0 ? (
            <Button variant="primary" onClick={() => { setPreset(undefined); setRequesting(true); }}>
              <CalendarPlus size={13} /> Request a visit
            </Button>
          ) : undefined
        }
      >
        {sites.length === 0 ? (
          <Empty
            title="No sites on your account yet"
            body="Your account manager adds sites when the contract starts. Ask them to add the address, then you can book visits yourself."
          />
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2" key={refreshKey}>
            {sites.map((site) => (
              <div key={site.id} className="rounded-[12px] border border-white/[0.07] bg-white/[0.015] p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <Building2 size={15} className="mt-0.5 text-[#29E6FF]" />
                    <div>
                      <div className="text-[12.5px] font-medium text-[#E8EEF9]">{site.name}</div>
                      <div className="mt-0.5 flex items-start gap-1 text-[11px] text-[#8A99AB]">
                        <MapPin size={11} className="mt-0.5 shrink-0" />
                        <span>
                          {site.address}
                          {site.country_code ? ` · ${site.country_code.toUpperCase()}` : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                  {site.open_tickets > 0 ? <Pill tone="accent">{site.open_tickets} open</Pill> : <Pill tone="good">clear</Pill>}
                </div>
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-2">
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-[#6E7A8F]">
                    {site.next_visit_at ? `next visit ${dateTime(site.next_visit_at)}` : "no visit scheduled"}
                  </span>
                  <button
                    onClick={() => { setPreset(site.id); setRequesting(true); }}
                    className="rounded-full border border-[#29E6FF]/25 bg-[#29E6FF]/[0.07] px-2.5 py-1 text-[10px] text-[#9DF3FF] transition hover:bg-[#29E6FF]/15"
                  >
                    Request visit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {requesting && (
        <RequestVisitSheet
          sites={sites}
          presetSiteId={preset}
          onClose={() => setRequesting(false)}
          onRequested={() => {
            setRefreshKey((key) => key + 1);
          }}
        />
      )}
    </div>
  );
}
