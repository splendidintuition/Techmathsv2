"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Boxes,
  CalendarClock,
  ClipboardList,
  ListChecks,
  Lock,
  Radio,
  Users,
} from "lucide-react";
import {
  availableTabs,
  controlApi,
  describeError,
  heldPermissions,
  humanise,
  type Availability,
} from "@/lib/portal-v2";
import { supabase } from "@/lib/supabase-browser";
import { Button, Empty, ErrorNote, Loading, Panel, Pill } from "@/components/portal/v2/ui";
import { ControlOverview } from "@/components/portal/v2/control-overview";
import { ControlTickets } from "@/components/portal/v2/control-tickets";
import { ControlPeople } from "@/components/portal/v2/control-people";
import { ControlAssets } from "@/components/portal/v2/control-assets";
import { ControlSchedule } from "@/components/portal/v2/control-schedule";
import { ControlTemplates } from "@/components/portal/v2/control-templates";

const TAB_META: Record<string, { label: string; icon: typeof BarChart3 }> = {
  overview: { label: "Control room", icon: BarChart3 },
  tickets: { label: "Bulk actions", icon: ListChecks },
  schedule: { label: "Schedule", icon: CalendarClock },
  assets: { label: "Assets", icon: Boxes },
  people: { label: "People", icon: Users },
  templates: { label: "Templates", icon: ClipboardList },
};

/**
 * R2 "Control" console. Every panel is gated by the permission keys returned by
 * the database, and the database re-checks each action — the UI never decides alone.
 */
export function ControlRoom() {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [availability, setAvailability] = useState<Availability | "">("");
  const [availabilityNote, setAvailabilityNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (!supabase) {
        setError("The portal is not connected to its database. Check the deployment environment.");
        return;
      }
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user ?? null;
      setUserId(user?.id ?? null);
      setEmail(user?.email ?? "");
      if (!user) return;
      const keys = await controlApi.currentPermissions();
      setPermissions(heldPermissions(keys));
    } catch (caught) {
      setError(describeError(caught).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const tabs = useMemo(() => availableTabs(permissions), [permissions]);
  const activeTab = tabs.includes(tab) ? tab : tabs[0] ?? "overview";

  const changeAvailability = async (next: Availability) => {
    setAvailabilityNote("");
    try {
      await controlApi.setAvailability(next);
      setAvailability(next);
      setAvailabilityNote(`Availability set to ${next}. Dispatch sees this immediately.`);
    } catch (caught) {
      setAvailabilityNote(describeError(caught).message);
    }
  };

  if (loading) {
    return (
      <Panel title="Control room" subtitle="Checking your session and permissions">
        <Loading label="Authorising" />
      </Panel>
    );
  }

  if (!userId) {
    return (
      <Panel title="Control room" subtitle="Sign-in required">
        <Empty
          title="You are signed out"
          body="The control console needs an active portal session. Sign in on the main portal, then open Control again."
          action={
            <a href="/portal" className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-[#29E6FF] px-3.5 py-[7px] text-[12px] font-medium text-[#04161A]">
              <Lock size={13} /> Go to sign in
            </a>
          }
        />
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Radio size={14} className="text-[#29E6FF]" />
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#7E8CA0]">release 2 · control</span>
          </div>
          <h1 className="mt-1 text-[20px] font-semibold tracking-[-0.01em] text-[#F2F7FF]">{TAB_META[activeTab]?.label ?? "Control"}</h1>
          <p className="text-[12px] text-[#8A99AB]">
            {email} · {permissions.size} permissions active · enforced by row-level security
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#5F6F84]">my status</span>
          {(["available", "busy", "offline"] as Availability[]).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => void changeAvailability(status)}
              className={`rounded-full border px-2.5 py-[3px] font-mono text-[10px] uppercase tracking-[0.12em] transition ${
                availability === status
                  ? "border-[#29E6FF]/50 bg-[#29E6FF]/15 text-[#9DF3FF]"
                  : "border-white/12 bg-white/[0.03] text-[#8A99AB] hover:border-white/25"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {availabilityNote && <div className="rounded-[10px] border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[12px] text-[#C7D3E3]">{availabilityNote}</div>}
      {error && <ErrorNote message={error} onRetry={() => void load()} />}

      <nav className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {tabs.map((key) => {
          const meta = TAB_META[key];
          if (!meta) return null;
          const Icon = meta.icon;
          const active = key === activeTab;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-[6px] text-[12px] transition ${
                active ? "border-[#29E6FF]/45 bg-[#29E6FF]/12 text-[#BDF6FF]" : "border-white/10 bg-white/[0.02] text-[#9AA9BC] hover:border-white/25"
              }`}
            >
              <Icon size={13} /> {meta.label}
            </button>
          );
        })}
        <span className="ml-auto hidden shrink-0 items-center sm:flex">
          <Pill tone="accent">{humanise(activeTab)}</Pill>
        </span>
      </nav>

      {activeTab === "overview" && <ControlOverview canManageDemo={permissions.has("settings.users")} />}
      {activeTab === "tickets" && <ControlTickets canAssign={permissions.has("tickets.assign")} />}
      {activeTab === "schedule" && <ControlSchedule canManage={permissions.has("schedule.recurring")} />}
      {activeTab === "assets" && <ControlAssets canEdit={permissions.has("assets.edit")} />}
      {activeTab === "people" && userId && <ControlPeople currentUserId={userId} />}
      {activeTab === "templates" && <ControlTemplates canManage={permissions.has("settings.templates")} />}

      <p className="pt-1 text-center font-mono text-[9.5px] uppercase tracking-[0.14em] text-[#3F4C5D]">
        techmaths operations portal · control console · every action audited
      </p>
    </div>
  );
}
