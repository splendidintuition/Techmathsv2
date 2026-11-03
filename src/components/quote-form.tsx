"use client";

import { useEffect, useRef, useState } from "react";
import { IconArrow, IconCheck, ServiceIcon } from "./icons";
import { Btn } from "./ui";

type ServiceOption = { slug: string; title: string; short: string; icon: string };

const TIMELINES = ["Emergency (< 48h)", "2–4 weeks", "1–3 months", "3–6 months", "Planning only"];
const URGENCIES = ["Critical path", "High", "Normal", "Low"];

const STEPS = [
  { id: 1, title: "Services", hint: "What do you need delivered?" },
  { id: 2, title: "Site", hint: "Where is the work?" },
  { id: 3, title: "Volumes", hint: "Rough numbers are enough." },
  { id: 4, title: "Timing", hint: "When does it need to happen?" },
  { id: 5, title: "Contact", hint: "Where do we send the quote?" },
];

type FormState = {
  services: string[];
  country: string;
  siteLocation: string;
  racks: string;
  servers: string;
  ports: string;
  timeline: string;
  urgency: string;
  name: string;
  email: string;
  company: string;
  phone: string;
  message: string;
  consentPrivacy: boolean;
  consentMarketing: boolean;
  website: string; // honeypot
};

const EMPTY: FormState = {
  services: [],
  country: "",
  siteLocation: "",
  racks: "",
  servers: "",
  ports: "",
  timeline: "",
  urgency: "",
  name: "",
  email: "",
  company: "",
  phone: "",
  message: "",
  consentPrivacy: false,
  consentMarketing: false,
  website: "",
};

