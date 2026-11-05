# R4 — Clients, sites and accountability

Release branch: `arena/c49cacef-techmathsv2` · Migration `20261104160000_portal_v4_clients_sites` (applied)
Base: `main` at `f68f1a3` (R3.2)

## Why this release

The Expanded Feature Plan (v2) asks for a control room. Before this release the console could not
create the two records everything else depends on: a **client** and a **site**. `create_organization`
and `create_site` existed in the database and were never called; tickets, quotes, invoices, expenses
and assets all require a site. Pay rates had no editor, so job-costing labour was only priced by hand
in SQL. Every privileged action wrote an audit row that no screen could read.

R4 closes those three gaps and nothing else. It adds no new dependency and no new feature flag.

## What shipped

### 1. Clients and sites (§3.4)

| RPC | Permission | Behaviour |
| --- | --- | --- |
| `portal_list_clients()` | `clients.view` | Every organization in scope with its sites, open-ticket count, asset count and a boolean for whether access notes exist. Clients see only their own organization. |
| `portal_save_client(...)` | `clients.edit` | Create or edit name, billing email, VAT number, country. Validates the email shape in the database. Audits before/after. |
| `portal_save_site(...)` | `clients.edit` | Create or edit site name, address, country, coordinates and geofence (25–2000 m enforced). Audits before/after. |
| `portal_get_site_access(site)` | `clients.access_codes` | Returns the access procedure. Never included in a list payload. |
| `portal_save_site_access(site, text)` | `clients.access_codes` | Upserts the procedure. The audit row records character counts, **not** the text. |

Screen: **Control → Clients**. Summary stats (clients, sites, open tickets, coverage gaps), search
across clients and sites, per-client cards with inline site rows, "no access notes" warnings, and
modals for client, site and access procedure.

### 2. Engineer directory (§3.5)

| RPC | Permission | Behaviour |
| --- | --- | --- |
| `portal_list_engineers()` | `people.view` | Engineers with skills, countries, availability, verification, open tickets and 30-day approved hours. `hourly_rate` is returned as `null` unless the caller holds `people.pay_rates`; `rates_visible` says which. |
| `portal_save_engineer_profile(...)` | `people.edit_rates` for the rate, `people.onboarding` for verification | Creates the profile if missing, updates otherwise. Rate is only written with the rate permission, verification only with the onboarding permission. Currencies are validated as ISO-4217 shaped. |

Screen: **Control → People → Engineer directory** (below the accounts table). Shows counts of
approved, pending and *unpriced* engineers — unpriced is the signal that job costing will report
unrated hours rather than a cost.

### 3. Audit log viewer (§3.8)

`portal_list_audit(entity, actor, limit)` requires `audit.view`, caps at 500 rows and filters by
entity substring and actor. Screen: **Control → Audit** with a refresh, entity filter with
suggestions, row-count selector, before → after summary per row and CSV export (RFC 4180 quoting).

## Permissions and defaults

No new permission keys were added — R4 makes three existing keys real:

| Key | Default roles | Now does something |
| --- | --- | --- |
| `clients.view` | admin, staff, client | Lists clients and sites in scope |
| `clients.edit` | admin, staff | Creates and edits clients and sites |
| `clients.access_codes` | admin | Reads and writes the access procedure |
| `people.pay_rates` | admin | Makes rates visible in the directory |
| `people.edit_rates` | admin | Writes the rate |
| `people.onboarding` | admin, staff | Moves verification status |
| `audit.view` | admin | Reads the audit log |

`Staff` can manage clients and sites and approve verification, but never sees a pay rate or the
access procedure. That is the "dispatcher" shape the plan describes, without a separate preset.

## Verification performed

All SQL was applied to project `vwdqrbtrykrdwpbxbypj` and exercised as real users by setting the
JWT claim in-session, not by inspection:

| Check | Result |
| --- | --- |
| `portal_list_clients()` as admin | Returns the demo client with its sites and counts |
| `portal_list_clients()` as client user | Returns an empty list — scoped to their own organization |
| `portal_save_site(...)` as admin | Created a site, returned its id, wrote `site.created` |
| `portal_save_site_access(...)` | Stored the text; `portal_get_site_access` returned it verbatim |
| `portal_get_site_access` as client user | Refused with `not_authorized` |
| Audit rows after those calls | `site.created` and `site.access_updated` with character counts only |
| `portal_save_engineer_profile` as admin | Rate 35.00, verification approved, skills and countries stored |
| `portal_list_engineers` as admin | `rates_visible: true`, rate present |
| `portal_list_engineers` as staff | `rates_visible: false`, rate `null` |
| Cleanup | QA site, access row, engineer profile and the two audit rows removed; sites 0, tickets 0, engineer profiles back to 1 |

## How to test in the product

1. Sign in as `admin@techmaths-dc.com`, open **Control**.
2. **Clients** → *New client* → name, billing email, VAT, country → it appears immediately.
3. On that client, **Site** → name, address, country, coordinates → save. The site now appears in the
   ticket, quote and invoice pickers.
4. Press **Access** on the site and write the entry procedure. Sign in as `staff@` and open the same
   site: the button is gone and the API refuses the call.
5. **People** → *Engineer directory* → **Edit** on the freelancer, set a rate. Margin reporting now
   prices that engineer's approved hours instead of counting them as unrated.
6. **Audit** → filter by `site` and see every change above with before → after, then **CSV**.

## Files changed

```
supabase/migrations/20261104160000_portal_v4_clients_sites.sql   new — 8 RPCs, grants, audit entries
src/lib/portal-v2.ts                                             types, api calls, 6 pure helpers, tab gating
src/components/portal/v2/control-clients.tsx                     new — clients, sites, access procedure
src/components/portal/v2/control-engineers.tsx                   new — directory, rates, verification
src/components/portal/v2/control-audit.tsx                       new — audit viewer + CSV
src/components/portal/v2/control-room.tsx                        Clients and Audit tabs, People composition
tests/portal-v4.test.ts                                          new — 11 assertions
docs/FEATURE-MATRIX.md                                           new — the plan, line by line
docs/FEATURE-AUDIT.md                                            replaced with a pointer to the matrix
docs/V4-CLIENTS-SITES.md                                         this file
docs/AGENT-LOG.md                                                Agents 19–21
```

## Not covered

Contacts as first-class records, client-side team management, credential rotation, time-limited
access codes, Excel import and any change to the money flags. Feature flags are untouched; the demo
data is still on and unmodified.
