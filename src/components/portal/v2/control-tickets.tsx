"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckSquare, RefreshCw, Tag, Users } from "lucide-react";
import {
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  controlApi,
  controlReads,
  describeError,
  humanise,
  slaLabel,
  statusTone,
  type BulkAction,
  type BulkTicketRow,
  type PortalUser,
} from "@/lib/portal-v2";
import { Button, Empty, ErrorNote, Loading, Panel, Pill, TableShell, inputClass } from "@/components/portal/v2/ui";

/** R2 bulk operations board: select many tickets, act once, audit everything. */
export function ControlTickets({ canAssign }: { canAssign: boolean }) {
  const [rows, setRows] = useState<BulkTicketRow[]>([]);
  const [engineers, setEngineers] = useState<PortalUser[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [action, setAction] = useState<BulkAction>("status");
  const [value, setValue] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const tickets = await controlReads.tickets();
      setRows(tickets);
      setSelected((current) => new Set([...current].filter((id) => tickets.some((ticket) => ticket.id === id))));
      if (canAssign) {
        try {
          const users = await controlApi.listUsers();
          setEngineers(users.filter((user) => user.role === "freelancer" || user.role === "staff"));
        } catch {
          setEngineers([]);
        }
      }
    } catch (caught) {
      setError(describeError(caught).message);
    } finally {
      setLoading(false);
    }
  }, [canAssign]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter && row.status !== statusFilter) return false;
      if (!needle) return true;
      return (
        row.title.toLowerCase().includes(needle) ||
        String(row.ticket_number).includes(needle) ||
        row.tags.some((tag) => tag.toLowerCase().includes(needle))
      );
    });
  }, [rows, filter, statusFilter]);

  const allVisibleSelected = visible.length > 0 && visible.every((row) => selected.has(row.id));

  const toggleAll = () => {
    setSelected((current) => {
      const next = new Set(current);
      if (allVisibleSelected) {
        visible.forEach((row) => next.delete(row.id));
      } else {
        visible.forEach((row) => next.add(row.id));
      }
      return next;
    });
  };

  const toggle = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const optionValues = (): string[] => {
    if (action === "status") return [...TICKET_STATUSES];
    if (action === "priority") return [...TICKET_PRIORITIES];
    if (action === "assign") return engineers.map((engineer) => engineer.id);
    return [];
  };

  const apply = async () => {
    if (selected.size === 0) {
      setNote("Select at least one ticket first.");
      return;
    }
    if ((action === "assign" || action === "tag") && !value.trim()) {
      setNote(action === "assign" ? "Choose an engineer." : "Type a tag to add.");
      return;
    }
    setBusy(true);
    setNote("");
    try {
      const changed = await controlApi.bulkUpdate([...selected], action, value.trim() || null);
      setNote(`${humanise(action)} applied to ${changed} ticket(s). Every change is in the ticket event log.`);
      setSelected(new Set());
      setValue("");
      await load();
    } catch (caught) {
      setNote(describeError(caught).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && <ErrorNote message={error} onRetry={() => void load()} />}

      <Panel
        title="Bulk operations"
        subtitle="Actions run inside one database transaction per ticket, with a permission check and an audit event each"
        action={
          <Button onClick={() => void load()} disabled={loading}>
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </Button>
        }
      >
        <div className="flex flex-wrap items-end gap-2">
          <label className="min-w-[160px] flex-1">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-[#7E8CA0]">Action</span>
            <select value={action} onChange={(event) => { setAction(event.target.value as BulkAction); setValue(""); }} className={inputClass}>
              <option value="status">Change status</option>
              <option value="priority">Change priority</option>
              {canAssign && <option value="assign">Assign lead engineer</option>}
              <option value="tag">Add tag</option>
              <option value="close">Close tickets</option>
            </select>
          </label>

          <label className="min-w-[160px] flex-1">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-[#7E8CA0]">
              {action === "tag" ? "Tag" : "Value"}
            </span>
            {action === "tag" ? (
              <input value={value} onChange={(event) => setValue(event.target.value)} placeholder="e.g. night-shift" className={inputClass} />
            ) : action === "close" ? (
              <input value="closed" readOnly className={`${inputClass} opacity-60`} />
            ) : (
              <select value={value} onChange={(event) => setValue(event.target.value)} className={inputClass}>
                <option value="">Choose…</option>
                {optionValues().map((option) => (
                  <option key={option} value={option}>
                    {action === "assign"
                      ? engineers.find((engineer) => engineer.id === option)?.full_name ?? option
                      : humanise(option)}
                  </option>
                ))}
              </select>
            )}
          </label>

          <Button variant="primary" onClick={() => void apply()} disabled={busy || selected.size === 0}>
            <CheckSquare size={13} /> Apply to {selected.size}
          </Button>
        </div>

        {note && <div className="mt-3 rounded-[10px] border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[12px] text-[#C7D3E3]">{note}</div>}

        <div className="mt-3 flex flex-wrap gap-2">
          <input
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Filter by title, number or tag"
            className={`${inputClass} max-w-[260px]`}
          />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={`${inputClass} max-w-[190px]`}>
            <option value="">All statuses</option>
            {TICKET_STATUSES.map((status) => (
              <option key={status} value={status}>
                {humanise(status)}
              </option>
            ))}
          </select>
          <span className="ml-auto self-center font-mono text-[10px] uppercase tracking-[0.14em] text-[#7E8CA0]">
            {visible.length} shown · {selected.size} selected
          </span>
        </div>
      </Panel>

      <Panel title="Tickets" subtitle="Newest 120 tickets within your access scope">
        {loading ? (
          <Loading label="Loading tickets" />
        ) : visible.length === 0 ? (
          <Empty
            title="No tickets match"
            body="Clear the filters, or seed the demo dataset from the Overview tab to get a realistic board."
          />
        ) : (
          <TableShell head={["", "Ticket", "Status", "Priority", "SLA", "Tags", "Crew"]}>
            <tr>
              <td className="border-b border-white/[0.06] px-3 py-2">
                <input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} aria-label="Select all visible tickets" />
              </td>
              <td className="border-b border-white/[0.06] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#7E8CA0]" colSpan={6}>
                select all visible
              </td>
            </tr>
            {visible.map((row) => (
              <tr key={row.id} className="hover:bg-white/[0.02]">
                <td className="border-b border-white/[0.06] px-3 py-2.5 align-top">
                  <input
                    type="checkbox"
                    checked={selected.has(row.id)}
                    onChange={() => toggle(row.id)}
                    aria-label={`Select ticket ${row.ticket_number}`}
                  />
                </td>
                <td className="border-b border-white/[0.06] px-3 py-2.5 align-top">
                  <div className="text-[12.5px] text-[#E8EEF9]">{row.title}</div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#7E8CA0]">
                    TM-{String(row.ticket_number).padStart(5, "0")}
                    {row.scheduled_for ? ` · visit ${new Date(row.scheduled_for).toLocaleDateString("en-GB")}` : ""}
                  </div>
                </td>
                <td className="border-b border-white/[0.06] px-3 py-2.5 align-top">
                  <Pill tone={statusTone(row.status)}>{humanise(row.status)}</Pill>
                </td>
                <td className="border-b border-white/[0.06] px-3 py-2.5 align-top">
                  <Pill tone={statusTone(row.priority)}>{humanise(row.priority)}</Pill>
                </td>
                <td className="border-b border-white/[0.06] px-3 py-2.5 align-top font-mono text-[10px] uppercase tracking-[0.1em] text-[#9AA9BC]">
                  {slaLabel(row.sla_due_at)}
                </td>
                <td className="border-b border-white/[0.06] px-3 py-2.5 align-top">
                  <div className="flex flex-wrap gap-1">
                    {row.tags.length === 0 ? (
                      <span className="text-[11px] text-[#5F6F84]">—</span>
                    ) : (
                      row.tags.map((tag) => (
                        <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-[2px] font-mono text-[9px] uppercase tracking-[0.1em] text-[#AEBBCC]">
                          <Tag size={9} /> {tag}
                        </span>
                      ))
                    )}
                  </div>
                </td>
                <td className="border-b border-white/[0.06] px-3 py-2.5 align-top font-mono text-[10px] uppercase tracking-[0.1em] text-[#9AA9BC]">
                  {row.assigned_to ? (
                    <span className="inline-flex items-center gap-1">
                      <Users size={10} /> {engineers.find((engineer) => engineer.id === row.assigned_to)?.full_name ?? "assigned"}
                    </span>
                  ) : (
                    <span className="text-[#FFB020]">unassigned</span>
                  )}
                </td>
              </tr>
            ))}
          </TableShell>
        )}
      </Panel>
    </div>
  );
}
