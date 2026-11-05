"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BadgeEuro, GraduationCap, RefreshCw, Wrench } from "lucide-react";
import {
  controlApi,
  describeError,
  displayRate,
  humanise,
  verificationTone,
  type EngineerRow,
  type VerificationStatus,
} from "@/lib/portal-v2";
import { Button, Empty, ErrorNote, Field, Loading, Modal, Panel, Pill, TableShell, inputClass } from "@/components/portal/v2/ui";

const VERIFICATION: VerificationStatus[] = ["pending", "approved", "rejected", "suspended"];

/**
 * R4 Engineer directory (§3.5). Rates, skills, countries and verification for the
 * people who actually do the work. Pay rates only render when the account holds
 * people.pay_rates; verification moves only succeed with people.onboarding.
 * Labour cost in the margin report reads the rate set here.
 */
export function ControlEngineers({
  canEditRates,
  canEditVerification,
}: {
  canEditRates: boolean;
  canEditVerification: boolean;
}) {
  const [engineers, setEngineers] = useState<EngineerRow[]>([]);
  const [ratesVisible, setRatesVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState<EngineerRow | null>(null);
  const [rate, setRate] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [skills, setSkills] = useState("");
  const [countries, setCountries] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await controlApi.listEngineers();
      setEngineers(payload.engineers);
      setRatesVisible(payload.ratesVisible);
    } catch (caught) {
      setError(describeError(caught).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    return engineers.reduce(
      (acc, engineer) => {
        acc.total += 1;
        if (engineer.verification_status === "approved") acc.approved += 1;
        if (engineer.verification_status === "pending") acc.pending += 1;
        if (engineer.hourly_rate === null) acc.unpriced += 1;
        return acc;
      },
      { total: 0, approved: 0, pending: 0, unpriced: 0 },
    );
  }, [engineers]);

  const openEditor = (engineer: EngineerRow) => {
    setEditing(engineer);
    setRate(engineer.hourly_rate === null ? "" : String(engineer.hourly_rate));
    setCurrency(engineer.currency || "EUR");
    setSkills(engineer.skills.join(", "));
    setCountries(engineer.countries.join(", "));
    setNote("");
  };

  const submit = async () => {
    if (!editing) return;
    setBusy(true);
    setNote("");
    try {
      const parsedRate = rate.trim() === "" ? null : Number(rate);
      await controlApi.saveEngineerProfile({
        userId: editing.user_id,
        hourlyRate: canEditRates && parsedRate !== null && Number.isFinite(parsedRate) ? parsedRate : null,
        currency: currency.trim().toUpperCase() || "EUR",
        verificationStatus: canEditVerification ? editing.verification_status : null,
        skills: skills
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        countries: countries
          .split(",")
          .map((value) => value.trim().toUpperCase())
          .filter(Boolean),
      });
      setNote(`${editing.full_name} saved.`);
      setEditing(null);
      await load();
    } catch (caught) {
      setNote(describeError(caught).message);
    } finally {
      setBusy(false);
    }
  };

  const setVerification = async (engineer: EngineerRow, status: VerificationStatus) => {
    setBusy(true);
    setNote("");
    try {
      await controlApi.saveEngineerProfile({ userId: engineer.user_id, verificationStatus: status });
      setNote(`${engineer.full_name} is now ${status}.`);
      await load();
    } catch (caught) {
      setNote(describeError(caught).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading && engineers.length === 0) return <Loading label="Loading engineer directory" />;

  return (
    <div className="space-y-4">
      {error && <ErrorNote message={error} onRetry={() => void load()} />}
      {note && <div className="rounded-[10px] border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[12px] text-[#C7D3E3]">{note}</div>}

      <Panel
        title="Engineer directory"
        subtitle="Skills, pay rates and verification — the rate set here prices labour in the margin report"
        action={
          <div className="flex items-center gap-2">
            <Pill tone={ratesVisible ? "good" : "warn"}>{ratesVisible ? "rates visible" : "rates hidden"}</Pill>
            <Button onClick={() => void load()} disabled={loading}>
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
            </Button>
          </div>
        }
      >
        <div className="mb-3 flex flex-wrap gap-2">
          <Pill tone="muted">{counts.total} engineers</Pill>
          <Pill tone="good">{counts.approved} approved</Pill>
          <Pill tone={counts.pending > 0 ? "warn" : "muted"}>{counts.pending} pending</Pill>
          <Pill tone={counts.unpriced > 0 ? "danger" : "good"}>{counts.unpriced} without a rate</Pill>
        </div>

        {engineers.length === 0 ? (
          <Empty
            title="No engineers yet"
            body="Freelancer accounts appear here once an Admin creates them. Add a rate so job costing can price their hours."
          />
        ) : (
          <TableShell head={["Engineer", "Verification", "Rate", "Open tickets", "Hours 30d", ""]}>
            {engineers.map((engineer) => (
              <tr key={engineer.user_id} className="border-b border-white/[0.05]">
                <td className="px-3 py-2">
                  <span className="block text-[12.5px] text-[#E8EEF9]">{engineer.full_name}</span>
                  <span className="block text-[10.5px] text-[#6F7F93]">
                    {engineer.email ?? "no email"} · {engineer.skills.length > 0 ? engineer.skills.slice(0, 3).join(", ") : "no skills recorded"}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <Pill tone={verificationTone(engineer.verification_status)}>{engineer.verification_status}</Pill>
                </td>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-[11.5px] text-[#D7E1EF]">
                  {displayRate(engineer.hourly_rate, ratesVisible, engineer.currency)}
                </td>
                <td className="px-3 py-2 text-[12px] text-[#B9C7D8]">{engineer.open_tickets}</td>
                <td className="px-3 py-2 text-[12px] text-[#B9C7D8]">{engineer.hours_30d}h</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {(canEditRates || canEditVerification) && (
                      <Button onClick={() => openEditor(engineer)}>
                        <Wrench size={12} /> Edit
                      </Button>
                    )}
                    {canEditVerification && engineer.verification_status !== "approved" && (
                      <Button onClick={() => void setVerification(engineer, "approved")} disabled={busy}>
                        <GraduationCap size={12} /> Approve
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </TableShell>
        )}
      </Panel>

      {editing && (
        <Modal title={`Engineer · ${editing.full_name}`} onClose={() => setEditing(null)}>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[1.4fr_0.8fr]">
              <Field label="Hourly rate" hint={canEditRates ? "Used to price approved hours in job costing." : "You do not hold people.edit_rates."}>
                <input
                  className={inputClass}
                  value={rate}
                  onChange={(event) => setRate(event.target.value)}
                  placeholder="35.00"
                  inputMode="decimal"
                  disabled={!canEditRates}
                />
              </Field>
              <Field label="Currency">
                <input
                  className={inputClass}
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value.toUpperCase())}
                  maxLength={3}
                  disabled={!canEditRates}
                />
              </Field>
            </div>

            <Field label="Verification" hint={canEditVerification ? undefined : "You do not hold people.onboarding."}>
              <div className="flex flex-wrap gap-1.5">
                {VERIFICATION.map((status) => (
                  <button
                    key={status}
                    type="button"
                    disabled={!canEditVerification}
                    onClick={() => setEditing({ ...editing, verification_status: status })}
                    className={`rounded-full border px-2.5 py-[4px] font-mono text-[10px] uppercase tracking-[0.12em] transition disabled:opacity-45 ${
                      editing.verification_status === status
                        ? "border-[#29E6FF]/50 bg-[#29E6FF]/15 text-[#9DF3FF]"
                        : "border-white/12 bg-white/[0.03] text-[#8A99AB] hover:border-white/25"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Skills" hint="Comma separated.">
                <input
                  className={inputClass}
                  value={skills}
                  onChange={(event) => setSkills(event.target.value)}
                  placeholder="cabling, rack and stack"
                />
              </Field>
              <Field label="Countries" hint="Comma separated ISO codes.">
                <input
                  className={inputClass}
                  value={countries}
                  onChange={(event) => setCountries(event.target.value)}
                  placeholder="PT, ES, FR"
                />
              </Field>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button onClick={() => setEditing(null)}>Cancel</Button>
              <Button variant="primary" onClick={() => void submit()} disabled={busy}>
                <BadgeEuro size={13} /> Save engineer
              </Button>
            </div>
          </div>
        </Modal>
      )}

      <p className="text-center font-mono text-[9.5px] uppercase tracking-[0.14em] text-[#3F4C5D]">
        {humanise("engineer directory")} · rates hidden without people.pay_rates
      </p>
    </div>
  );
}
