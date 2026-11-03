"use client";

import { useState } from "react";

/** Newsletter sign-up → POST /api/subscribe. */
export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("loading");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, consent: true }),
      });
      const data = (await res.json()) as { ok: boolean; duplicate?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setState("error");
        setMsg(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setState("done");
      setMsg(data.duplicate ? "You are already on the list." : "Subscribed. Field notes only — no marketing.");
      setEmail("");
    } catch {
      setState("error");
      setMsg("Network error. Please try again.");
    }
  };

  if (state === "done") {
    return (
      <p className="mt-4 rounded-lg border border-accent/35 bg-[color:var(--tm-accent-soft)] px-3 py-2.5 text-[0.8rem] text-accent">
        {msg}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-4">
      <label htmlFor="newsletter-email" className="sr-only">
        Email address
      </label>
      <div className="flex items-center gap-2 rounded-full border border-[color:var(--tm-line)] bg-[color:var(--tm-panel)] px-3 py-1.5 transition-colors focus-within:border-accent">
        <input
          id="newsletter-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          className="min-w-0 flex-1 bg-transparent py-1.5 text-[0.85rem] text-mist outline-none placeholder:text-mute/60"
        />
        <button
          type="submit"
          disabled={state === "loading"}
          className="shrink-0 rounded-full bg-accent px-3.5 py-1.5 text-[0.75rem] font-medium text-[color:var(--tm-accent-ink)] transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {state === "loading" ? "…" : "Join"}
        </button>
      </div>
      <p className="mt-2 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-mute/60">
        One email a month. Unsubscribe anytime.
      </p>
      {state === "error" && <p className="mt-2 text-[0.78rem] text-[color:var(--tm-warn)]">{msg}</p>}
    </form>
  );
}
