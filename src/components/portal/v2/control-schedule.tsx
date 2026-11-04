"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, Play, Plus, RefreshCw, Trash2 } from "lucide-react";
import {
  controlApi,
  controlReads,
  describeError,
  humanise,
  type Cadence,
  type CapacityDay,
  type RecurringPlan,
  type TicketTemplate,
} from "@/lib/portal-v2";
import { Button, Empty, ErrorNote, Field, Loading, Modal, Panel, Pill, inputClass } from "@/components/portal/v2/ui";

type Site = { id: string; name: string; organization_id: string; address: string };

const CADENCES: Cadence[] = ["weekly", "monthly", "quarterly", "yearly"];
const PRIORITIES = ["low", "normal", "high", "critical"];

/** R2 schedule: two-week capacity picture plus recurring maintenance plans (§3.3). */
export function ControlSchedule({ canManage }: { canManage: boolean }) {
  const [capacity, setCapacity] = useState<CapacityDay[]>([]);
  const [plans, setPlans] = useState<RecurringPlan[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [templates, setTemplates] = useState<TicketTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [form, setForm] = useState<null | {
    title: string;
    category: string;
    cadence: Cadence;
    interval_count: string;
    priority: string;
    site_id: string;
    template_id: string;
    description: string;
  }>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextCapacity, nextPlans, nextSites] = await Promise.all([
        controlApi.capacity(14),
        controlReads.plans(),
        controlReads.sites(),
      ]);
      setCapacity(nextCapacity);
      setPlans(nextPlans);
      setSites(nextSites);
      try {
        setTemplates(await controlReads.templates());
      } catch {
        setTemplates([]);
      }
    } catch (caught) {
      setError(describeError(caught).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = useMemo(
    () =>
      capacity.reduce(
        (acc, day) => ({
          visits: acc.visits + day.visits,
          unassigned: acc.unassigned + day.unassigned,
          leave: acc.leave + day.on_leave,
        }),
        { visits: 0, unassigned: 0, leave: 0 },
      ),
    [capacity],
  );

  const duePlans = plans.filter((plan) => plan.is_active && new Date(plan.next_run_at).getTime() <= Date.now());

  const openForm = () => {
    setForm({
      title: "",
      category: "preventive_maintenance",
      cadence: "monthly",
      interval_count: "1",
      priority: "normal",
      site_id: sites[0]?.id ?? "",
      template_id: "",
      description: "",
    });
  };

  const submit = async () => {
    if (!form) return;
    setBusy(true);
    setNote("");
    try {
      await controlApi.savePlan({
        p_id: null,
        p_site_id: form.site_id,
        p_template_id: form.template_id || null,
        p_title: form.title,
        p_category: form.category,
        p_priority: form.priority,
        p_description: form.description,
        p_cadence: form.cadence,
        p_interval_count: Number(form.interval_count) || 1,
        p_start_at: new Date().toISOString(),
        p_end_at: null,
        p_is_active: true,
      });
      setNote(`Plan "${form.title}" created. The first visit is generated on the next run.`);
      setForm(null);
      await load();
    } catch (caught) {
      setNote(describeError(caught).message);
    } finally {
      setBusy(false);
    }
  };

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

  if (loading && plans.length === 0 && capacity.length === 0) return <Loading label="Loading schedule" />;

  return (
    <div className="space-y-4">
      {error && <ErrorNote message={error} onRetry={() => void load()} />}

      <Panel
        title="Next 14 days"
        subtitle={`${totals.visits} booked visits · ${totals.unassigned} without an engineer · ${totals.leave} leave days`}
        action={
          <Button onClick={() => void load()} disabled={loading}>
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </Button>
        }
      >
        {capacity.length === 0 ? (
          <Empty title="No capacity data" body="Schedule data appears here once tickets carry a visit date." />
        ) : (
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
            {capacity.map((day) => {
              const isWeekend = ["Sat", "Sun"].includes(day.label);
              return (
                <div
                  key={day.date}
                  className={`min-w-[76px] flex-1 rounded-[10px] border px-2 py-2 ${
                    day.visits > 0 ? "border-[#29E6FF]/25 bg-[#29E6FF]/[0.06]" : "border-white/[0.07] bg-white/[0.015]"
                  }`}
                >
                  <div className={`font-mono text-[9.5px] uppercase tracking-[0.12em] ${isWeekend ? "text-[#5F6F84]" : "text-[#8A99AB]"}`}>{day.label}</div>
                  <div className="text-[11px] text-[#7E8CA0]">{day.date.slice(5)}</div>
                  <div className="mt-1 text-[17px] font-semibold leading-none text-[#EAF8FF]">{day.visits}</div>
                  <div className="mt-1 space-y-0.5 font-mono text-[8.5px] uppercase tracking-[0.08em]">
                    {day.unassigned > 0 && <div className="text-[#FFB020]">{day.unassigned} unassigned</div>}
                    {day.on_leave > 0 && <div className="text-[#B38BFF]">{day.on_leave} leave</div>}
                    {day.visits === 0 && <div className="text-[#4C5A6D]">clear</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <Panel
        title="Recurring maintenance"
        subtitle="Plans generate a ticket and roll the next visit forward each time they run"
        action={
          <div className="flex gap-2">
            {canManage && (
              <>
                <Button onClick={() => void run(() => controlApi.runPlans(10), "Recurring plans processed. New tickets are on the board.")} disabled={busy || duePlans.length === 0}>
                  <Play size={13} /> Run {duePlans.length || ""} due
                </Button>
                <Button variant="primary" onClick={openForm} disabled={busy || sites.length === 0}>
                  <Plus size={13} /> New plan
                </Button>
              </>
            )}
          </div>
        }
      >
        {plans.length === 0 ? (
          <Empty
            title="No recurring plans"
            body="Recurring maintenance turns a contract into guaranteed visits: monthly inspections, quarterly deep cleans, annual audits."
            action={canManage && sites.length > 0 ? <Button variant="primary" onClick={openForm}><Plus size={13} /> Create the first plan</Button> : undefined}
          />
        ) : (
          <ul className="space-y-2">
            {plans.map((plan) => {
              const due = plan.is_active && new Date(plan.next_run_at).getTime() <= Date.now();
              return (
                <li key={plan.id} className="flex flex-wrap items-center gap-2 rounded-[10px] border border-white/[0.07] px-3 py-2.5">
                  <CalendarClock size={14} className={due ? "text-[#FFB020]" : "text-[#29E6FF]"} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-[12.5px] text-[#E8EEF9]">{plan.title}</span>
                      <Pill tone={plan.is_active ? (due ? "warn" : "accent") : "muted"}>
                        {plan.is_active ? (due ? "due now" : "active") : "paused"}
                      </Pill>
                      {plan.is_demo && <Pill tone="muted">demo</Pill>}
                    </div>
                    <div className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-[#7E8CA0]">
                      every {plan.interval_count} {plan.cadence.replace("ly", "")} · next{" "}
                      {new Date(plan.next_run_at).toLocaleDateString("en-GB")} · {humanise(plan.priority)} · {plan.category.replace(/_/g, " ")}
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex gap-1.5">
                      <Button
                        onClick={() =>
                          void run(
                            () =>
                              controlApi.savePlan({
                                p_id: plan.id,
                                p_site_id: plan.site_id,
                                p_template_id: plan.template_id,
                                p_title: plan.title,
                                p_category: plan.category,
                                p_priority: plan.priority,
                                p_description: "",
                                p_cadence: plan.cadence,
                                p_interval_count: plan.interval_count,
                                p_start_at: plan.next_run_at,
                                p_end_at: plan.end_at,
                                p_is_active: !plan.is_active,
                              }),
                            plan.is_active ? "Plan paused." : "Plan resumed.",
                          )
                        }
                        disabled={busy}
                      >
                        {plan.is_active ? "Pause" : "Resume"}
                      </Button>
                      <Button variant="danger" onClick={() => void run(() => controlApi.deletePlan(plan.id), "Plan deleted. Tickets it already created stay on the board.")} disabled={busy}>
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {note && <div className="mt-3 rounded-[10px] border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[12px] text-[#C7D3E3]">{note}</div>}
      </Panel>

      {form && (
        <Modal
          title="New recurring plan"
          onClose={() => setForm(null)}
          footer={
            <div className="flex justify-end gap-2">
              <Button onClick={() => setForm(null)}>Cancel</Button>
              <Button variant="primary" onClick={() => void submit()} disabled={busy || !form.title.trim() || !form.site_id}>
                Create plan
              </Button>
            </div>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Plan title">
                <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className={inputClass} placeholder="Monthly hall inspection" />
              </Field>
            </div>
            <Field label="Site">
              <select value={form.site_id} onChange={(event) => setForm({ ...form, site_id: event.target.value })} className={inputClass}>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Template">
              <select value={form.template_id} onChange={(event) => setForm({ ...form, template_id: event.target.value })} className={inputClass}>
                <option value="">No template</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Cadence">
              <select value={form.cadence} onChange={(event) => setForm({ ...form, cadence: event.target.value as Cadence })} className={inputClass}>
                {CADENCES.map((cadence) => (
                  <option key={cadence} value={cadence}>
                    {humanise(cadence)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Every N periods">
              <input value={form.interval_count} onChange={(event) => setForm({ ...form, interval_count: event.target.value })} inputMode="numeric" className={inputClass} />
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
            <Field label="Category">
              <input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className={inputClass} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Description">
                <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} className={inputClass} />
              </Field>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
