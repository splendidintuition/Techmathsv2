"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  Activity,
  AlertCircle,
  BarChart3,
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ExternalLink,
  FileSignature,
  Filter,
  Globe2,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  MapPin,
  MessageSquare,
  ReceiptText,
  Send,
  Plus,
  Radio,
  Search,
  ShieldCheck,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase-browser";
import { SERVICES } from "@/lib/content/services";
import { TicketChat } from "@/components/portal/ticket-chat";
import { LiveMapView } from "@/components/portal/live-map-view";
import { TimesheetsView } from "@/components/portal/timesheets-view";
import { ControlRoom } from "@/components/portal/v2/control-room";
import { MoneyRoom } from "@/components/portal/v3/money-room";
import { OfferInbox } from "@/components/portal/offer-inbox";
import { NotificationBell } from "@/components/portal/notification-bell";
import { ClientRoom } from "@/components/portal/v6/client-room";
import { ContractsRoom } from "@/components/portal/v7/contracts-room";
import { ReportsRoom } from "@/components/portal/v8/reports-room";

type Role = "admin" | "staff" | "freelancer" | "client";
type Page =
  | "Overview"
  | "Tickets"
  | "Offers"
  | "Workspace"
  | "Live map"
  | "Timesheets"
  | "Control"
  | "Money"
  | "Contracts"
  | "Reports"
  | "Services"
  | "Coverage";
type Profile = { id: string; role: Role; full_name: string; is_active: boolean };
type Ticket = {
  id: string;
  ticket_number: number;
  title: string;
  category: string;
  priority: string;
  status: string;
  assigned_to: string | null;
  sla_due_at: string | null;
  created_at: string;
  client_org_id: string;
  site_id: string;
  siteName?: string;
  clientName?: string;
  engineerName?: string;
};
type Site = { id: string; organization_id: string; name: string; address: string };
type Organization = { id: string; name: string };

const statusLabel: Record<string, string> = {
  new: "New",
  triaged: "Triaged",
  offered: "Offered",
  assigned: "Assigned",
  en_route: "En route",
  on_site: "On site",
  in_progress: "In progress",
  waiting_client: "Waiting on client",
  waiting_parts: "Waiting on parts",
  completed_pending_approval: "Pending approval",
  approved: "Approved",
  closed: "Closed",
  cancelled: "Cancelled",
  rejected: "Rejected",
};

const statusColor: Record<string, string> = {
  new: "#8B97AB",
  triaged: "#7C9BFF",
  offered: "#7C9BFF",
  assigned: "#38E1FF",
  en_route: "#38E1FF",
  on_site: "#FFB84D",
  in_progress: "#38E1FF",
  waiting_client: "#FFB84D",
  waiting_parts: "#FFB84D",
  completed_pending_approval: "#3DDC97",
  approved: "#3DDC97",
  closed: "#8B97AB",
  cancelled: "#FF5C70",
  rejected: "#FF5C70",
};

const terminal = new Set(["closed", "cancelled", "rejected"]);
const services = SERVICES.map((service) => ({
  key: service.slug,
  name: service.title,
  description: service.short,
}));

const hubs = [
  { city: "Lisbon", country: "Portugal", role: "Headquarters & primary mobilisation hub", time: "4h" },
  { city: "Frankfurt", country: "Germany", role: "European field hub", time: "6h" },
  { city: "London", country: "United Kingdom", role: "Regional field hub", time: "6h" },
  { city: "Amsterdam", country: "Netherlands", role: "European field hub", time: "6h" },
  { city: "Warsaw", country: "Poland", role: "European field hub", time: "12h" },
];

function StatusPill({ status }: { status: string }) {
  const color = statusColor[status] || "#8B97AB";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium"
      style={{ color, background: `${color}13`, border: `1px solid ${color}30` }}
    >
      <i className="h-1.5 w-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
      {statusLabel[status] || status}
    </span>
  );
}

function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#38E1FF] text-[#04141A] shadow-[0_0_18px_rgba(56,225,255,.25)]">
        <span className="font-display text-[18px] font-semibold">T</span>
      </div>
      <div>
        <div className="text-[13px] font-semibold tracking-tight">
          TechMaths<span className="text-[#38E1FF]">.</span>
        </div>
        <div className="mono-label mt-0.5 text-[8px] text-[#78859A]">OPERATIONS PORTAL</div>
      </div>
    </div>
  );
}

