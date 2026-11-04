# Release 2 — "Control" console

Status: **shipped to the branch, applied to the database, deployable on Vercel.**
Release 1 (core loop) is untouched; this release is additive.

The plan (§5, R2) asks for an expanded admin dashboard, ticket templates, bulk actions,
custom roles and permissions, a certificate vault, custom fields and a calendar/schedule.
This release delivers the six that carry the most operational weight, each with a database
contract, row-level security, screens at 375 px and desktop, empty/loading states, seed
data and tests:

| Module | Where it lives | Database contract |
| --- | --- | --- |
| Control dashboard (live metrics, pipeline, 7-day capacity, global search) | `ControlOverview` | `portal_metrics()`, `portal_capacity(int)`, `portal_search(text)` |
| Bulk actions on tickets | `ControlTickets` | `bulk_update_tickets(uuid[], text, text)` |
| Schedule + recurring maintenance plans | `ControlSchedule` | `save_recurring_plan(...)`, `delete_recurring_plan(uuid)`, `run_recurring_plans(int)`, `portal_capacity` |
| Data-centre asset inventory (site → room → row → rack → device) | `ControlAssets` | `save_asset(...)`, `delete_asset(uuid)`, `assets`, `asset_events` |
| People, role templates, per-user permissions, scopes, suspension | `ControlPeople` | `portal_list_users()`, `portal_set_role`, `portal_set_permission`, `portal_set_scope`, `portal_set_user_active`, `current_permissions()` |
| Ticket templates | `ControlTemplates` | `ticket_templates` + `create_ticket_from_template(...)` |

Deferred to a later release and deliberately **not** half-built: certificate vault, custom
fields, and the "view as this user" tool. They need their own tables and are listed under
§14.3 of the plan.

## Permission model (plan §14)

- `Admin` is the **only** super user, and that is hardcoded in `has_portal_permission()` —
  it is not a row an operator can edit.
- Every other role resolves to: `user_permissions` override → `permission_registry.default_roles`
  → denied. A per-user override can grant *or* revoke, and clearing the override falls back
  to the template.
- 48 permission keys across Tickets, Dispatch, Clients, People, Time, Finance, Assets,
  Schedule, Live map, Reports and Settings. Sensitive keys (pay rates, margins, sale codes,
  audit log, user administration, ticket deletion) are flagged and default to Admin only.
- `user_scopes` restricts a person to a country, client, site or team.
- Last-admin protection lives in the database: `portal_set_role` and
  `portal_set_user_active` raise `last_admin_protected`, and self-demotion/self-suspension
  raise `cannot_change_own_role` / `cannot_suspend_self`.
- Nothing is enforced in the UI alone. Every mutation is a `security definer` function with
  `set search_path = ''`, an `auth.uid()` check, a permission check, a targeted SQLSTATE
  (`42501`, `P0002`, `22023`) and an audit row.

## Files

```
supabase/migrations/20261104120000_portal_v2_control.sql   schema, RPCs, RLS, grants, seed/purge
src/lib/portal-v2.ts                                        typed RPC surface + pure helpers
src/components/portal/v2/ui.tsx                             console atoms (panel, pill, modal, table)
src/components/portal/v2/control-room.tsx                   shell: session, permissions, tabs
src/components/portal/v2/control-overview.tsx               metrics, capacity, search, demo data
src/components/portal/v2/control-tickets.tsx                bulk operations board
src/components/portal/v2/control-schedule.tsx               14-day capacity + recurring plans
src/components/portal/v2/control-assets.tsx                 inventory tree + U occupancy
src/components/portal/v2/control-people.tsx                 roles, permissions, scopes
src/components/portal/v2/control-templates.tsx              templates + raise-from-template
src/components/operations-portal.tsx                        + "Control" nav item (admin/staff only)
tests/portal-v2.test.ts                                     31 assertions on the pure layer
db/index.ts                                                 lazy Drizzle client (build unblocked)
```

## How to test

1. Sign in at `/portal` as an Admin (`admin@techmaths-dc.com`).
2. Sidebar → **Control**. The console only renders tabs you actually hold permissions for.
3. Overview → **Seed demo** creates a demo client, site, hall/row/rack, three devices, a
   template, a monthly plan and three tickets. Every row is tagged `is_demo` and **Purge**
   removes them again.
4. Bulk actions → tick two tickets, set status, apply. The confirmation counts rows, and each
   ticket gets a `ticket.bulk_*` event.
5. People → pick a person, toggle a permission. The override is written to `user_permissions`
   and an `audit_logs` row records before/after. Try to demote the only Admin: the RPC refuses
   with "This is the last active Admin."
6. Assets → open a rack, the U grid shows occupancy; add a device at U42 and watch it appear.
7. Schedule → create a plan, press **Run due** and the plan spawns a ticket and rolls
   `next_run_at` forward by its cadence.
8. Templates → raise a ticket from the rack-and-stack template and find it on the board.

## Proofs run for this release

| Check | Command | Result |
| --- | --- | --- |
| Types | `npx tsc --noEmit` | clean |
| Tests | `npx vitest run` | 100/100 (10 files, +31 new) |
| Build | `npm run build` | compiled, `/portal` 104 kB route / 243 kB first load |
| Database | `supabase_migrations.schema_migrations` | `20261104120000 portal_v2_control` recorded |
| Schema | `pg_tables` / `pg_policies` / `pg_proc` in `public` | 24 tables, 51 policies, 39 functions |
| Missing RPCs from Wave 2/3 | `pg_proc` | `send_ticket_message`, `log_time_entry`, `approve_time_entry` now exist |

## Change note — database contract

Additive only. New columns (`profiles.email`, `profiles.country_code`, `tickets.scheduled_for`,
`tickets.tags`, `tickets.template_id`, `is_demo` flags), four new enums, eleven new tables and
27 new or re-asserted functions. No existing column, type or policy was dropped, so the
Release 1 screens keep working unchanged.

One behaviour change worth knowing: the Wave 2/3 migration
(`20261104061500_wave2_wave3_operations.sql`) had **never been applied** to the live project,
which is why chat and time tracking were failing at runtime. This migration re-asserts those
three RPCs, so those screens work again.

## Environment

`NEXT_PUBLIC_SUPABASE_ANON_KEY` was missing from the build environment while
`SUPABASE_ANON_KEY` existed, so `isSupabaseConfigured` was false and the portal fell back to
its "not connected" state. It is now present for production, preview and development.

## Deployment

| Target | URL | Status |
| --- | --- | --- |
| Pull request | https://github.com/splendidintuition/Techmathsv2/pull/12 | open, from `arena/3426b8c0-techmathsv2` |
| Preview build | https://techmathsv2-git-arena-3426b8c0-techmathsv2-tech-maths.vercel.app/portal | READY, Vercel SSO protected (sign in with the TechMaths Vercel account) |
| Production | https://techmaths-dc.com/portal | unchanged until PR #12 is merged; the project is git-linked to `main` |

Merging the pull request is the only step left, and it deploys the console to the live domain.
