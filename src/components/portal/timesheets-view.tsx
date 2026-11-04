"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Clock3,
  DollarSign,
  FileCheck2,
  Filter,
  LoaderCircle,
  Pause,
  Play,
  Plus,
  ShieldCheck,
  StopCircle,
  X,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase-browser";

export type TimeEntry = {
  id: string;
  ticket_id: string;
  engineer_id: string;
  category: "travel" | "on_site_work" | "remote_work" | "waiting";
  started_at: string;
  ended_at: string | null;
  minutes: number | null;
  source: "timer" | "manual";
  approval_status: "draft" | "submitted" | "approved" | "rejected";
  notes: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at: string;
  ticket_title?: string;
  ticket_number?: number;
  engineer_name?: string;
};

interface TimesheetsViewProps {
  currentUserId: string;
  currentUserRole: "admin" | "staff" | "freelancer" | "client";
  tickets: Array<{ id: string; ticket_number: number; title: string }>;
  onNotify: (message: string) => void;
}

const CATEGORY_LABELS = {
  travel: "Transit / Travel",
  on_site_work: "On-Site Physical Hands",
  remote_work: "Remote Support & Config",
  waiting: "Access / Security Waiting",
};

const STATUS_PILLS = {
  draft: { label: "Draft (Running)", color: "#7C9BFF", bg: "rgba(124,155,255,0.12)" },
  submitted: { label: "Pending Approval", color: "#FFB84D", bg: "rgba(255,184,77,0.12)" },
  approved: { label: "Approved for Payout", color: "#3DDC97", bg: "rgba(61,220,151,0.12)" },
  rejected: { label: "Revision Requested", color: "#FF5C70", bg: "rgba(255,92,112,0.12)" },
};