function LoginScreen({ onMessage }: { onMessage: (m: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);

  const signIn = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError("");
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (authError) {
      setError(
        "We could not sign you in with those credentials. Check your email and password, then try again."
      );
    }
  };

  const resetPassword = async () => {
    if (!supabase || !email.trim()) {
      setError("Enter your work email first to request a password reset.");
      return;
    }
    setBusy(true);
    setError("");
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim());
    setBusy(false);
    if (resetError) {
      setError("Password reset request failed. Confirm the email address is correct.");
    } else {
      setResetSent(true);
      onMessage("Password reset instructions sent.");
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#05070D] px-4 py-10 text-[#E8EEF9]">
      <div className="absolute inset-0 bg-grid opacity-40" />
      <div className="pointer-events-none absolute -left-40 top-20 h-96 w-96 rounded-full bg-[#38E1FF]/[0.06] blur-[110px]" />
      <div className="pointer-events-none absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-[#7C9BFF]/[0.045] blur-[110px]" />
      <div className="relative w-full max-w-[420px]">
        <div className="mb-8 flex justify-center">
          <BrandMark />
        </div>
        <div className="rounded-2xl border border-white/[0.09] bg-[#0B1018]/95 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <div className="mono-label mb-2 text-[9px] text-[#38E1FF]">SECURE WORKSPACE</div>
          <h1 className="font-display text-[27px] font-light tracking-tight">
            Welcome back<span className="text-[#38E1FF]">.</span>
          </h1>
          <p className="mt-2 text-[11px] leading-relaxed text-[#8190A5]">
            Sign in with the account invited by your TechMaths portal administrator.
          </p>
          <form onSubmit={signIn} className="mt-7 space-y-4">
            <label className="block">
              <span className="mb-2 block text-[10px] text-[#ADB9C9]">Work email</span>
              <input
                autoComplete="username"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="h-11 w-full rounded-xl border border-white/[0.09] bg-white/[0.025] px-3.5 text-[12px] text-white outline-none placeholder:text-[#5F6C80] focus:border-[#38E1FF]/45 focus:ring-2 focus:ring-[#38E1FF]/10"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-[10px] text-[#ADB9C9]">Password</span>
              <input
                autoComplete="current-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="h-11 w-full rounded-xl border border-white/[0.09] bg-white/[0.025] px-3.5 text-[12px] text-white outline-none placeholder:text-[#5F6C80] focus:border-[#38E1FF]/45 focus:ring-2 focus:ring-[#38E1FF]/10"
              />
            </label>
            {error && (
              <div
                role="alert"
                className="rounded-xl border border-[#FF5C70]/20 bg-[#FF5C70]/[0.06] px-3 py-2.5 text-[10px] leading-relaxed text-[#FF9AA7]"
              >
                {error}
              </div>
            )}
            {resetSent && (
              <div className="rounded-xl border border-[#3DDC97]/20 bg-[#3DDC97]/[0.06] px-3 py-2.5 text-[10px] text-[#72E8B3]">
                Reset instructions requested. Check your inbox.
              </div>
            )}
            <button
              disabled={busy}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#38E1FF] text-[11px] font-semibold text-[#04141A] transition hover:bg-[#74EBFF] disabled:cursor-wait disabled:opacity-60"
            >
              {busy ? (
                <LoaderCircle size={15} className="animate-spin" />
              ) : (
                <>
                  Sign in <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>
          <button
            disabled={busy}
            onClick={resetPassword}
            className="mt-4 w-full text-center text-[10px] text-[#8794A8] underline decoration-white/10 underline-offset-4 transition hover:text-[#38E1FF]"
          >
            Forgot password?
          </button>
          <div className="mt-6 flex items-center gap-2 border-t border-white/[0.06] pt-5 text-[9px] leading-relaxed text-[#66748A]">
            <ShieldCheck size={13} className="shrink-0 text-[#3DDC97]" /> Access is
            invitation-only. New account requests must be approved by TechMaths.
          </div>
        </div>
        <div className="mt-5 flex justify-center gap-2 text-[9px] text-[#566277]">
          <a
            href="https://techmaths-dc.com"
            target="_blank"
            rel="noreferrer"
            className="hover:text-[#38E1FF]"
          >
            TechMaths DC website
          </a>
          <span>·</span>
          <span>EU operations</span>
          <span>·</span>
          <span>Secure sign-in</span>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center px-6 py-12 text-center">
      <div className="relative mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#38E1FF]/15 bg-[#38E1FF]/[0.045] text-[#38E1FF]">
        <BriefcaseBusiness size={21} />
        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-[#0B1018] bg-[#3DDC97]" />
      </div>
      <h3 className="text-[13px] font-medium text-[#D9E2EE]">{title}</h3>
      <p className="mt-2 max-w-[350px] text-[10px] leading-relaxed text-[#78869A]">{body}</p>
    </div>
  );
}

export function OperationsPortal() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(Boolean(supabase));
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketCount, setTicketCount] = useState(0);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [ticketError, setTicketError] = useState("");
  const [sites, setSites] = useState<Site[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [page, setPage] = useState<Page>("Overview");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [modal, setModal] = useState(false);
  const [toast, setToast] = useState("");
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("server_install");
  const [priority, setPriority] = useState("normal");
  const [siteId, setSiteId] = useState("");
  const [orgId, setOrgId] = useState("");

  // Wave 2/3 Feature states
  const [activeChatTicket, setActiveChatTicket] = useState<Ticket | null>(null);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  };

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let alive = true;
    const loadProfile = async () => {
      if (!supabase || !session?.user.id) {
        setProfile(null);
        setProfileLoading(false);
        return;
      }
      setProfileLoading(true);
      setProfileError("");
      const { data, error } = await supabase
        .from("profiles")
        .select("id,role,full_name,is_active")
        .eq("id", session.user.id)
        .maybeSingle();
      if (!alive) return;
      if (error) {
        setProfileError("Your account profile could not be loaded. Contact the portal administrator.");
        setProfile(null);
      } else {
        setProfile(data as Profile | null);
      }
      setProfileLoading(false);
    };
    loadProfile();
    return () => {
      alive = false;
    };
  }, [session?.user.id]);

  // Release 6: a client account lands in its own workspace on first sign-in, not the ops overview.
  const clientLanded = useRef(false);
  useEffect(() => {
    if (clientLanded.current || !profile) return;
    clientLanded.current = true;
    if (profile.role === "client") setPage("Workspace");
  }, [profile]);

  const loadTickets = useCallback(async () => {
    if (!supabase || !session || !profile) return;
    setLoadingTickets(true);
    setTicketError("");
    const { data, error, count } = await supabase
      .from("tickets")
      .select(
        "id,ticket_number,title,category,priority,status,assigned_to,sla_due_at,created_at,client_org_id,site_id",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      setTicketError(
        "Ticket records could not be loaded. Check your access policy or contact the administrator."
      );
      setTickets([]);
      setTicketCount(0);
      setLoadingTickets(false);
      return;
    }

    const rows = (data || []) as Ticket[];
    const siteIds = [...new Set(rows.map((t) => t.site_id))];
    const orgIds = [...new Set(rows.map((t) => t.client_org_id))];
    const userIds = [...new Set(rows.map((t) => t.assigned_to).filter((x): x is string => Boolean(x)))];

    const [siteResult, orgResult, userResult] = await Promise.all([
      siteIds.length
        ? supabase.from("sites").select("id,name,address").in("id", siteIds)
        : Promise.resolve({ data: [], error: null }),
      orgIds.length
        ? supabase.from("organizations").select("id,name").in("id", orgIds)
        : Promise.resolve({ data: [], error: null }),
      userIds.length
        ? supabase.from("profiles").select("id,full_name").in("id", userIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const siteMap = new Map(((siteResult.data || []) as Site[]).map((s) => [s.id, s.name]));
    const orgMap = new Map(((orgResult.data || []) as Organization[]).map((o) => [o.id, o.name]));
    const userMap = new Map(
      ((userResult.data || []) as { id: string; full_name: string }[]).map((u) => [u.id, u.full_name])
    );

    setTickets(
      rows.map((t) => ({
        ...t,
        siteName: siteMap.get(t.site_id) || "Site details restricted",
        clientName: orgMap.get(t.client_org_id) || "Client organization",
        engineerName: t.assigned_to ? userMap.get(t.assigned_to) || "Assigned engineer" : "Unassigned",
      }))
    );
    setTicketCount(count || rows.length);
    setLoadingTickets(false);
  }, [session, profile]);

  useEffect(() => {
    if (!session || !profile) return;
    const timer = window.setTimeout(() => {
      void loadTickets();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [session, profile, loadTickets]);

  useEffect(() => {
    const loadCreationOptions = async () => {
      if (!supabase || !profile || !["admin", "staff", "client"].includes(profile.role)) return;
      const [orgRes, siteRes] = await Promise.all([
        supabase.from("organizations").select("id,name").order("name"),
        supabase.from("sites").select("id,organization_id,name,address").order("name"),
      ]);
      setOrganizations((orgRes.data || []) as Organization[]);
      setSites((siteRes.data || []) as Site[]);
      if (orgRes.data?.length === 1) setOrgId(orgRes.data[0].id);
      if (siteRes.data?.length === 1) setSiteId(siteRes.data[0].id);
    };
    loadCreationOptions();
  }, [profile]);

  const visibleTickets = useMemo(
    () =>
      tickets.filter((t) => {
        const query =
          `${t.ticket_number} ${t.title} ${t.siteName} ${t.clientName} ${t.engineerName}`.toLowerCase();
        const matchesText = query.includes(search.toLowerCase());
        const matchesFilter =
          filter === "all" || (filter === "active" && !terminal.has(t.status)) || t.status === filter;
        return matchesText && matchesFilter;
      }),
    [tickets, search, filter]
  );

  const activeCount = tickets.filter((t) => !terminal.has(t.status)).length;
  const unassignedCount = tickets.filter((t) => !t.assigned_to && !terminal.has(t.status)).length;
  const canCreate = Boolean(profile && ["admin", "staff", "client"].includes(profile.role));

  const createTicket = async (event: FormEvent) => {
    event.preventDefault();
    setCreateError("");
    if (!supabase || !orgId || !siteId) {
      setCreateError("Choose an organization and site you have permission to use.");
      return;
    }
    setCreateBusy(true);
    const { data, error } = await supabase.rpc("create_ticket", {
      p_client_org_id: orgId,
      p_site_id: siteId,
      p_category: category,
      p_title: title.trim(),
      p_description: description.trim(),
      p_priority: priority,
    });
    setCreateBusy(false);
    if (error) {
      setCreateError("Ticket could not be created. Check your organization/site access and try again.");
      return;
    }
    setModal(false);
    setTitle("");
    setDescription("");
    setPriority("normal");
    notify(`Ticket created · ${String(data).slice(0, 8)}`);
    await loadTickets();
  };

  const changeStatus = async (ticket: Ticket, next: string) => {
    if (!supabase) return;
    const { error } = await supabase.rpc("update_ticket_status", {
      p_ticket_id: ticket.id,
      p_next_status: next,
    });
    if (error) {
      notify("Status change was not allowed for this role or ticket.");
      return;
    }
    notify(`Ticket TM-${ticket.ticket_number} updated.`);
    await loadTickets();
  };

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
  };

  if (!isSupabaseConfigured || !supabase) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#05070D] px-5 text-[#E8EEF9]">
        <div className="max-w-lg rounded-2xl border border-white/10 bg-[#0B1018] p-7">
          <BrandMark />
          <div className="mt-7 flex items-center gap-2 text-[#FFB84D]">
            <AlertCircle size={16} /> Supabase setup required
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-[#8B97AB]">
            The TechMaths operations portal requires a connected Supabase project for authentication and
            ticket management. Configure <code className="text-[#CFD9E6]">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code className="text-[#CFD9E6]">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in Netlify environment
            variables (or in <code className="text-[#CFD9E6]">.env.local</code> for local development).
          </p>
        </div>
      </div>
    );
  }

  if (authLoading || (session && profileLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#05070D] text-[#8B97AB]">
        <LoaderCircle size={20} className="animate-spin text-[#38E1FF]" />
        <span className="ml-3 text-[11px]">Connecting securely…</span>
      </div>
    );
  }

  if (!session) return <LoginScreen onMessage={notify} />;

  if (profileError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#05070D] px-5 text-[#E8EEF9]">
        <div className="max-w-md rounded-2xl border border-[#FF5C70]/20 bg-[#0B1018] p-7">
          <AlertCircle size={20} className="text-[#FF5C70]" />
          <h1 className="mt-4 text-[17px]">Profile unavailable</h1>
          <p className="mt-2 text-[11px] leading-relaxed text-[#8B97AB]">{profileError}</p>
          <button
            onClick={signOut}
            className="mt-5 rounded-full border border-white/10 px-4 py-2 text-[10px]"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  if (!profile || !profile.is_active) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#05070D] px-5 text-[#E8EEF9]">
        <div className="max-w-md rounded-2xl border border-white/[0.09] bg-[#0B1018] p-7">
          <ShieldCheck size={21} className="text-[#FFB84D]" />
          <div className="mt-4 text-[16px] font-light">Access pending approval</div>
          <p className="mt-2 text-[11px] leading-relaxed text-[#8794A8]">
            This account does not have an active portal profile yet. Ask a TechMaths administrator to
            approve the account and assign its role.
          </p>
          <button
            onClick={signOut}
            className="mt-5 rounded-full border border-white/10 px-4 py-2 text-[10px] text-[#B7C2D1]"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  const navItems: Array<[Page, any]> = [
    // Release 6: client accounts land in their own workspace — quotes, invoices, requests, sites.
    ...(profile.role === "client" ? ([["Workspace", Building2]] as Array<[Page, any]>) : []),
    ["Overview", LayoutDashboard],
    ["Tickets", BriefcaseBusiness],
    // Release 5: dispatch offers. Every role can be offered work except client accounts,
    // which never appear in the dispatch pool.
    ...(profile.role === "client" ? [] : ([["Offers", Send]] as Array<[Page, any]>)),

    ["Live map", Radio],
    ["Timesheets", Clock3],
    // Release 2: the control console is internal-only. Individual panels are
    // gated by the permission keys the database returns, not by this list.
    ...(profile.role === "admin" || profile.role === "staff"
      ? ([["Control", Activity]] as Array<[Page, any]>)
      : []),
    // Release 3: money spine. Also internal-only; the console itself is gated by
    // the finance permissions the database returns.
    ...(profile.role === "admin" || profile.role === "staff"
      ? ([["Money", ReceiptText]] as Array<[Page, any]>)
      : []),
    // Release 7: contracts, SLA tiers, retainers and bundles (internal, permission-gated in the console).
    ...(profile.role === "admin" || profile.role === "staff"
      ? ([["Contracts", FileSignature]] as Array<[Page, any]>)
      : []),
    // Release 8: reports and CSV exports (internal, permission-gated in the console).
    ...(profile.role === "admin" || profile.role === "staff"
      ? ([["Reports", BarChart3]] as Array<[Page, any]>)
      : []),
    ["Services", Wrench],
    ["Coverage", Globe2],
  ];

  return (
    <div className="relative min-h-screen bg-[#05070D] text-[#E8EEF9]">
      <div className="pointer-events-none fixed inset-0 -z-0 bg-grid opacity-25" />
      <div className="relative flex min-h-screen">
        {/* Sidebar */}
        <aside className="sticky top-0 hidden h-screen w-[246px] shrink-0 flex-col border-r border-white/[0.07] bg-[#080D14]/95 lg:flex">
          <div className="flex h-[72px] items-center border-b border-white/[0.06] px-5">
            <BrandMark />
          </div>
          <div className="px-4 pt-5">
            <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#38E1FF]/10 text-[#38E1FF]">
                <ShieldCheck size={14} />
              </div>
              <div>
                <div className="text-[11px] font-medium text-[#D5DCEA]">TechMaths DC</div>
                <div className="mt-0.5 text-[9px] capitalize text-[#758197]">
                  {profile.role} workspace
                </div>
              </div>
            </div>
          </div>

          <nav className="mt-7 flex-1 px-3">
            <div className="mono-label mb-2 px-3 text-[9px] text-[#58657A]">WORKSPACE</div>
            {navItems.map(([label, Icon]) => (
              <button
                key={label}
                onClick={() => setPage(label)}
                className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[12px] transition ${
                  page === label
                    ? "border border-[#38E1FF]/15 bg-[#38E1FF]/[0.07] text-[#38E1FF]"
                    : "text-[#8591A5] hover:bg-white/[0.035] hover:text-white"
                }`}
              >
                <Icon size={15} />
                {label}
                {label === "Tickets" && (
                  <span className="ml-auto rounded-full bg-white/[0.07] px-1.5 py-0.5 text-[9px] text-[#9BA7B9]">
                    {ticketCount}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="border-t border-white/[0.06] p-3">
            <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.025] p-2.5">
              <div className="flex h-[31px] w-[31px] items-center justify-center rounded-full border border-[#38E1FF]/25 bg-[#38E1FF]/10 text-[10px] text-[#38E1FF]">
                {(profile.full_name || session.user.email || "TM")
                  .split(/[ @]/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((s) => s[0]?.toUpperCase())
                  .join("")}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[10px] font-medium text-[#DDE4F0]">
                  {profile.full_name || session.user.email}
                </div>
                <div className="mt-0.5 capitalize text-[9px] text-[#748197]">{profile.role}</div>
              </div>
              <button onClick={signOut} title="Sign out" className="text-[#68758A] hover:text-white">
                <LogOut size={14} />
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-white/[0.06] bg-[#05070D]/85 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 text-[11px] text-[#78859A]">
              <span>Workspace</span>
              <ChevronRight size={12} />
              <span className="text-[#D8E0EC]">{page}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="hidden items-center gap-1.5 rounded-full border border-[#3DDC97]/15 bg-[#3DDC97]/[0.04] px-2.5 py-1.5 text-[9px] text-[#3DDC97] sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-[#3DDC97]" /> LIVE DATA
              </span>
              <NotificationBell />
              <div className="hidden h-6 border-l border-white/[0.08] sm:block" />
              <div className="hidden text-right sm:block">
                <div className="text-[10px] font-medium text-[#CAD3E0]">
                  {profile.full_name || session.user.email}
                </div>
                <div className="mt-0.5 text-[8px] capitalize text-[#718096]">{profile.role}</div>
              </div>
              <button
                onClick={signOut}
                title="Sign out"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#38E1FF]/20 bg-[#38E1FF]/[0.07] text-[10px] text-[#38E1FF] lg:hidden"
              >
                <LogOut size={14} />
              </button>
            </div>
          </header>

          <div className="mx-auto max-w-[1500px] px-4 pb-10 pt-7 sm:px-6 lg:px-8">
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <div className="mono-label mb-2 flex items-center gap-2 text-[9px] text-[#718198]">
                  <span className="h-1 w-1 rounded-full bg-[#38E1FF]" /> SECURE WORKSPACE{" "}
                  <span className="text-[#374457]">/</span> EU OPERATIONS
                </div>
                <h1 className="font-display text-[29px] font-light leading-tight tracking-[-0.04em] text-[#E8EEF9] sm:text-[34px]">
                  {page === "Overview" ? "Operations overview" : page === "Workspace" ? "Your account" : page}
                  <span className="text-[#38E1FF]">.</span>
                </h1>
                <p className="mt-2 text-[11px] text-[#8290A5]">
                  Live records visible to your <span className="capitalize">{profile.role}</span> account.
                </p>
              </div>

              <div className="flex gap-2">
                {canCreate && (
                  <button
                    onClick={() => {
                      setCreateError("");
                      setModal(true);
                    }}
                    className="flex items-center gap-2 rounded-full bg-[#38E1FF] px-4 py-2.5 text-[10px] font-semibold text-[#04141A] shadow-[0_0_20px_rgba(56,225,255,.14)] transition hover:bg-[#75EBFF]"
                  >
                    <Plus size={13} /> Create ticket
                  </button>
                )}
                <button
                  onClick={loadTickets}
                  className="flex items-center gap-2 rounded-full border border-white/[0.09] px-4 py-2.5 text-[10px] text-[#B8C3D3] hover:bg-white/[0.05]"
                >
                  <Activity size={12} /> Refresh
                </button>
              </div>
            </div>

            <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-white/[0.07] bg-[#0B1018]/90 p-4">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute h-full w-full animate-ping rounded-full bg-[#3DDC97] opacity-35" />
                  <span className="relative h-2 w-2 rounded-full bg-[#3DDC97]" />
                </span>
                <span className="mono-label text-[9px] text-[#AAB6C8]">DATABASE CONNECTION</span>
                <span className="rounded-full bg-[#3DDC97]/10 px-2 py-0.5 text-[9px] text-[#3DDC97]">
                  AUTHENTICATED
                </span>
              </div>
              <div className="hidden h-5 border-l border-white/[0.08] sm:block" />
              <span className="flex items-center gap-1.5 text-[10px] text-[#8592A6]">
                <ShieldCheck size={13} className="text-[#3DDC97]" /> Row-level access enabled
              </span>
              <span className="ml-auto text-[9px] text-[#667389]">Real-time events active</span>
            </div>

            {/* CLIENT WORKSPACE (release 6) */}
            {page === "Workspace" && <ClientRoom />}

            {/* LIVE MAP PAGE */}
            {page === "Live map" && <LiveMapView />}

            {/* CONTROL CONSOLE (release 2) */}
            {page === "Control" && <ControlRoom />}

            {/* OFFERS (release 5) */}
            {page === "Offers" && <OfferInbox email={session.user.email ?? undefined} />}

            {/* MONEY CONSOLE (release 3) */}
            {page === "Money" && <MoneyRoom />}

            {/* CONTRACTS (release 7) */}
            {page === "Contracts" && <ContractsRoom />}

            {/* REPORTS (release 8) */}
            {page === "Reports" && <ReportsRoom />}

            {/* TIMESHEETS PAGE */}
            {page === "Timesheets" && (
              <TimesheetsView
                currentUserId={profile.id}
                currentUserRole={profile.role}
                tickets={tickets}
                onNotify={notify}
              />
            )}

            {/* SERVICES PAGE */}
            {page === "Services" && (
              <section className="rounded-2xl border border-white/[0.07] bg-[#0B1018]/90 p-4 sm:p-6">
                <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                  <div>
                    <div className="mono-label text-[9px] text-[#38E1FF]">SERVICE CATALOGUE · 09</div>
                    <p className="mt-2 max-w-2xl text-[10px] leading-relaxed text-[#8290A5]">
                      Service categories and summaries are based on the public TechMaths website. Portal
                      ticket records remain separate and are not populated from marketing content.
                    </p>
                  </div>
                  <a
                    href="https://techmaths-dc.com/services"
                    target="_blank"
                    rel="noreferrer"
                    className="flex w-fit items-center gap-2 rounded-full border border-white/[0.09] px-3.5 py-2 text-[10px] text-[#B8C3D3] hover:border-[#38E1FF]/30 hover:text-[#38E1FF]"
                  >
                    Full service details <ExternalLink size={12} />
                  </a>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {services.map((service, index) => (
                    <article
                      key={service.key}
                      className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 transition hover:border-[#38E1FF]/20"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[9px] text-[#617087]">0{index + 1}</span>
                        <Wrench size={14} className="text-[#38E1FF]" />
                      </div>
                      <h3 className="mt-4 text-[12px] font-medium text-[#DCE5F0]">{service.name}</h3>
                      <p className="mt-2 text-[10px] leading-relaxed text-[#7E8BA0]">
                        {service.description}
                      </p>
                      <button
                        onClick={() => {
                          setCategory(service.key);
                          setPage("Tickets");
                          setModal(true);
                        }}
                        disabled={!canCreate}
                        className="mt-4 flex items-center gap-1.5 text-[9px] text-[#38E1FF] transition hover:text-white disabled:cursor-not-allowed disabled:text-[#58657A]"
                      >
                        {canCreate
                          ? "Create request"
                          : "Available to request with an authorized account"}{" "}
                        <ArrowRight size={11} />
                      </button>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* COVERAGE PAGE */}
            {page === "Coverage" && (
              <section className="rounded-2xl border border-white/[0.07] bg-[#0B1018]/90 p-4 sm:p-6">
                <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                  <div>
                    <div className="mono-label text-[9px] text-[#38E1FF]">
                      COVERAGE · PUBLIC SITE REFERENCE
                    </div>
                    <p className="mt-2 max-w-2xl text-[10px] leading-relaxed text-[#8290A5]">
                      The website describes Lisbon as the base and lists mobilisation hubs. This is reference
                      information only—not live engineer availability, guaranteed SLA, or a site directory.
                    </p>
                  </div>
                  <a
                    href="https://techmaths-dc.com/coverage"
                    target="_blank"
                    rel="noreferrer"
                    className="flex w-fit items-center gap-2 rounded-full border border-white/[0.09] px-3.5 py-2 text-[10px] text-[#B8C3D3] hover:border-[#38E1FF]/30 hover:text-[#38E1FF]"
                  >
                    Coverage details <ExternalLink size={12} />
                  </a>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {hubs.map((hub, index) => (
                    <article
                      key={hub.city}
                      className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#38E1FF]/15 bg-[#38E1FF]/[0.06] text-[#38E1FF]">
                          <MapPin size={15} />
                        </div>
                        <span className="mono-label text-[8px] text-[#748197]">HUB 0{index + 1}</span>
                      </div>
                      <div className="mt-4 text-[13px] font-medium text-[#DCE5F0]">{hub.city}</div>
                      <div className="mt-1 text-[10px] text-[#8491A5]">{hub.country}</div>
                      <div className="mt-3 border-t border-white/[0.06] pt-3 text-[9px] text-[#718096]">
                        {hub.role}
                      </div>
                      <div className="mt-2 text-[9px] text-[#59677C]">
                        Website reference mobilisation: {hub.time}*
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* OVERVIEW & TICKETS PAGES */}
            {(page === "Overview" || page === "Tickets") && (
              <>
                {page === "Overview" && (
                  <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
                    {[
                      {
                        label: "VISIBLE TICKETS",
                        value: ticketCount,
                        detail: "within your access scope",
                        color: "#38E1FF",
                        icon: BriefcaseBusiness,
                      },
                      {
                        label: "ACTIVE",
                        value: activeCount,
                        detail: "not yet closed",
                        color: "#B38BFF",
                        icon: Activity,
                      },
                      {
                        label: "UNASSIGNED",
                        value: unassignedCount,
                        detail: "awaiting dispatch",
                        color: "#FFB84D",
                        icon: Users,
                      },
                      {
                        label: "LAST REFRESH",
                        value: loadingTickets ? "…" : "Live",
                        detail: "refresh to sync records",
                        color: "#3DDC97",
                        icon: Clock3,
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-2xl border border-white/[0.07] bg-[#0B1018]/90 p-4 sm:p-5"
                      >
                        <div className="flex items-start justify-between">
                          <span className="mono-label text-[8px] text-[#8B97AB]">{item.label}</span>
                          <item.icon size={15} style={{ color: item.color }} />
                        </div>
                        <div className="mt-4 text-[27px] font-light leading-none text-[#E8EEF9]">
                          {item.value}
                        </div>
                        <div className="mt-2 text-[9px] text-[#69768C]">{item.detail}</div>
                      </div>
                    ))}
                  </div>
                )}

                <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0B1018]/90">
                  <div className="flex flex-col justify-between gap-4 border-b border-white/[0.06] p-4 sm:flex-row sm:items-center sm:p-5">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-[13px] font-medium text-[#E3EAF4]">
                          {page === "Overview" ? "Recent tickets" : "All tickets"}
                        </h2>
                        <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[9px] text-[#8996AA]">
                          {ticketCount}
                        </span>
                      </div>
                      <p className="mt-1 text-[10px] text-[#718096]">
                        Records are read directly from the secured Supabase database.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative">
                        <Search
                          size={13}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#718096]"
                        />
                        <input
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Search tickets…"
                          className="h-9 w-[170px] rounded-xl border border-white/[0.08] bg-white/[0.025] pl-8 pr-3 text-[10px] text-[#DDE5F1] outline-none placeholder:text-[#647187] focus:border-[#38E1FF]/35"
                        />
                      </div>
                      <div className="relative">
                        <select
                          value={filter}
                          onChange={(e) => setFilter(e.target.value)}
                          className="h-9 appearance-none rounded-xl border border-white/[0.08] bg-[#101620] pl-3 pr-8 text-[10px] text-[#AAB5C6] outline-none"
                        >
                          <option value="all">All statuses</option>
                          <option value="active">Active</option>
                          {Object.entries(statusLabel).map(([key, label]) => (
                            <option key={key} value={key}>
                              {label}
                            </option>
                          ))}
                        </select>
                        <Filter
                          size={11}
                          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6F7C90]"
                        />
                      </div>
                    </div>
                  </div>

                  {ticketError && (
                    <div className="m-4 flex items-center gap-2 rounded-xl border border-[#FF5C70]/20 bg-[#FF5C70]/[0.05] p-3 text-[10px] text-[#FF9AA7]">
                      <AlertCircle size={14} />
                      {ticketError}
                    </div>
                  )}

                  {loadingTickets ? (
                    <div className="flex h-48 items-center justify-center text-[10px] text-[#7E8BA0]">
                      <LoaderCircle size={15} className="mr-2 animate-spin text-[#38E1FF]" />
                      Loading records from Supabase…
                    </div>
                  ) : visibleTickets.length === 0 ? (
                    <EmptyState
                      title={ticketError ? "Could not load records" : "No tickets yet"}
                      body={
                        ticketError
                          ? "Ticket data is not available right now. Try refreshing, or ask an administrator to review access."
                          : search
                          ? "No live tickets match that search. Clear the search or change the status filter."
                          : canCreate
                          ? "This secure workspace has no ticket records yet. Create a real ticket to begin; no demo records are shown."
                          : "No tickets are currently visible to your account. New tickets will appear here when your organization has requests."
                      }
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[920px] text-left">
                        <thead>
                          <tr className="border-b border-white/[0.05] text-[8px] text-[#657287]">
                            {["TICKET", "SITE / CLIENT", "STATUS", "ASSIGNED TO", "PRIORITY", "SLA", "THREAD"].map(
                              (x) => (
                                <th key={x} className="mono-label px-5 py-3 text-[8px] font-medium">
                                  {x}
                                </th>
                              )
                            )}
                            <th className="px-5 py-3" />
                          </tr>
                        </thead>
                        <tbody>
                          {visibleTickets.map((t) => (
                            <tr
                              key={t.id}
                              className="border-b border-white/[0.04] transition hover:bg-white/[0.025]"
                            >
                              <td className="px-5 py-3.5">
                                <div className="font-mono text-[9px] text-[#7E8BA0]">
                                  TM-{new Date(t.created_at).getFullYear()}-
                                  {String(t.ticket_number).padStart(5, "0")}
                                </div>
                                <div className="mt-1 max-w-[240px] truncate text-[10px] font-medium text-[#D6DEEA]">
                                  {t.title}
                                </div>
                                <div className="mt-1 text-[9px] text-[#718096]">
                                  {services.find((service) => service.key === t.category)?.name ||
                                    t.category.replaceAll(/[_-]/g, " ")}
                                </div>
                              </td>

                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-1.5 text-[10px] text-[#BAC5D5]">
                                  <MapPin size={11} className="text-[#38E1FF]" />
                                  {t.siteName}
                                </div>
                                <div className="mt-1 text-[9px] text-[#6E7A8F]">{t.clientName}</div>
                              </td>

                              <td className="px-5 py-3.5">
                                <StatusPill status={t.status} />
                              </td>

                              <td className="px-5 py-3.5 text-[10px] text-[#AAB5C6]">
                                {t.engineerName}
                              </td>

                              <td className="px-5 py-3.5">
                                <span
                                  className={`text-[10px] ${
                                    t.priority === "critical"
                                      ? "text-[#FF5C70]"
                                      : t.priority === "high"
                                      ? "text-[#FFB84D]"
                                      : "text-[#96A3B6]"
                                  }`}
                                >
                                  {t.priority[0].toUpperCase() + t.priority.slice(1)}
                                </span>
                              </td>

                              <td className="px-5 py-3.5 text-[10px] text-[#96A3B6]">
                                {t.sla_due_at ? new Date(t.sla_due_at).toLocaleString() : "—"}
                              </td>

                              {/* Real-time chat button */}
                              <td className="px-5 py-3.5">
                                <button
                                  onClick={() => setActiveChatTicket(t)}
                                  className="flex items-center gap-1.5 rounded-lg border border-[#38E1FF]/25 bg-[#38E1FF]/10 px-2.5 py-1 text-[10px] font-medium text-[#38E1FF] transition hover:bg-[#38E1FF]/20"
                                >
                                  <MessageSquare size={12} />
                                  <span>Chat</span>
                                </button>
                              </td>

                              <td className="px-5 py-3.5">
                                {profile.role === "admin" || profile.role === "staff" ? (
                                  <select
                                    aria-label={`Update status for ${t.title}`}
                                    value={t.status}
                                    onChange={(e) => changeStatus(t, e.target.value)}
                                    className="max-w-[145px] rounded-lg border border-white/[0.08] bg-[#101620] px-2 py-1.5 text-[9px] text-[#AFBBCB] outline-none"
                                  >
                                    <option value={t.status}>{statusLabel[t.status] || t.status}</option>
                                    {[
                                      "triaged",
                                      "offered",
                                      "assigned",
                                      "en_route",
                                      "on_site",
                                      "in_progress",
                                      "waiting_client",
                                      "waiting_parts",
                                      "completed_pending_approval",
                                      "approved",
                                      "closed",
                                      "cancelled",
                                    ]
                                      .filter((s) => s !== t.status)
                                      .map((s) => (
                                        <option key={s} value={s}>
                                          {statusLabel[s]}
                                        </option>
                                      ))}
                                  </select>
                                ) : profile.role === "freelancer" && t.assigned_to === profile.id ? (
                                  <select
                                    aria-label={`Update status for ${t.title}`}
                                    value={t.status}
                                    onChange={(e) => changeStatus(t, e.target.value)}
                                    className="max-w-[145px] rounded-lg border border-white/[0.08] bg-[#101620] px-2 py-1.5 text-[9px] text-[#AFBBCB] outline-none"
                                  >
                                    <option value={t.status}>{statusLabel[t.status] || t.status}</option>
                                    {(t.status === "assigned"
                                      ? ["en_route"]
                                      : t.status === "en_route"
                                      ? ["on_site"]
                                      : t.status === "on_site"
                                      ? ["in_progress"]
                                      : t.status === "in_progress"
                                      ? ["waiting_client", "waiting_parts", "completed_pending_approval"]
                                      : ["in_progress"]
                                    ).map((s) => (
                                      <option key={s} value={s}>
                                        {statusLabel[s]}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="text-[9px] text-[#59667A]">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {!loadingTickets && visibleTickets.length > 0 && (
                    <div className="flex items-center justify-between px-5 py-3 text-[9px] text-[#6C798E]">
                      <span>
                        Showing <span className="text-[#A8B4C5]">{visibleTickets.length}</span> of{" "}
                        <span className="text-[#A8B4C5]">{ticketCount}</span> accessible records
                      </span>
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck size={11} className="text-[#3DDC97]" /> RLS protected
                      </span>
                    </div>
                  )}
                </section>
              </>
            )}

            {/* Overview bottom shortcut cards */}
            {page === "Overview" && (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div
                  onClick={() => setPage("Live map")}
                  className="group cursor-pointer rounded-2xl border border-white/[0.07] bg-[#0B1018]/80 p-5 transition hover:border-[#38E1FF]/30"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[11px] font-medium text-[#D7E0EC]">
                      <Radio size={14} className="text-[#38E1FF]" /> Live Field Operations
                    </div>
                    <ArrowRight
                      size={13}
                      className="text-[#647287] transition group-hover:translate-x-1 group-hover:text-[#38E1FF]"
                    />
                  </div>
                  <p className="mt-2 text-[10px] leading-relaxed text-[#77849A]">
                    Interactive Europe radar map tracking data center facilities, transit telemetry, and
                    active technician missions.
                  </p>
                </div>

                <div
                  onClick={() => setPage("Timesheets")}
                  className="group cursor-pointer rounded-2xl border border-white/[0.07] bg-[#0B1018]/80 p-5 transition hover:border-[#38E1FF]/30"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[11px] font-medium text-[#D7E0EC]">
                      <Clock3 size={14} className="text-[#B38BFF]" /> Timesheets & Hours Ledger
                    </div>
                    <ArrowRight
                      size={13}
                      className="text-[#647287] transition group-hover:translate-x-1 group-hover:text-[#38E1FF]"
                    />
                  </div>
                  <p className="mt-2 text-[10px] leading-relaxed text-[#77849A]">
                    Mobile stopwatch tracking, manual hour submissions, and coordinator sign-off workflows.
                  </p>
                </div>
              </div>
            )}

            {/* Footer Status Bar */}
            <div className="mt-5 flex flex-col justify-between gap-2 text-[9px] text-[#566277] sm:flex-row sm:items-center">
              <span>
                TechMaths Operations Portal <span className="px-1 text-[#394457]">·</span> EU region
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#3DDC97]" /> Authenticated session{" "}
                <span className="px-1 text-[#394457]">·</span> {profile.role}
              </span>
            </div>
          </div>
        </main>
      </div>

      {/* Ticket Chat Drawer / Modal */}
      {activeChatTicket && (
        <TicketChat
          ticketId={activeChatTicket.id}
          ticketNumber={activeChatTicket.ticket_number}
          ticketTitle={activeChatTicket.title}
          currentUserId={profile.id}
          currentUserRole={profile.role}
          onClose={() => setActiveChatTicket(null)}
        />
      )}

      {/* Create Ticket Modal */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModal(false);
          }}
        >
          <form
            onSubmit={createTicket}
            className="w-full max-w-[520px] rounded-2xl border border-white/[0.1] bg-[#0B1018] shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-white/[0.07] p-5">
              <div>
                <div className="mono-label text-[8px] text-[#38E1FF]">LIVE DATABASE WRITE</div>
                <h2 className="mt-2 text-[16px] font-medium">Create a ticket</h2>
                <p className="mt-1 text-[10px] text-[#7F8CA0]">
                  This creates a real record in the secured Supabase database.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModal(false)}
                className="text-[#8390A3] hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <label className="block">
                <span className="mb-2 block text-[10px] text-[#AAB6C6]">Title</span>
                <input
                  required
                  minLength={3}
                  maxLength={240}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-10 w-full rounded-xl border border-white/[0.09] bg-white/[0.025] px-3 text-[11px] outline-none focus:border-[#38E1FF]/40"
                  placeholder="Describe the requested service"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-[10px] text-[#AAB6C6]">Organization</span>
                <select
                  required
                  value={orgId}
                  onChange={(e) => {
                    setOrgId(e.target.value);
                    setSiteId("");
                  }}
                  className="h-10 w-full rounded-xl border border-white/[0.09] bg-[#101620] px-3 text-[11px] text-[#C6D1E0] outline-none"
                >
                  <option value="">Choose organization…</option>
                  {organizations.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-[10px] text-[#AAB6C6]">Site</span>
                <select
                  required
                  value={siteId}
                  onChange={(e) => setSiteId(e.target.value)}
                  className="h-10 w-full rounded-xl border border-white/[0.09] bg-[#101620] px-3 text-[11px] text-[#C6D1E0] outline-none"
                >
                  <option value="">Choose site…</option>
                  {sites
                    .filter((s) => s.organization_id === orgId)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} · {s.address}
                      </option>
                    ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label>
                  <span className="mb-2 block text-[10px] text-[#AAB6C6]">Category</span>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="h-10 w-full rounded-xl border border-white/[0.09] bg-[#101620] px-3 text-[10px] text-[#C6D1E0]"
                  >
                    {services.map((service) => (
                      <option key={service.key} value={service.key}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="mb-2 block text-[10px] text-[#AAB6C6]">Priority</span>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="h-10 w-full rounded-xl border border-white/[0.09] bg-[#101620] px-3 text-[10px] text-[#C6D1E0]"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="mb-2 block text-[10px] text-[#AAB6C6]">Description</span>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full resize-none rounded-xl border border-white/[0.09] bg-white/[0.025] p-3 text-[11px] outline-none focus:border-[#38E1FF]/40"
                />
              </label>
              {createError && (
                <div
                  role="alert"
                  className="rounded-lg border border-[#FF5C70]/20 bg-[#FF5C70]/[0.05] p-2.5 text-[10px] text-[#FF9AA7]"
                >
                  {createError}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-white/[0.07] p-5">
              <button
                type="button"
                onClick={() => setModal(false)}
                className="rounded-full border border-white/[0.1] px-4 py-2.5 text-[10px] text-[#AAB6C6]"
              >
                Cancel
              </button>
              <button
                disabled={createBusy}
                className="flex items-center gap-2 rounded-full bg-[#38E1FF] px-4 py-2.5 text-[10px] font-semibold text-[#04141A] disabled:opacity-60"
              >
                {createBusy ? (
                  <LoaderCircle size={13} className="animate-spin" />
                ) : (
                  <Plus size={13} />
                )}
                Create ticket
              </button>
            </div>
          </form>
        </div>
      )}

      {toast && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 rounded-xl border border-[#38E1FF]/20 bg-[#111826]/95 px-4 py-3 text-[10px] text-[#CFD9E6] shadow-xl backdrop-blur"
        >
          <CheckCircle2 size={14} className="text-[#38E1FF]" />
          {toast}
        </div>
      )}
    </div>
  );
}
