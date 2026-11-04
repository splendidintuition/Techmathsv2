"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { KeyRound, RefreshCw, ShieldCheck, UserMinus, UserCheck, MapPin, Plus, X } from "lucide-react";
import {
  controlApi,
  describeError,
  groupPermissions,
  humanise,
  type AppRole,
  type PermissionEntry,
  type PortalUser,
  type ScopeType,
} from "@/lib/portal-v2";
import { Button, Empty, ErrorNote, Field, Loading, Panel, Pill, TableShell, inputClass } from "@/components/portal/v2/ui";

const ROLES: AppRole[] = ["admin", "staff", "freelancer", "client"];
const SCOPE_TYPES: ScopeType[] = ["country", "client", "site", "team"];

/**
 * R2 People & permissions (§14). Admin is the only super user; everything else is
 * a role template plus per-user overrides, and the database enforces all of it.
 */
export function ControlPeople({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [registry, setRegistry] = useState<PermissionEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [scopeType, setScopeType] = useState<ScopeType>("client");
  const [scopeValue, setScopeValue] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextUsers, nextRegistry] = await Promise.all([controlApi.listUsers(), controlApi.permissionRegistry()]);
      setUsers(nextUsers);
      setRegistry(nextRegistry);
      setSelectedId((current) => current ?? nextUsers[0]?.id ?? null);
    } catch (caught) {
      setError(describeError(caught).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = useMemo(() => users.find((user) => user.id === selectedId) ?? null, [users, selectedId]);
  const areas = useMemo(() => groupPermissions(registry), [registry]);

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

  const togglePermission = (key: string, granted: boolean) => {
    if (!selected) return;
    void run(
      () => controlApi.setPermission(selected.id, key, granted),
      `${granted ? "Granted" : "Revoked"} ${key} for ${selected.full_name}. Takes effect on their next request.`,
    );
  };

  const clearOverride = (key: string) => {
    if (!selected) return;
    void run(() => controlApi.setPermission(selected.id, key, true, true), `Cleared the ${key} override. The role template applies again.`);
  };

  const addScope = () => {
    if (!selected || !scopeValue.trim()) return;
    void run(
      () => controlApi.setScope(selected.id, scopeType, scopeValue.trim(), true),
      `Scoped ${selected.full_name} to ${scopeType}: ${scopeValue.trim()}.`,
    );
    setScopeValue("");
  };

  const removeScope = (type: ScopeType, value: string) => {
    if (!selected) return;
    void run(() => controlApi.setScope(selected.id, type, value, false), `Removed the ${type} scope ${value}.`);
  };

  if (loading && users.length === 0) return <Loading label="Loading people" />;

  return (
    <div className="space-y-4">
      {error && <ErrorNote message={error} onRetry={() => void load()} />}

      <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        <Panel
          title="People"
          subtitle="Accounts, role templates and effective access"
          action={
            <Button onClick={() => void load()} disabled={loading}>
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
            </Button>
          }
        >
          {users.length === 0 ? (
            <Empty title="No accounts" body="Accounts are created by an Admin through the server-side invite flow, then appear here." />
          ) : (
            <TableShell head={["Name", "Role", "Status", "Overrides"]}>
              {users.map((user) => {
                const overrideCount = Object.keys(user.overrides ?? {}).length;
                return (
                  <tr
                    key={user.id}
                    onClick={() => setSelectedId(user.id)}
                    className={`cursor-pointer transition ${user.id === selectedId ? "bg-[#29E6FF]/[0.07]" : "hover:bg-white/[0.03]"}`}
                  >
                    <td className="border-b border-white/[0.06] px-3 py-2.5">
                      <div className="text-[12.5px] text-[#E8EEF9]">
                        {user.full_name || "Unnamed"}
                        {user.id === currentUserId && <span className="ml-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[#29E6FF]">you</span>}
                      </div>
                      <div className="font-mono text-[10px] text-[#7E8CA0]">{user.email ?? "no email on file"}</div>
                    </td>
                    <td className="border-b border-white/[0.06] px-3 py-2.5">
                      <Pill tone={user.role === "admin" ? "accent" : "muted"}>{user.role}</Pill>
                    </td>
                    <td className="border-b border-white/[0.06] px-3 py-2.5">
                      <Pill tone={user.is_active ? "good" : "danger"}>{user.is_active ? "active" : "suspended"}</Pill>
                    </td>
                    <td className="border-b border-white/[0.06] px-3 py-2.5 font-mono text-[11px] text-[#9AA9BC]">
                      {overrideCount === 0 ? "template only" : `${overrideCount} custom`}
                    </td>
                  </tr>
                );
              })}
            </TableShell>
          )}

          <p className="mt-3 text-[11px] leading-relaxed text-[#7E8CA0]">
            New accounts are created by an Admin through the server-side invite endpoint (service role stays on the server). Once the
            invite is accepted the account appears here and you can set role, permissions and scope. Public sign-up is disabled.
          </p>
        </Panel>

        <Panel title="Access for the selected person" subtitle="Role template plus any per-user overrides">
          {!selected ? (
            <Empty title="Pick a person" body="Select a row on the left to review their effective permissions." />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-[#E8EEF9]">{selected.full_name || "Unnamed"}</div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#7E8CA0]">
                    {selected.email ?? "no email"} · {selected.country_code ?? "—"} · joined{" "}
                    {new Date(selected.created_at).toLocaleDateString("en-GB")}
                  </div>
                </div>
                <Pill tone={selected.availability === "available" ? "good" : selected.availability === "busy" ? "warn" : "muted"}>
                  {selected.availability ?? "no availability"}
                </Pill>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <Field label="Role template">
                  <select
                    value={selected.role}
                    disabled={busy || selected.id === currentUserId}
                    onChange={(event) => {
                      const role = event.target.value as AppRole;
                      void run(() => controlApi.setRole(selected.id, role), `${selected.full_name} is now ${role}. Their next request uses the new role.`);
                    }}
                    className={inputClass}
                  >
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {humanise(role)}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="flex items-end gap-2">
                  <Button
                    variant={selected.is_active ? "danger" : "primary"}
                    disabled={busy || selected.id === currentUserId}
                    onClick={() =>
                      void run(
                        () => controlApi.setUserActive(selected.id, !selected.is_active),
                        selected.is_active ? `${selected.full_name} suspended.` : `${selected.full_name} reactivated.`,
                      )
                    }
                  >
                    {selected.is_active ? <UserMinus size={13} /> : <UserCheck size={13} />}
                    {selected.is_active ? "Suspend" : "Reactivate"}
                  </Button>
                </div>
              </div>

              {selected.id === currentUserId && (
                <div className="rounded-[10px] border border-[#FFB020]/30 bg-[#FFB020]/10 px-3 py-2 text-[11px] text-[#FFD48A]">
                  You cannot change your own role or suspend yourself — the database refuses it. Ask another Admin.
                </div>
              )}

              <div>
                <div className="mb-2 flex items-center gap-2">
                  <MapPin size={13} className="text-[#29E6FF]" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#9AA9BC]">Access scope</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(selected.scopes ?? []).length === 0 ? (
                    <span className="text-[11px] text-[#7E8CA0]">No restriction — access follows their permissions.</span>
                  ) : (
                    selected.scopes.map((scope) => (
                      <span
                        key={`${scope.type}-${scope.value}`}
                        className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/[0.04] px-2.5 py-[3px] font-mono text-[10px] uppercase tracking-[0.1em] text-[#AEBBCC]"
                      >
                        {scope.type}: {scope.value}
                        <button type="button" onClick={() => removeScope(scope.type, scope.value)} disabled={busy} aria-label={`Remove ${scope.type} scope`}>
                          <X size={11} />
                        </button>
                      </span>
                    ))
                  )}
                </div>
                <div className="mt-2 flex gap-2">
                  <select value={scopeType} onChange={(event) => setScopeType(event.target.value as ScopeType)} className={`${inputClass} max-w-[130px]`}>
                    {SCOPE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {humanise(type)}
                      </option>
                    ))}
                  </select>
                  <input
                    value={scopeValue}
                    onChange={(event) => setScopeValue(event.target.value)}
                    placeholder={scopeType === "country" ? "PT" : "value"}
                    className={inputClass}
                  />
                  <Button onClick={addScope} disabled={busy || !scopeValue.trim()}>
                    <Plus size={13} /> Add
                  </Button>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center gap-2">
                  <KeyRound size={13} className="text-[#29E6FF]" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#9AA9BC]">Permissions</span>
                  {selected.role === "admin" && <Pill tone="accent">super user</Pill>}
                </div>
                {selected.role === "admin" ? (
                  <p className="rounded-[10px] border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-[11px] text-[#8A99AB]">
                    Admin is the only super user and always holds every permission. Change the role first to scope somebody down.
                  </p>
                ) : (
                  <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
                    {areas.map((area) => (
                      <div key={area.area}>
                        <div className="mb-1 font-mono text-[9px] uppercase tracking-[0.16em] text-[#5F6F84]">{area.area}</div>
                        <div className="space-y-1">
                          {area.items.map((item) => {
                            const held = Boolean(selected.permissions?.[item.key]);
                            const overridden = Object.prototype.hasOwnProperty.call(selected.overrides ?? {}, item.key);
                            return (
                              <div key={item.key} className="flex items-start gap-2 rounded-[8px] px-1.5 py-1 hover:bg-white/[0.03]">
                                <input
                                  type="checkbox"
                                  checked={held}
                                  disabled={busy}
                                  onChange={(event) => togglePermission(item.key, event.target.checked)}
                                  className="mt-[3px]"
                                  aria-label={item.label}
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-[11.5px] text-[#DCE6F5]">{item.label}</span>
                                    {item.sensitive && <Pill tone="warn">sensitive</Pill>}
                                    {overridden && (
                                      <button
                                        type="button"
                                        onClick={() => clearOverride(item.key)}
                                        className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#29E6FF] underline"
                                        title="Remove the per-user override and fall back to the role template"
                                      >
                                        override · reset
                                      </button>
                                    )}
                                  </div>
                                  <div className="text-[10.5px] leading-snug text-[#7E8CA0]">{item.description}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {note && <div className="rounded-[10px] border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[12px] text-[#C7D3E3]">{note}</div>}

              <p className="flex items-start gap-1.5 text-[10.5px] leading-relaxed text-[#5F6F84]">
                <ShieldCheck size={12} className="mt-[1px] shrink-0" />
                Every change is written to the audit log with before and after values, and row-level security re-evaluates the very next
                request — no re-login needed.
              </p>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