export function TimesheetsView({
  currentUserId,
  currentUserRole,
  tickets,
  onNotify,
}: TimesheetsViewProps) {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [modalOpen, setModalOpen] = useState(false);

  // Active Timer state
  const [activeTimerTicket, setActiveTimerTicket] = useState(tickets[0]?.id || "");
  const [activeTimerCategory, setActiveTimerCategory] = useState<
    "travel" | "on_site_work" | "remote_work" | "waiting"
  >("on_site_work");
  const [activeTimerEntryId, setActiveTimerEntryId] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [timerRunning, setTimerRunning] = useState(false);

  // Manual Entry Form state
  const [manualTicket, setManualTicket] = useState(tickets[0]?.id || "");
  const [manualCategory, setManualCategory] = useState<
    "travel" | "on_site_work" | "remote_work" | "waiting"
  >("on_site_work");
  const [manualHours, setManualHours] = useState("1.5");
  const [manualNotes, setManualNotes] = useState("");
  const [savingManual, setSavingManual] = useState(false);

  // Stop Timer / Approval loading states
  const [actionBusy, setActionBusy] = useState(false);

  const isStaffOrAdmin = currentUserRole === "admin" || currentUserRole === "staff";

  // Stopwatch ticking
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerRunning]);

  const loadEntries = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError("");

    try {
      let query = supabase
        .from("time_entries")
        .select(
          "id, ticket_id, engineer_id, category, started_at, ended_at, minutes, source, approval_status, notes, approved_by, approved_at, created_at"
        )
        .order("created_at", { ascending: false });

      if (currentUserRole === "freelancer") {
        query = query.eq("engineer_id", currentUserId);
      }

      const { data, error: err } = await query;
      if (err) {
        setError("Could not load timesheets data.");
        setEntries([]);
        setLoading(false);
        return;
      }

      const rows = (data || []) as TimeEntry[];

      // Map ticket titles and numbers
      const ticketMap = new Map(tickets.map((t) => [t.id, t]));
      const enriched = rows.map((r) => {
        const t = ticketMap.get(r.ticket_id);
        return {
          ...r,
          ticket_title: t?.title || "Operational Ticket",
          ticket_number: t?.ticket_number,
        };
      });

      setEntries(enriched);

      // Check if there is an active running timer for current user
      const running = rows.find(
        (r) => r.engineer_id === currentUserId && r.ended_at === null
      );
      if (running) {
        setActiveTimerEntryId(running.id);
        setActiveTimerTicket(running.ticket_id);
        setActiveTimerCategory(running.category);
        const elapsed = Math.floor(
          (Date.now() - new Date(running.started_at).getTime()) / 1000
        );
        setTimerSeconds(Math.max(0, elapsed));
        setTimerRunning(true);
      }
    } catch {
      setError("An unexpected error occurred loading timesheets.");
    } finally {
      setLoading(false);
    }
  }, [currentUserId, currentUserRole, tickets]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  // Start Live Timer
  const startTimer = async () => {
    if (!supabase || !activeTimerTicket) return;
    setActionBusy(true);

    const startedAt = new Date().toISOString();

    try {
      const { data, error: rpcErr } = await supabase.rpc("log_time_entry", {
        p_ticket_id: activeTimerTicket,
        p_category: activeTimerCategory,
        p_started_at: startedAt,
        p_ended_at: null,
        p_source: "timer",
        p_notes: "Live stopwatch session started from mobile portal",
      });

      if (rpcErr) {
        // Fallback to table insert
        const { data: insData, error: insErr } = await supabase
          .from("time_entries")
          .insert({
            ticket_id: activeTimerTicket,
            engineer_id: currentUserId,
            category: activeTimerCategory,
            started_at: startedAt,
            ended_at: null,
            source: "timer",
            approval_status: "draft",
          })
          .select("id")
          .single();

        if (insErr) {
          onNotify("Failed to start timer. Check permissions.");
          setActionBusy(false);
          return;
        }
        setActiveTimerEntryId(insData?.id || null);
      } else {
        setActiveTimerEntryId(String(data));
      }

      setTimerSeconds(0);
      setTimerRunning(true);
      onNotify("Stopwatch session started.");
      await loadEntries();
    } catch {
      onNotify("Error initiating timer.");
    } finally {
      setActionBusy(false);
    }
  };

  // Stop Live Timer
  const stopTimer = async () => {
    if (!supabase || !activeTimerEntryId) return;
    setActionBusy(true);

    const endedAt = new Date().toISOString();

    try {
      const { error: updErr } = await supabase
        .from("time_entries")
        .update({
          ended_at: endedAt,
          approval_status: "submitted",
        })
        .eq("id", activeTimerEntryId);

      if (updErr) {
        onNotify("Failed to record stopped time.");
      } else {
        onNotify("Timer stopped. Timesheet submitted for review.");
        setTimerRunning(false);
        setActiveTimerEntryId(null);
        setTimerSeconds(0);
        await loadEntries();
      }
    } catch {
      onNotify("Error stopping timer.");
    } finally {
      setActionBusy(false);
    }
  };

  // Submit Manual Time Entry
  const handleSaveManual = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase || !manualTicket) return;
    setSavingManual(true);

    const hours = parseFloat(manualHours) || 1;
    const now = new Date();
    const startedAt = new Date(now.getTime() - hours * 3600 * 1000).toISOString();
    const endedAt = now.toISOString();

    try {
      const { error: insErr } = await supabase.from("time_entries").insert({
        ticket_id: manualTicket,
        engineer_id: currentUserId,
        category: manualCategory,
        started_at: startedAt,
        ended_at: endedAt,
        source: "manual",
        approval_status: "submitted",
        notes: manualNotes.trim() || "Manual field time entry",
      });

      if (insErr) {
        onNotify("Failed to log manual hours.");
      } else {
        onNotify("Manual hours logged and submitted for sign-off.");
        setModalOpen(false);
        setManualNotes("");
        await loadEntries();
      }
    } catch {
      onNotify("Error logging manual hours.");
    } finally {
      setSavingManual(false);
    }
  };

  // Admin / Staff Approval Action
  const handleApproval = async (entryId: string, status: "approved" | "rejected") => {
    if (!supabase || !isStaffOrAdmin) return;
    setActionBusy(true);

    try {
      const { error: rpcErr } = await supabase.rpc("approve_time_entry", {
        p_entry_id: entryId,
        p_status: status,
      });

      if (rpcErr) {
        // Fallback update
        const { error: updErr } = await supabase
          .from("time_entries")
          .update({
            approval_status: status,
            approved_by: currentUserId,
            approved_at: new Date().toISOString(),
          })
          .eq("id", entryId);

        if (updErr) {
          onNotify("Failed to update approval status.");
          setActionBusy(false);
          return;
        }
      }

      onNotify(`Time entry ${status}.`);
      await loadEntries();
    } catch {
      onNotify("Failed to process approval.");
    } finally {
      setActionBusy(false);
    }
  };

  // Aggregated Stats
  const { totalMinutes, pendingMinutes, approvedMinutes } = useMemo(() => {
    let total = 0;
    let pending = 0;
    let approved = 0;

    for (const e of entries) {
      const m = e.minutes || 0;
      total += m;
      if (e.approval_status === "submitted") pending += m;
      if (e.approval_status === "approved") approved += m;
    }

    return { totalMinutes: total, pendingMinutes: pending, approvedMinutes: approved };
  }, [entries]);

  const filteredEntries = useMemo(() => {
    if (statusFilter === "all") return entries;
    return entries.filter((e) => e.approval_status === statusFilter);
  }, [entries, statusFilter]);

  const formatHours = (mins: number) => {
    const h = (mins / 60).toFixed(1);
    return `${h}h`;
  };

  const formatTimerClock = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(
      s
    ).padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Entry Actions */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mono-label flex items-center gap-2 text-[9px] text-[#38E1FF]">
            <Clock3 size={12} className="text-[#38E1FF]" />
            HOURS LOGGING & APPROVAL WORKFLOW
          </div>
          <h2 className="mt-1 text-[20px] font-light text-[#E8EEF9]">
            Timesheets & Payout Ledger
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {currentUserRole !== "client" && (
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1.5 rounded-full border border-white/[0.09] bg-white/[0.02] px-3.5 py-2 text-[10px] text-[#C6D2E0] transition hover:border-[#38E1FF]/30 hover:text-white"
            >
              <Plus size={12} className="text-[#38E1FF]" />
              Log Manual Hours
            </button>
          )}

          <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#0E1522] px-3 py-1.5 text-[11px]">
            <Filter size={12} className="text-[#6F7E94]" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-[11px] text-[#C5D0DF] outline-none"
            >
              <option value="all" className="bg-[#101724]">
                All statuses ({entries.length})
              </option>
              <option value="submitted" className="bg-[#101724]">
                Pending Approval
              </option>
              <option value="approved" className="bg-[#101724]">
                Approved
              </option>
              <option value="rejected" className="bg-[#101724]">
                Rejected
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-white/[0.07] bg-[#0B1018]/90 p-4">
          <div className="mono-label text-[8px] text-[#718096]">TOTAL HOURS RECORDED</div>
          <div className="mt-2 text-[24px] font-light text-[#E8EEF9]">
            {formatHours(totalMinutes)}
          </div>
          <div className="mt-1 text-[9px] text-[#8695AA]">Across all accessible tickets</div>
        </div>
        <div className="rounded-2xl border border-white/[0.07] bg-[#0B1018]/90 p-4">
          <div className="mono-label text-[8px] text-[#718096]">PENDING APPROVAL</div>
          <div className="mt-2 text-[24px] font-light text-[#FFB84D]">
            {formatHours(pendingMinutes)}
          </div>
          <div className="mt-1 text-[9px] text-[#8695AA]">Awaiting coordinator sign-off</div>
        </div>
        <div className="rounded-2xl border border-white/[0.07] bg-[#0B1018]/90 p-4">
          <div className="mono-label text-[8px] text-[#718096]">APPROVED BILLABLE</div>
          <div className="mt-2 text-[24px] font-light text-[#3DDC97]">
            {formatHours(approvedMinutes)}
          </div>
          <div className="mt-1 text-[9px] text-[#8695AA]">Validated for payroll / invoice</div>
        </div>
        <div className="rounded-2xl border border-white/[0.07] bg-[#0B1018]/90 p-4">
          <div className="mono-label text-[8px] text-[#718096]">SETTLEMENT CYCLES</div>
          <div className="mt-2 flex items-center gap-1.5 text-[14px] font-medium text-[#38E1FF]">
            <DollarSign size={16} /> Bi-Weekly EUR
          </div>
          <div className="mt-1 text-[9px] text-[#8695AA]">Direct bank / Stripe Connect</div>
        </div>
      </div>

      {/* Field Engineer Live Timer Banner */}
      {currentUserRole !== "client" && (
        <div className="rounded-2xl border border-[#38E1FF]/20 bg-[#38E1FF]/[0.035] p-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="mono-label flex items-center gap-1.5 text-[8px] text-[#38E1FF]">
                <Clock size={12} /> FIELD ENGINEER STOPWATCH
              </div>
              <h3 className="mt-1 text-[15px] font-medium text-[#E8EEF9]">
                Active Time Tracker
              </h3>
              <p className="mt-0.5 text-[10px] text-[#8090A4]">
                Clock work hours automatically on your mobile device while on site.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="rounded-xl border border-white/[0.08] bg-[#0B1018] px-4 py-2 font-mono text-[22px] tracking-wider text-[#38E1FF]">
                {formatTimerClock(timerSeconds)}
              </div>

              {timerRunning ? (
                <button
                  onClick={stopTimer}
                  disabled={actionBusy}
                  className="flex items-center gap-2 rounded-full bg-[#FF5C70] px-4 py-2 text-[11px] font-semibold text-white shadow-lg shadow-[#FF5C70]/20 transition hover:bg-[#ff7586]"
                >
                  <StopCircle size={15} />
                  <span>Stop & Submit</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <select
                    value={activeTimerCategory}
                    onChange={(e) => setActiveTimerCategory(e.target.value as any)}
                    className="h-9 rounded-xl border border-white/[0.08] bg-[#0B1018] px-3 text-[10px] text-[#B8C6D6] outline-none"
                  >
                    <option value="on_site_work">On-Site Work</option>
                    <option value="travel">Transit / Travel</option>
                    <option value="remote_work">Remote Support</option>
                    <option value="waiting">Security Waiting</option>
                  </select>

                  <button
                    onClick={startTimer}
                    disabled={actionBusy}
                    className="flex items-center gap-2 rounded-full bg-[#38E1FF] px-4 py-2 text-[11px] font-semibold text-[#04141A] shadow-lg shadow-[#38E1FF]/20 transition hover:bg-[#72EAFF]"
                  >
                    <Play size={14} fill="#04141A" />
                    <span>Start Timer</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Timesheet Entries Table */}
      <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0B1018]/90">
        <div className="border-b border-white/[0.06] p-4 sm:p-5">
          <h3 className="text-[13px] font-medium text-[#E3EAF4]">
            Recorded Work Sessions & Entries
          </h3>
          <p className="mt-1 text-[10px] text-[#718096]">
            Every session tracks start/end times and is immutably logged for audit.
          </p>
        </div>

        {error && (
          <div className="m-4 flex items-center gap-2 rounded-xl border border-[#FF5C70]/20 bg-[#FF5C70]/[0.05] p-3 text-[10px] text-[#FF9AA7]">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex h-40 items-center justify-center text-[10px] text-[#7E8BA0]">
            <LoaderCircle size={15} className="mr-2 animate-spin text-[#38E1FF]" />
            Loading timesheet ledger…
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center px-4 py-8 text-center text-[#6E7D93]">
            <FileCheck2 size={24} className="mb-2 text-[#38E1FF]" />
            <p className="text-[12px] font-medium text-[#C8D3E2]">No timesheet records found</p>
            <p className="mt-1 text-[10px]">
              Start the stopwatch or log manual hours above to register time entries.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="border-b border-white/[0.05] text-[8px] text-[#657287]">
                  <th className="px-5 py-3 mono-label">TICKET & CATEGORY</th>
                  <th className="px-5 py-3 mono-label">START / FINISH</th>
                  <th className="px-5 py-3 mono-label">DURATION</th>
                  <th className="px-5 py-3 mono-label">METHOD</th>
                  <th className="px-5 py-3 mono-label">APPROVAL STATUS</th>
                  {isStaffOrAdmin && <th className="px-5 py-3 mono-label">ACTION</th>}
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => {
                  const pill = STATUS_PILLS[entry.approval_status];
                  return (
                    <tr
                      key={entry.id}
                      className="border-b border-white/[0.04] transition hover:bg-white/[0.02]"
                    >
                      <td className="px-5 py-3.5">
                        <div className="text-[11px] font-medium text-[#D8E1ED]">
                          {entry.ticket_title}
                        </div>
                        <div className="mt-0.5 text-[9px] text-[#748296]">
                          {CATEGORY_LABELS[entry.category] || entry.category}
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-[10px] text-[#A6B4C6]">
                        <div>{new Date(entry.started_at).toLocaleString()}</div>
                        {entry.ended_at && (
                          <div className="text-[9px] text-[#67768C]">
                            ➔ {new Date(entry.ended_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-3.5 font-mono text-[11px] font-medium text-[#38E1FF]">
                        {entry.minutes !== null ? formatHours(entry.minutes) : "In progress"}
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="rounded bg-white/[0.05] px-2 py-0.5 font-mono text-[9px] uppercase text-[#8897AB]">
                          {entry.source}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-medium"
                          style={{
                            color: pill.color,
                            background: pill.bg,
                            border: `1px solid ${pill.color}35`,
                          }}
                        >
                          {pill.label}
                        </span>
                      </td>

                      {isStaffOrAdmin && (
                        <td className="px-5 py-3.5">
                          {entry.approval_status === "submitted" ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleApproval(entry.id, "approved")}
                                disabled={actionBusy}
                                className="flex items-center gap-1 rounded-lg border border-[#3DDC97]/30 bg-[#3DDC97]/10 px-2 py-1 text-[9px] font-medium text-[#3DDC97] hover:bg-[#3DDC97]/20"
                              >
                                <CheckCircle2 size={11} /> Approve
                              </button>
                              <button
                                onClick={() => handleApproval(entry.id, "rejected")}
                                disabled={actionBusy}
                                className="flex items-center gap-1 rounded-lg border border-[#FF5C70]/30 bg-[#FF5C70]/10 px-2 py-1 text-[9px] font-medium text-[#FF5C70] hover:bg-[#FF5C70]/20"
                              >
                                <XCircle size={11} /> Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-[9px] text-[#556377]">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Manual Time Entry Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSaveManual}
            className="w-full max-w-md rounded-2xl border border-white/[0.1] bg-[#0B1018] p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div>
                <span className="mono-label text-[8px] text-[#38E1FF]">
                  MANUAL TIME RECORD
                </span>
                <h3 className="mt-1 text-[15px] font-medium text-[#E8EEF9]">
                  Log past work hours
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-[#7F8D9F] hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 space-y-3.5">
              <label className="block">
                <span className="mb-1.5 block text-[10px] text-[#A9B6C6]">Ticket</span>
                <select
                  required
                  value={manualTicket}
                  onChange={(e) => setManualTicket(e.target.value)}
                  className="h-10 w-full rounded-xl border border-white/[0.09] bg-[#101724] px-3 text-[11px] text-white outline-none"
                >
                  {tickets.map((t) => (
                    <option key={t.id} value={t.id}>
                      TM-{t.ticket_number}: {t.title}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-[10px] text-[#A9B6C6]">Category</span>
                  <select
                    value={manualCategory}
                    onChange={(e) => setManualCategory(e.target.value as any)}
                    className="h-10 w-full rounded-xl border border-white/[0.09] bg-[#101724] px-3 text-[11px] text-white outline-none"
                  >
                    <option value="on_site_work">On-Site Work</option>
                    <option value="travel">Transit / Travel</option>
                    <option value="remote_work">Remote Support</option>
                    <option value="waiting">Security Waiting</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[10px] text-[#A9B6C6]">Hours</span>
                  <input
                    type="number"
                    step="0.25"
                    min="0.25"
                    max="24"
                    required
                    value={manualHours}
                    onChange={(e) => setManualHours(e.target.value)}
                    className="h-10 w-full rounded-xl border border-white/[0.09] bg-white/[0.03] px-3 text-[11px] text-white outline-none focus:border-[#38E1FF]/40"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-[10px] text-[#A9B6C6]">Work Summary & Notes</span>
                <textarea
                  rows={2}
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="Specific tasks completed, rack units touched, optical tests conducted…"
                  className="w-full resize-none rounded-xl border border-white/[0.09] bg-white/[0.03] p-3 text-[11px] text-white outline-none placeholder:text-[#58667A] focus:border-[#38E1FF]/40"
                />
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2 border-t border-white/[0.07] pt-4">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-full border border-white/[0.09] px-4 py-2 text-[10px] text-[#A3B0C2]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingManual}
                className="rounded-full bg-[#38E1FF] px-4 py-2 text-[10px] font-semibold text-[#04141A] transition hover:bg-[#6CE9FF]"
              >
                Submit for Approval
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
