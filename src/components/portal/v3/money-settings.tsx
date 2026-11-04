"use client";

import { useState } from "react";
import { RefreshCw, ShieldAlert, Sparkles, Trash2 } from "lucide-react";
import { MONEY_FLAGS, moneyApi, moneyError } from "@/lib/portal-money";
import { controlApi } from "@/lib/portal-v2";
import { Button, Panel, Pill } from "@/components/portal/v2/ui";

const CONTROLS: Array<{ key: string; label: string; body: string; consequence: string }> = [
  {
    key: MONEY_FLAGS.sendQuotes,
    label: "Send quotes",
    body: "Unlocks moving a quote from draft to sent, so a client can accept or decline it.",
    consequence: "While off, every quote stays a private draft.",
  },
  {
    key: MONEY_FLAGS.sendInvoices,
    label: "Issue invoices",
    body: "Unlocks issuing an invoice with a due date. Issued invoices become immutable — void instead of edit.",
    consequence: "While off, invoices exist only as drafts inside the portal.",
  },
  {
    key: MONEY_FLAGS.recordPayments,
    label: "Record payments",
    body: "Unlocks booking money received against an issued invoice, which moves it to part-paid or paid.",
    consequence: "While off, balances show what was billed, never what was collected.",
  },
];

/** Admin surface for the three money guards, plus the demo data controls. */
export function MoneySettings({ flags, onChanged }: { flags: Record<string, boolean>; onChanged: () => void }) {
  const [busy, setBusy] = useState<string>("");
  const [note, setNote] = useState("");
  const [demoNote, setDemoNote] = useState("");

  const toggle = async (key: string, enabled: boolean) => {
    setBusy(key);
    setNote("");
    try {
      await moneyApi.setFlag(key, enabled);
      setNote(`${key} is now ${enabled ? "on" : "off"}. This applies to everyone immediately.`);
      onChanged();
    } catch (caught) {
      setNote(moneyError(caught).message);
    } finally {
      setBusy("");
    }
  };

  const runDemo = async (mode: "seed" | "purge") => {
    setBusy(mode);
    setDemoNote("");
    try {
      if (mode === "seed") {
        const result = await moneyApi.seedDemo();
        setDemoNote(`Demo created: client "${result.client}", quote ${result.quote}, invoice ${result.invoice}. All rows are tagged is_demo.`);
      } else {
        const removed = await controlApi.purgeDemo();
        setDemoNote(`Purged ${removed} demo organization${removed === 1 ? "" : "s"} and every row attached to them.`);
      }
      onChanged();
    } catch (caught) {
      setDemoNote(moneyError(caught).message);
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="space-y-4">
      <Panel title="Money guard" subtitle="Three switches that decide whether anything client-facing can happen">
        <div className="mb-3 flex items-start gap-2 rounded-[10px] border border-[#FFB020]/25 bg-[#FFB020]/10 px-3 py-2 text-[11.5px] leading-relaxed text-[#FFD48A]">
          <ShieldAlert size={14} className="mt-[1px] shrink-0" />
          <span>
            These are database feature flags, not UI toggles. Even a hand-crafted request is refused while a flag is off, and the refusal is
            logged in the audit trail with your name on it.
          </span>
        </div>

        <ul className="divide-y divide-white/[0.06]">
          {CONTROLS.map((control) => {
            const enabled = Boolean(flags[control.key]);
            return (
              <li key={control.key} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0 max-w-[52ch]">
                  <div className="flex items-center gap-2">
                    <span className="text-[12.5px] text-[#E8EEF9]">{control.label}</span>
                    <Pill tone={enabled ? "good" : "warn"}>{enabled ? "on" : "off"}</Pill>
                    <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-[#5F6F84]">{control.key}</span>
                  </div>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-[#8A99AB]">{control.body}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-[#5F6F84]">{control.consequence}</p>
                </div>
                <Button
                  variant={enabled ? "ghost" : "primary"}
                  disabled={busy === control.key}
                  onClick={() => void toggle(control.key, !enabled)}
                >
                  {busy === control.key ? <RefreshCw size={12} className="animate-spin" /> : null}
                  {enabled ? "Switch off" : "Enable"}
                </Button>
              </li>
            );
          })}
        </ul>

        {note && <div className="mt-3 rounded-[10px] border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[12px] text-[#C7D3E3]">{note}</div>}
      </Panel>

      <Panel title="Demo data" subtitle="A tagged demo client with a quote and an invoice, removable in one action">
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" disabled={busy === "seed"} onClick={() => void runDemo("seed")}>
            <Sparkles size={13} /> Create money demo
          </Button>
          <Button variant="danger" disabled={busy === "purge"} onClick={() => void runDemo("purge")}>
            <Trash2 size={13} /> Purge all demo data
          </Button>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-[#5F6F84]">
          Purge removes demo payments, invoices, quotes, rate cards and the demo client with its sites and tickets. Real records are never
          touched, because every delete is keyed on <span className="font-mono">is_demo</span>.
        </p>
        {demoNote && <div className="mt-3 rounded-[10px] border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[12px] text-[#C7D3E3]">{demoNote}</div>}
      </Panel>
    </div>
  );
}
