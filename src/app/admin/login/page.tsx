"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Logo } from "@/components/logo";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Sign-in failed.");
        setBusy(false);
        return;
      }
      router.push(params.get("next") ?? "/admin");
      router.refresh();
    } catch {
      setError("Network error. Try again.");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="card-surface w-full max-w-sm p-7">
      <label htmlFor="token" className="eyebrow mb-2 block">
        Access passcode
      </label>
      <input
        id="token"
        type="password"
        autoComplete="current-password"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        className="w-full rounded-xl border border-[color:var(--tm-line)] bg-[color:var(--tm-panel)] px-4 py-3 text-[0.95rem] text-mist outline-none transition-colors focus:border-accent"
        placeholder="Passcode"
      />
      {error && (
        <p role="alert" className="mt-3 text-[0.82rem] text-[color:var(--tm-warn)]">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="mt-5 w-full rounded-full bg-accent px-5 py-3 text-[0.88rem] font-medium text-[color:var(--tm-accent-ink)] transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "Checking…" : "Sign in"}
      </button>
      <p className="mt-4 text-[0.76rem] leading-relaxed text-mute">
        Enter the admin passcode. Contact the site owner if you don&apos;t have it.
      </p>
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <section className="flex min-h-[70vh] items-center justify-center px-4 py-20">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Logo className="h-10 w-10 text-mist" />
          <div>
            <h1 className="text-[1.5rem]">Admin console</h1>
            <p className="mt-2 text-[0.85rem] text-mute">Leads, traffic and pre-launch checklist.</p>
          </div>
        </div>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </section>
  );
}