export function QuoteForm({
  services,
  countries,
  source = "contact",
  presetService,
  presetCountry,
}: {
  services: ServiceOption[];
  countries: string[];
  source?: string;
  presetService?: string;
  presetCountry?: string;
}) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>({
    ...EMPTY,
    services: presetService && services.some((s) => s.slug === presetService) ? [presetService] : [],
    country: presetCountry ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [result, setResult] = useState<{ reference: string; message: string } | null>(null);
  const startedAt = useRef<number>(Date.now());
  const liveRef = useRef<HTMLDivElement>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      if (!e[key as string]) return e;
      const next = { ...e };
      delete next[key as string];
      return next;
    });
  };

  const toggleService = (slug: string) => {
    setForm((f) => ({
      ...f,
      services: f.services.includes(slug) ? f.services.filter((s) => s !== slug) : [...f.services, slug],
    }));
    setErrors((e) => {
      const next = { ...e };
      delete next.services;
      return next;
    });
  };

  useEffect(() => {
    liveRef.current?.focus();
  }, [step]);

  const validate = (s: number): boolean => {
    const e: Record<string, string> = {};
    if (s === 1 && form.services.length === 0) e.services = "Select at least one service.";
    if (s === 2 && !form.country.trim()) e.country = "Select the country where the work takes place.";
    if (s === 5) {
      if (!form.name.trim()) e.name = "Please tell us your name.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) e.email = "Enter a valid work email address.";
      if (!form.consentPrivacy) e.consentPrivacy = "You must accept the privacy notice.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (!validate(step)) return;
    setStep((s) => Math.min(s + 1, STEPS.length));
  };

  const back = () => setStep((s) => Math.max(s - 1, 1));

  const submit = async () => {
    if (!validate(5)) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          services: form.services,
          country: form.country,
          siteLocation: form.siteLocation || undefined,
          racks: form.racks ? Number(form.racks) : undefined,
          servers: form.servers ? Number(form.servers) : undefined,
          ports: form.ports ? Number(form.ports) : undefined,
          timeline: form.timeline || undefined,
          urgency: form.urgency || undefined,
          name: form.name,
          email: form.email,
          company: form.company || undefined,
          phone: form.phone || undefined,
          message: form.message || undefined,
          consentPrivacy: form.consentPrivacy,
          consentMarketing: form.consentMarketing,
          source,
          website: form.website,
          formStartedAt: startedAt.current,
        }),
      });
      const data = (await res.json()) as { ok: boolean; reference?: string; message?: string; errors?: Record<string, string> };
      if (!res.ok || !data.ok) {
        setStatus("failed");
        setErrors(data.errors ?? {});
        setResult({ reference: "", message: data.message ?? "We could not send that. Please try again or email us directly." });
        return;
      }
      setStatus("sent");
      setResult({
        reference: data.reference ?? "",
        message: data.message ?? "Thanks — your request is with the delivery desk.",
      });
    } catch {
      setStatus("failed");
      setResult({ reference: "", message: "Network error. Please try again, or email leads@techmaths.com." });
    }
  };

  /* ------------------------------------------------------------- success */
  if (status === "sent" && result) {
    return (
      <div className="card-surface glow-accent p-8 sm:p-10" role="status">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-accent/45 bg-[color:var(--tm-accent-soft)] text-accent">
          <IconCheck className="h-6 w-6" />
        </span>
        <h3 className="mt-6 text-[1.7rem]">Request received</h3>
        <p className="mt-3 max-w-xl text-[0.95rem] leading-relaxed text-mute">{result.message}</p>
        <div className="mt-6 inline-flex items-center gap-3 rounded-xl border border-[color:var(--tm-line)] bg-[color:var(--tm-panel)] px-4 py-3">
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-mute">Reference</span>
          <span className="font-mono text-[0.95rem] text-accent">{result.reference}</span>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Btn
            variant="outline"
            onClick={() => {
              setForm(EMPTY);
              startedAt.current = Date.now();
              setStep(1);
              setStatus("idle");
              setResult(null);
            }}
          >
            Submit another request
          </Btn>
          <Btn variant="ghost" href="/projects" arrow>
            See what we deliver
          </Btn>
        </div>
      </div>
    );
  }

  const progress = (step / STEPS.length) * 100;
  const field =
    "w-full rounded-xl border border-[color:var(--tm-line)] bg-[color:var(--tm-panel)] px-4 py-3 text-[0.92rem] text-mist outline-none transition-colors placeholder:text-mute/60 focus:border-accent";

  return (
    <div className="card-surface overflow-hidden">
      {/* Progress */}
      <div className="border-b border-[color:var(--tm-line)] px-6 py-5 sm:px-8">
        <div className="flex items-center justify-between gap-4">
          <p className="eyebrow">
            Step {step} / {STEPS.length} — {STEPS[step - 1].title}
          </p>
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-mute">{Math.round(progress)}%</p>
        </div>
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-[color:var(--tm-line)]">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-3 text-[0.82rem] text-mute">{STEPS[step - 1].hint}</p>
      </div>

      <div className="px-6 py-7 sm:px-8">
        {/* Honeypot — visually hidden from people, irresistible to bots */}
        <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
          <label htmlFor="quote-website">Leave this field empty</label>
          <input
            id="quote-website"
            tabIndex={-1}
            autoComplete="off"
            value={form.website}
            onChange={(e) => set("website", e.target.value)}
          />
        </div>

        <div ref={liveRef} tabIndex={-1} className="outline-none" aria-live="polite">
          {/* STEP 1 — services */}
          {step === 1 && (
            <fieldset>
              <legend className="sr-only">Services required</legend>
              <ul className="grid gap-2 sm:grid-cols-2">
                {services.map((s) => {
                  const on = form.services.includes(s.slug);
                  return (
                    <li key={s.slug}>
                      <button
                        type="button"
                        onClick={() => toggleService(s.slug)}
                        aria-pressed={on}
                        className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-all duration-300 ${
                          on
                            ? "border-accent bg-[color:var(--tm-accent-soft)]"
                            : "border-[color:var(--tm-line)] hover:border-[color:var(--tm-line-strong)]"
                        }`}
                      >
                        <span className={on ? "text-accent" : "text-mute"}>
                          <ServiceIcon name={s.icon} className="h-5 w-5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[0.92rem] text-mist">{s.title}</span>
                          <span className="mt-1 block text-[0.78rem] leading-relaxed text-mute">{s.short}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {errors.services && <p className="mt-3 text-[0.82rem] text-[color:var(--tm-warn)]">{errors.services}</p>}
            </fieldset>
          )}

          {/* STEP 2 — site */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label htmlFor="country" className="eyebrow mb-2 block">
                  Country *
                </label>
                <select
                  id="country"
                  className={field}
                  value={form.country}
                  onChange={(e) => set("country", e.target.value)}
                >
                  <option value="">Select a country…</option>
                  {countries.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  <option value="Other / multiple">Other / multiple countries</option>
                </select>
                {errors.country && <p className="mt-2 text-[0.82rem] text-[color:var(--tm-warn)]">{errors.country}</p>}
              </div>
              <div>
                <label htmlFor="siteLocation" className="eyebrow mb-2 block">
                  Site or city
                </label>
                <input
                  id="siteLocation"
                  className={field}
                  placeholder="e.g. FRA3, Frankfurt · or Slough, UK"
                  value={form.siteLocation}
                  onChange={(e) => set("siteLocation", e.target.value)}
                />
                <p className="mt-2 text-[0.78rem] text-mute">
                  Helps us quote travel accurately. Facility names are treated as confidential.
                </p>
              </div>
            </div>
          )}

          {/* STEP 3 — volumes */}
          {step === 3 && (
            <div className="grid gap-5 sm:grid-cols-3">
              {[
                { key: "racks" as const, label: "Racks", placeholder: "e.g. 24" },
                { key: "servers" as const, label: "Servers", placeholder: "e.g. 180" },
                { key: "ports" as const, label: "Cable ports / links", placeholder: "e.g. 1,200" },
              ].map((f) => (
                <div key={f.key}>
                  <label htmlFor={f.key} className="eyebrow mb-2 block">
                    {f.label}
                  </label>
                  <input
                    id={f.key}
                    type="number"
                    min={0}
                    inputMode="numeric"
                    className={field}
                    placeholder={f.placeholder}
                    value={form[f.key]}
                    onChange={(e) => set(f.key, e.target.value.replace(/[^0-9]/g, ""))}
                  />
                </div>
              ))}
              <p className="text-[0.8rem] text-mute sm:col-span-3">
                Estimates are fine. If you have a hardware list or drawings, mention it in the next step and we will
                ask for them.
              </p>
            </div>
          )}

          {/* STEP 4 — timing */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <p className="eyebrow mb-3">Target start</p>
                <div className="flex flex-wrap gap-2">
                  {TIMELINES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => set("timeline", t)}
                      aria-pressed={form.timeline === t}
                      className={`rounded-full border px-4 py-2 text-[0.84rem] transition-colors ${
                        form.timeline === t
                          ? "border-accent bg-[color:var(--tm-accent-soft)] text-accent"
                          : "border-[color:var(--tm-line)] text-mute hover:text-mist"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="eyebrow mb-3">Priority</p>
                <div className="flex flex-wrap gap-2">
                  {URGENCIES.map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => set("urgency", u)}
                      aria-pressed={form.urgency === u}
                      className={`rounded-full border px-4 py-2 text-[0.84rem] transition-colors ${
                        form.urgency === u
                          ? "border-accent bg-[color:var(--tm-accent-soft)] text-accent"
                          : "border-[color:var(--tm-line)] text-mute hover:text-mist"
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 5 — contact */}
          {step === 5 && (
            <div className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className="eyebrow mb-2 block">
                    Name *
                  </label>
                  <input id="name" className={field} autoComplete="name" value={form.name} onChange={(e) => set("name", e.target.value)} />
                  {errors.name && <p className="mt-2 text-[0.82rem] text-[color:var(--tm-warn)]">{errors.name}</p>}
                </div>
                <div>
                  <label htmlFor="email" className="eyebrow mb-2 block">
                    Work email *
                  </label>
                  <input
                    id="email"
                    type="email"
                    className={field}
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                  />
                  {errors.email && <p className="mt-2 text-[0.82rem] text-[color:var(--tm-warn)]">{errors.email}</p>}
                </div>
                <div>
                  <label htmlFor="company" className="eyebrow mb-2 block">
                    Company
                  </label>
                  <input id="company" className={field} autoComplete="organization" value={form.company} onChange={(e) => set("company", e.target.value)} />
                </div>
                <div>
                  <label htmlFor="phone" className="eyebrow mb-2 block">
                    Phone
                  </label>
                  <input id="phone" type="tel" className={field} autoComplete="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
                </div>
              </div>

              <div>
                <label htmlFor="message" className="eyebrow mb-2 block">
                  Anything we should know?
                </label>
                <textarea
                  id="message"
                  rows={4}
                  className={`${field} resize-y`}
                  placeholder="Site access constraints, standards we should follow, drawings you can share, deadlines…"
                  value={form.message}
                  onChange={(e) => set("message", e.target.value)}
                />
              </div>

              <div className="space-y-3 rounded-xl border border-[color:var(--tm-line)] bg-[color:var(--tm-panel)] p-4">
                <label className="flex cursor-pointer items-start gap-3 text-[0.84rem] leading-relaxed text-mute">
                  <input
                    type="checkbox"
                    checked={form.consentPrivacy}
                    onChange={(e) => set("consentPrivacy", e.target.checked)}
                    className="mt-1 h-4 w-4 shrink-0 accent-[color:var(--tm-accent)]"
                  />
                  <span>
                    I agree to Tech Maths processing these details to prepare and send a quote, as described in the{" "}
                    <a href="/privacy-policy" className="link-underline text-mist" target="_blank">
                      privacy policy
                    </a>
                    . *
                  </span>
                </label>
                {errors.consentPrivacy && (
                  <p className="text-[0.82rem] text-[color:var(--tm-warn)]">{errors.consentPrivacy}</p>
                )}
                <label className="flex cursor-pointer items-start gap-3 text-[0.84rem] leading-relaxed text-mute">
                  <input
                    type="checkbox"
                    checked={form.consentMarketing}
                    onChange={(e) => set("consentMarketing", e.target.checked)}
                    className="mt-1 h-4 w-4 shrink-0 accent-[color:var(--tm-accent)]"
                  />
                  <span>Send me field notes and technical guides. Optional, one email a month.</span>
                </label>
              </div>

              {/* Summary of what they told us */}
              <dl className="grid gap-x-6 gap-y-2 border-t border-[color:var(--tm-line)] pt-5 text-[0.82rem] sm:grid-cols-2">
                <dt className="text-mute">Services</dt>
                <dd className="text-mist">
                  {form.services.length
                    ? services.filter((s) => form.services.includes(s.slug)).map((s) => s.title).join(", ")
                    : "—"}
                </dd>
                <dt className="text-mute">Site</dt>
                <dd className="text-mist">
                  {form.country || "—"}
                  {form.siteLocation ? ` · ${form.siteLocation}` : ""}
                </dd>
                <dt className="text-mute">Volumes</dt>
                <dd className="text-mist">
                  {[form.racks && `${form.racks} racks`, form.servers && `${form.servers} servers`, form.ports && `${form.ports} ports`]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </dd>
                <dt className="text-mute">Timing</dt>
                <dd className="text-mist">
                  {form.timeline || "—"}
                  {form.urgency ? ` · ${form.urgency}` : ""}
                </dd>
              </dl>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="mt-8 flex items-center justify-between gap-4">
          <Btn variant="ghost" onClick={back} disabled={step === 1}>
            Back
          </Btn>
          {step < STEPS.length ? (
            <Btn onClick={next} arrow>
              Continue
            </Btn>
          ) : (
            <Btn onClick={submit} disabled={status === "sending"}>
              {status === "sending" ? "Sending…" : "Send request"}
              {status !== "sending" && <IconArrow className="h-4 w-4" />}
            </Btn>
          )}
        </div>

        {status === "failed" && result && (
          <p role="alert" className="mt-4 text-[0.85rem] text-[color:var(--tm-warn)]">
            {result.message}
          </p>
        )}
        <p className="mt-4 text-[0.76rem] text-mute">
          We reply within four business hours. Nothing here creates an obligation on either side.
        </p>
      </div>
    </div>
  );
}
