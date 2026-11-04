"use client";

import { useCallback, useEffect, useState } from "react";
import { ClipboardList, Plus, RefreshCw } from "lucide-react";
import {
  controlApi,
  controlReads,
  controlWrites,
  describeError,
  humanise,
  type TicketTemplate,
} from "@/lib/portal-v2";
import { Button, Empty, ErrorNote, Field, Loading, Modal, Panel, Pill, inputClass } from "@/components/portal/v2/ui";

type Site = { id: string; name: string; organization_id: string; address: string };

const PRIORITIES = ["low", "normal", "high", "critical"];

const BLANK = {
  name: "",
  category: "rack_and_stack",
  priority: "normal",
  title: "",
  description: "",
  estimated_hours: "",
  sla_hours: "",
  checklist: "",
};

/** R2 ticket templates: standard scopes of work that become consistent tickets. */
export function ControlTemplates({ canManage }: { canManage: boolean }) {
  const [templates, setTemplates] = useState<TicketTemplate[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [form, setForm] = useState<typeof BLANK | null>(null);
  const [raising, setRaising] = useState<TicketTemplate | null>(null);
  const [raiseSiteId, setRaiseSiteId] = useState("");
  const [raiseTitle, setRaiseTitle] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextTemplates, nextSites] = await Promise.all([controlReads.templates(), controlReads.sites()]);
      setTemplates(nextTemplates);
      setSites(nextSites);
      setRaiseSiteId((current) => current || nextSites[0]?.id || "");
    } catch (caught) {
      setError(describeError(caught).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    if (!form) return;
    setBusy(true);
    setNote("");
    try {
      await controlWrites.saveTemplate({
        name: form.name,
        category: form.category,
        priority: form.priority,
        title: form.title || form.name,
        description: form.description,
        checklist: form.checklist
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
        estimated_hours: form.estimated_hours ? Number(form.estimated_hours) : null,
        sla_hours: form.sla_hours ? Number(form.sla_hours) : null,
      });
      setNote(`Template "${form.name}" saved.`);
      setForm(null);
      await load();
    } catch (caught) {
      setNote(describeError(caught).message);
    } finally {
      setBusy(false);
    }
  };

  const raise = async () => {
    if (!raising) return;
    const site = sites.find((candidate) => candidate.id === raiseSiteId);
    if (!site) {
      setNote("Choose a site first.");
      return;
    }
    setBusy(true);
    setNote("");
    try {
      const ticketId = await controlApi.createFromTemplate({
        templateId: raising.id,
        siteId: site.id,
        clientOrgId: site.organization_id,
        title: raiseTitle || null,
      });
      setNote(`Ticket ${ticketId.slice(0, 8)} created on ${site.name} from "${raising.name}".`);
      setRaising(null);
      setRaiseTitle("");
    } catch (caught) {
      setNote(describeError(caught).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading && templates.length === 0) return <Loading label="Loading templates" />;

  return (
    <div className="space-y-4">
      {error && <ErrorNote message={error} onRetry={() => void load()} />}

      <Panel
        title="Ticket templates"
        subtitle="Reusable scopes of work: category, checklist, estimate and SLA are copied onto the new ticket"
        action={
          <div className="flex gap-2">
            <Button onClick={() => void load()} disabled={loading}>
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
            </Button>
            {canManage && (
              <Button variant="primary" onClick={() => setForm({ ...BLANK })}>
                <Plus size={13} /> New template
              </Button>
            )}
          </div>
        }
      >
        {templates.length === 0 ? (
          <Empty
            title="No templates yet"
            body="Templates keep rack-and-stack, cabling and preventive maintenance consistent no matter which engineer turns up."
            action={canManage ? <Button variant="primary" onClick={() => setForm({ ...BLANK })}><Plus size={13} /> Create a template</Button> : undefined}
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {templates.map((template) => (
              <article key={template.id} className="rounded-[12px] border border-white/[0.07] bg-white/[0.015] p-3.5">
                <header className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-[13px] font-semibold text-[#E8EEF9]">{template.name}</h3>
                    <p className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-[#7E8CA0]">
                      {template.category.replace(/_/g, " ")} · {humanise(template.priority)}
                      {template.sla_hours ? ` · ${template.sla_hours}h SLA` : ""}
                      {template.estimated_hours ? ` · ${template.estimated_hours}h est.` : ""}
                    </p>
                  </div>
                  {template.is_demo && <Pill tone="muted">demo</Pill>}
                </header>
                {template.description && <p className="mt-2 text-[11.5px] leading-relaxed text-[#8A99AB]">{template.description}</p>}
                {template.checklist?.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {template.checklist.slice(0, 6).map((item, index) => (
                      <li key={`${template.id}-${index}`} className="flex items-start gap-1.5 text-[11px] text-[#C7D3E3]">
                        <span className="mt-[5px] block h-1 w-1 shrink-0 rounded-full bg-[#29E6FF]" />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-3 flex justify-end">
                  <Button
                    onClick={() => {
                      setRaising(template);
                      setRaiseTitle("");
                    }}
                    disabled={sites.length === 0}
                    title={sites.length === 0 ? "Create a client site first" : "Raise a ticket from this template"}
                  >
                    <ClipboardList size={13} /> Raise ticket
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
        {note && <div className="mt-3 rounded-[10px] border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[12px] text-[#C7D3E3]">{note}</div>}
      </Panel>

      {form && (
        <Modal
          title="New template"
          onClose={() => setForm(null)}
          footer={
            <div className="flex justify-end gap-2">
              <Button onClick={() => setForm(null)}>Cancel</Button>
              <Button variant="primary" onClick={() => void submit()} disabled={busy || !form.name.trim()}>
                Save template
              </Button>
            </div>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Template name">
                <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={inputClass} placeholder="Rack and stack — 10U" />
              </Field>
            </div>
            <Field label="Ticket title">
              <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className={inputClass} placeholder="Defaults to the template name" />
            </Field>
            <Field label="Category">
              <input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className={inputClass} />
            </Field>
            <Field label="Priority">
              <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} className={inputClass}>
                {PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {humanise(priority)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Estimated hours">
              <input value={form.estimated_hours} onChange={(event) => setForm({ ...form, estimated_hours: event.target.value })} inputMode="decimal" className={inputClass} />
            </Field>
            <Field label="SLA hours" hint="Leave blank for no SLA">
              <input value={form.sla_hours} onChange={(event) => setForm({ ...form, sla_hours: event.target.value })} inputMode="numeric" className={inputClass} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Description">
                <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={2} className={inputClass} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Checklist" hint="One step per line">
                <textarea value={form.checklist} onChange={(event) => setForm({ ...form, checklist: event.target.value })} rows={5} className={inputClass} placeholder={"Confirm rack location\nFit rails and mount\nDress and label cabling"} />
              </Field>
            </div>
          </div>
        </Modal>
      )}

      {raising && (
        <Modal
          title={`Raise ticket from "${raising.name}"`}
          onClose={() => setRaising(null)}
          footer={
            <div className="flex justify-end gap-2">
              <Button onClick={() => setRaising(null)}>Cancel</Button>
              <Button variant="primary" onClick={() => void raise()} disabled={busy || !raiseSiteId}>
                Create ticket
              </Button>
            </div>
          }
        >
          <div className="grid gap-3">
            <Field label="Site">
              <select value={raiseSiteId} onChange={(event) => setRaiseSiteId(event.target.value)} className={inputClass}>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Title override" hint="Optional — the template title is used when blank">
              <input value={raiseTitle} onChange={(event) => setRaiseTitle(event.target.value)} className={inputClass} />
            </Field>
          </div>
        </Modal>
      )}
    </div>
  );
}
