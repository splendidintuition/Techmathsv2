-- TechMaths Operations Portal — v2 "Control room" release
-- Adds fine-grained permissions (§14), ticket templates, multi-engineer crews,
-- planned/recurring work (§3.3), data-centre asset inventory (§7.1),
-- engineer availability, saved views and the RPC surface the v2 console needs.
--
-- Contract note: additive only. No existing column, type or policy is dropped.
-- Existing write RPCs from the Wave 2/3 migration are re-asserted so a project
-- that missed that migration converges on the same contract.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- 0. Column additions to existing tables
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists country_code text;
alter table public.tickets add column if not exists scheduled_for timestamptz;
alter table public.tickets add column if not exists tags text[] not null default '{}';
alter table public.tickets add column if not exists template_id uuid;
alter table public.tickets add column if not exists is_demo boolean not null default false;
alter table public.organizations add column if not exists is_demo boolean not null default false;
alter table public.sites add column if not exists is_demo boolean not null default false;

-- Keep profile.email in step with auth.users (trigger re-created, then backfilled).
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, 'user'), '@', 1)))
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. New enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.asset_kind as enum ('site', 'room', 'row', 'rack', 'device');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.asset_status as enum ('planned', 'in_service', 'maintenance', 'decommissioned', 'retired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.recurrence_cadence as enum ('weekly', 'monthly', 'quarterly', 'yearly');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.scope_type as enum ('country', 'client', 'site', 'team');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- 2. Permissions (§14) — registry, per-user overrides, scope limits
-- ---------------------------------------------------------------------------
create table if not exists public.permission_registry (
  key text primary key,
  area text not null,
  label text not null,
  description text not null default '',
  sensitive boolean not null default false,
  default_roles public.app_role[] not null default '{}',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.user_permissions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  permission text not null,
  granted boolean not null default true,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (user_id, permission)
);

create table if not exists public.user_scopes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  scope_type public.scope_type not null,
  scope_value text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, scope_type, scope_value)
);

insert into public.permission_registry (key, area, label, description, sensitive, default_roles, sort_order) values
  ('tickets.view',            'Tickets',  'View tickets',            'See tickets inside the user access scope.',                        false, '{admin,staff,freelancer,client}', 10),
  ('tickets.create',          'Tickets',  'Create tickets',          'Raise a new ticket for an authorized client organization.',       false, '{admin,staff,client}',           11),
  ('tickets.edit',            'Tickets',  'Edit tickets',            'Change title, description, category or checklist of a ticket.',   false, '{admin,staff}',                 12),
  ('tickets.assign',          'Tickets',  'Assign engineers',        'Assign an engineer to a ticket.',                                 false, '{admin,staff}',                 13),
  ('tickets.reassign',        'Tickets',  'Reassign engineers',      'Move a ticket from one engineer to another.',                     false, '{admin,staff}',                 14),
  ('tickets.priority',        'Tickets',  'Change priority',         'Raise or lower ticket priority, including Critical.',             false, '{admin,staff}',                 15),
  ('tickets.status',          'Tickets',  'Change status',           'Move a ticket through the operational status flow.',              false, '{admin,staff}',                 16),
  ('tickets.close',           'Tickets',  'Close or cancel',         'Close, cancel or reject a ticket.',                               false, '{admin,staff}',                 17),
  ('tickets.delete',          'Tickets',  'Delete tickets',          'Permanently delete a ticket record.',                             true,  '{admin}',                       18),
  ('tickets.internal_notes',  'Tickets',  'See internal notes',      'Read the staff-only notes channel on a ticket.',                  true,  '{admin,staff}',                 19),
  ('dispatch.offer',          'Dispatch', 'Send offers',             'Offer a ticket to an engineer.',                                  false, '{admin,staff}',                 20),
  ('dispatch.broadcast',      'Dispatch', 'Broadcast to shortlist',  'Offer a ticket to several engineers at once.',                   false, '{admin,staff}',                 21),
  ('dispatch.override',       'Dispatch', 'Override acceptance',     'Assign a ticket even when the offer flow would block it.',        true,  '{admin}',                       22),
  ('dispatch.timeout',        'Dispatch', 'Set offer timeout',       'Change how long an offer stays open.',                           false, '{admin,staff}',                 23),
  ('clients.view',            'Clients',  'View clients and sites',  'See client organizations, sites and their history.',             false, '{admin,staff,client}',          30),
  ('clients.edit',            'Clients',  'Edit clients and sites',  'Create or change client, site and contact records.',             false, '{admin,staff}',                 31),
  ('clients.access_codes',    'Clients',  'See site access codes',   'Read the sensitive site entry and access instructions.',         true,  '{admin}',                       32),
  ('clients.contracts',       'Clients',  'Manage contracts',        'Maintain retainers, prepaid bundles and SLA tiers.',             false, '{admin}',                       33),
  ('people.view',             'People',   'View people',             'See the engineer and staff directory.',                          false, '{admin,staff}',                 40),
  ('people.onboarding',       'People',   'Approve onboarding',      'Move a freelancer through the onboarding pipeline.',             false, '{admin,staff}',                 41),
  ('people.edit_rates',       'People',   'Edit pay rates',          'Change an engineer hourly or day rate.',                         true,  '{admin}',                       42),
  ('people.pay_rates',        'People',   'See pay rates',           'Read what TechMaths pays an engineer.',                          true,  '{admin}',                       43),
  ('people.certificates',     'People',   'Manage certificates',     'Maintain the certification vault and expiry alerts.',            false, '{admin,staff}',                 44),
  ('time.view',               'Time',     'View timesheets',         'Read logged hours and timesheets.',                              false, '{admin,staff,freelancer}',      50),
  ('time.approve',            'Time',     'Approve timesheets',      'Approve submitted hours for payout.',                            false, '{admin,staff}',                 51),
  ('time.reject',             'Time',     'Reject timesheets',       'Reject submitted hours back to the engineer.',                   false, '{admin,staff}',                 52),
  ('time.adjust',             'Time',     'Adjust timesheets',       'Edit hours that somebody else logged.',                          true,  '{admin}',                       53),
  ('finance.invoices',        'Finance',  'Invoices',                'Create and send client invoices.',                               false, '{admin}',                       60),
  ('finance.payments',        'Finance',  'Record payments',         'Record payments received against invoices.',                     false, '{admin}',                       61),
  ('finance.payouts',         'Finance',  'Run payouts',             'Prepare and export an engineer payout run.',                     true,  '{admin}',                       62),
  ('finance.margins',         'Finance',  'See margins',             'See client price, engineer cost and margin per ticket.',         true,  '{admin}',                       63),
  ('finance.export',          'Finance',  'Export finance data',     'Export invoices, hours and payout data.',                        false, '{admin}',                       64),
  ('assets.view',             'Assets',   'View assets',             'See the site, room, rack and device inventory.',                 false, '{admin,staff,freelancer,client}', 70),
  ('assets.edit',             'Assets',   'Edit assets',             'Create, move or decommission inventory items.',                 false, '{admin,staff}',                 71),
  ('assets.stock',            'Assets',   'Manage parts stock',      'Manage warehouse and engineer kit stock levels.',               false, '{admin,staff}',                 72),
  ('assets.purchase_orders',  'Assets',   'Purchase orders',         'Raise purchase orders against suppliers.',                      false, '{admin}',                       73),
  ('schedule.view',           'Schedule', 'View schedule',           'See the planned work calendar and engineer availability.',      false, '{admin,staff,freelancer}',      80),
  ('schedule.manage',         'Schedule', 'Manage schedule',         'Book, move and confirm visits.',                                false, '{admin,staff}',                 81),
  ('schedule.recurring',      'Schedule', 'Manage recurring plans',  'Create or stop recurring maintenance plans.',                   false, '{admin,staff}',                 82),
  ('map.view_all',            'Live map', 'View full live map',      'See every engineer position on the live radar map.',            false, '{admin,staff}',                 90),
  ('map.view_limited',        'Live map', 'View limited live map',   'See only the engineer assigned to your ticket.',               false, '{client,freelancer}',           91),
  ('reports.operations',      'Reports',  'Operations reports',      'Read ticket, SLA and response-time reporting.',                false, '{admin,staff}',                100),
  ('reports.finance',         'Reports',  'Finance reports',         'Read revenue, cost and margin reporting.',                     true,  '{admin}',                      101),
  ('reports.export',          'Reports',  'Export reports',          'Export report data to CSV.',                                   false, '{admin,staff}',                102),
  ('settings.templates',      'Settings', 'Ticket templates',        'Maintain the reusable ticket templates.',                      false, '{admin,staff}',                110),
  ('settings.categories',     'Settings', 'Categories and SLA',      'Maintain categories, priorities, statuses and SLA targets.',   false, '{admin}',                      111),
  ('settings.users',          'Settings', 'Users and permissions',   'Create users and change roles or permissions.',               true,  '{admin}',                      112),
  ('audit.view',              'Settings', 'View audit log',          'Read the history of who changed what.',                       true,  '{admin}',                      113)
on conflict (key) do update set
  area = excluded.area,
  label = excluded.label,
  description = excluded.description,
  sensitive = excluded.sensitive,
  default_roles = excluded.default_roles,
  sort_order = excluded.sort_order;

-- ---------------------------------------------------------------------------
-- 3. Ticket templates, crews, planned work
-- ---------------------------------------------------------------------------
create table if not exists public.ticket_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  name text not null,
  category text not null,
  priority public.ticket_priority not null default 'normal',
  title text not null,
  description text not null default '',
  checklist jsonb not null default '[]'::jsonb,
  estimated_hours numeric(8,2) check (estimated_hours is null or estimated_hours >= 0),
  sla_hours integer check (sla_hours is null or sla_hours between 1 and 8760),
  is_active boolean not null default true,
  is_demo boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ticket_assignees (
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  engineer_id uuid not null references public.profiles(id) on delete cascade,
  crew_role text not null default 'helper' check (crew_role in ('lead', 'helper')),
  hourly_rate numeric(12,2) check (hourly_rate is null or hourly_rate >= 0),
  created_at timestamptz not null default now(),
  primary key (ticket_id, engineer_id)
);

create table if not exists public.recurring_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  site_id uuid not null references public.sites(id) on delete cascade,
  template_id uuid references public.ticket_templates(id) on delete set null,
  title text not null,
  category text not null,
  priority public.ticket_priority not null default 'normal',
  description text not null default '',
  cadence public.recurrence_cadence not null default 'monthly',
  interval_count integer not null default 1 check (interval_count between 1 and 12),
  start_at timestamptz not null default now(),
  next_run_at timestamptz not null default now(),
  end_at timestamptz,
  is_active boolean not null default true,
  is_demo boolean not null default false,
  last_ticket_id uuid references public.tickets(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 4. Data-centre inventory (§7.1)
-- ---------------------------------------------------------------------------
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  site_id uuid not null references public.sites(id) on delete cascade,
  parent_id uuid references public.assets(id) on delete cascade,
  kind public.asset_kind not null default 'device',
  name text not null,
  status public.asset_status not null default 'in_service',
  room text,
  row_label text,
  rack_label text,
  u_position integer check (u_position is null or u_position between 1 and 52),
  u_height integer not null default 1 check (u_height between 1 and 52),
  model text,
  serial_number text,
  vendor text,
  owner text,
  asset_tag text unique,
  purchased_at date,
  warranty_expires_at date,
  power_draw_w integer check (power_draw_w is null or power_draw_w >= 0),
  notes text not null default '',
  attributes jsonb not null default '{}'::jsonb,
  is_demo boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.asset_events (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  event_type text not null,
  summary text not null default '',
  payload jsonb not null default '{}'::jsonb,
  actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 5. Availability and saved views
-- ---------------------------------------------------------------------------
create table if not exists public.engineer_availability (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_minute integer not null default 480 check (start_minute between 0 and 1439),
  end_minute integer not null default 1020 check (end_minute between 0 and 1439),
  timezone text not null default 'Europe/Lisbon',
  constraint engineer_availability_window_chk check (end_minute > start_minute),
  unique (user_id, weekday)
);

create table if not exists public.time_off (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text not null default '',
  created_at timestamptz not null default now(),
  constraint time_off_window_chk check (ends_at >= starts_at)
);

create table if not exists public.saved_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  entity text not null default 'tickets',
  name text not null,
  filters jsonb not null default '{}'::jsonb,
  shared boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, entity, name)
);

create index if not exists assets_sites_id_idx on public.assets(site_id);
create index if not exists assets_org_id_idx on public.assets(organization_id);
create index if not exists assets_parent_id_idx on public.assets(parent_id);
create index if not exists asset_events_asset_id_idx on public.asset_events(asset_id, created_at desc);
create index if not exists templates_org_id_idx on public.ticket_templates(organization_id);
create index if not exists plans_next_run_at_idx on public.recurring_plans(next_run_at) where is_active;
create index if not exists tickets_scheduled_for_idx on public.tickets(scheduled_for);
create index if not exists user_permissions_user_id_idx on public.user_permissions(user_id);

drop trigger if exists ticket_templates_updated_at on public.ticket_templates;
create trigger ticket_templates_updated_at before update on public.ticket_templates for each row execute function public.set_updated_at();
drop trigger if exists recurring_plans_updated_at on public.recurring_plans;
create trigger recurring_plans_updated_at before update on public.recurring_plans for each row execute function public.set_updated_at();
drop trigger if exists assets_updated_at on public.assets;
create trigger assets_updated_at before update on public.assets for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 6. Permission resolution
-- ---------------------------------------------------------------------------
create or replace function public.has_portal_permission(target_permission text)
returns boolean language sql stable security definer set search_path = '' as $$
  with me as (
    select p.id, p.role from public.profiles p
    where p.id = (select auth.uid()) and p.is_active = true
  )
  select coalesce((
    select case
      when (select role from me) is null then false
      when (select role from me) = 'admin' then true           -- admin is the only super user
      else coalesce(
        (select up.granted from public.user_permissions up
          where up.user_id = (select id from me) and up.permission = target_permission),
        (select r.default_roles @> array[(select role from me)]::public.app_role[]
          from public.permission_registry r where r.key = target_permission),
        false
      )
    end
  ), false);
$$;

create or replace function public.current_permissions()
returns text[] language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select array_agg(r.key order by r.sort_order)
     from public.permission_registry r
     where public.has_portal_permission(r.key)),
    '{}'::text[]
  );
$$;

-- ---------------------------------------------------------------------------
-- 7. Administration RPCs (§14.3 — admin only, audit logged)
-- ---------------------------------------------------------------------------
create or replace function public.portal_list_users()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  result jsonb;
begin
  if (select auth.uid()) is null or not (public.current_app_role() = 'admin'
     or public.has_portal_permission('people.view')) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(entry order by entry ->> 'full_name'), '[]'::jsonb)
  into result
  from (
    select jsonb_build_object(
      'id', p.id,
      'full_name', p.full_name,
      'email', p.email,
      'role', p.role,
      'is_active', p.is_active,
      'locale', p.locale,
      'country_code', p.country_code,
      'phone', p.phone,
      'created_at', p.created_at,
      'availability', ep.availability,
      'verification_status', ep.verification_status,
      'hourly_rate', case when public.has_portal_permission('people.pay_rates') then ep.hourly_rate else null end,
      'permissions', coalesce((
        select jsonb_object_agg(r.key, public.has_portal_permission(r.key))
        from public.permission_registry r
      ), '{}'::jsonb),
      'overrides', coalesce((
        select jsonb_object_agg(up.permission, up.granted)
        from public.user_permissions up where up.user_id = p.id
      ), '{}'::jsonb),
      'scopes', coalesce((
        select jsonb_agg(jsonb_build_object('type', s.scope_type, 'value', s.scope_value))
        from public.user_scopes s where s.user_id = p.id
      ), '[]'::jsonb)
    ) as entry
    from public.profiles p
    left join public.engineer_profiles ep on ep.user_id = p.id
  ) users;

  return result;
end;
$$;

create or replace function public.portal_set_role(p_user_id uuid, p_role public.app_role)
returns public.app_role language plpgsql security definer set search_path = '' as $$
declare
  previous_role public.app_role;
  admin_count integer;
begin
  if (select auth.uid()) is null or not public.has_portal_permission('settings.users') then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if p_user_id = (select auth.uid()) then
    raise exception 'cannot_change_own_role' using errcode = '42501';
  end if;

  select role into previous_role from public.profiles where id = p_user_id for update;
  if not found then raise exception 'user_not_found' using errcode = 'P0002'; end if;

  if previous_role = 'admin' then
    select count(*) into admin_count from public.profiles
      where role = 'admin' and is_active = true and id <> p_user_id;
    if admin_count = 0 then
      raise exception 'last_admin_protected' using errcode = '42501';
    end if;
  end if;

  update public.profiles set role = p_role where id = p_user_id;

  insert into public.audit_logs (actor_id, entity, entity_id, action, before_data, after_data)
  values ((select auth.uid()), 'profile', p_user_id, 'role.changed',
          jsonb_build_object('role', previous_role), jsonb_build_object('role', p_role));

  return p_role;
end;
$$;

create or replace function public.portal_set_permission(
  p_user_id uuid, p_permission text, p_granted boolean, p_clear_override boolean default false
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or not public.has_portal_permission('settings.users') then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if not exists (select 1 from public.permission_registry r where r.key = p_permission) then
    raise exception 'unknown_permission' using errcode = '22023';
  end if;

  if p_clear_override then
    delete from public.user_permissions where user_id = p_user_id and permission = p_permission;
  else
    insert into public.user_permissions (user_id, permission, granted, updated_by)
    values (p_user_id, p_permission, p_granted, (select auth.uid()))
    on conflict (user_id, permission)
    do update set granted = excluded.granted, updated_by = excluded.updated_by, updated_at = now();
  end if;

  insert into public.audit_logs (actor_id, entity, entity_id, action, after_data)
  values ((select auth.uid()), 'user_permission', p_user_id,
          case when p_clear_override then 'permission.reset' else 'permission.changed' end,
          jsonb_build_object('permission', p_permission, 'granted', p_granted));
end;
$$;

create or replace function public.portal_set_scope(
  p_user_id uuid, p_scope_type public.scope_type, p_scope_value text, p_enabled boolean default true
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or not public.has_portal_permission('settings.users') then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if p_enabled then
    insert into public.user_scopes (user_id, scope_type, scope_value, created_by)
    values (p_user_id, p_scope_type, trim(p_scope_value), (select auth.uid()))
    on conflict (user_id, scope_type, scope_value) do nothing;
  else
    delete from public.user_scopes
      where user_id = p_user_id and scope_type = p_scope_type and scope_value = trim(p_scope_value);
  end if;

  insert into public.audit_logs (actor_id, entity, entity_id, action, after_data)
  values ((select auth.uid()), 'user_scope', p_user_id, 'scope.changed',
          jsonb_build_object('type', p_scope_type, 'value', p_scope_value, 'enabled', p_enabled));
end;
$$;

create or replace function public.portal_set_user_active(p_user_id uuid, p_active boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  admin_count integer;
begin
  if (select auth.uid()) is null or not public.has_portal_permission('settings.users') then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if p_user_id = (select auth.uid()) and not p_active then
    raise exception 'cannot_suspend_self' using errcode = '42501';
  end if;

  if not p_active then
    select count(*) into admin_count from public.profiles
      where role = 'admin' and is_active = true and id <> p_user_id;
    if admin_count = 0 then
      raise exception 'last_admin_protected' using errcode = '42501';
    end if;
  end if;

  update public.profiles set is_active = p_active where id = p_user_id;
  insert into public.audit_logs (actor_id, entity, entity_id, action, after_data)
  values ((select auth.uid()), 'profile', p_user_id, 'active.changed', jsonb_build_object('is_active', p_active));
  return p_active;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Dispatch RPCs — templates, bulk actions, crews
-- ---------------------------------------------------------------------------
create or replace function public.bulk_update_tickets(
  p_ticket_ids uuid[], p_action text, p_value text default null
) returns integer language plpgsql security definer set search_path = '' as $$
declare
  affected integer := 0;
  role_value public.app_role;
  required_permission text;
  ticket_record record;
begin
  if (select auth.uid()) is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  role_value := public.current_app_role();

  required_permission := case p_action
    when 'priority' then 'tickets.priority'
    when 'status' then 'tickets.status'
    when 'assign' then 'tickets.assign'
    when 'tag' then 'tickets.edit'
    when 'close' then 'tickets.close'
    else null
  end;

  if required_permission is null then raise exception 'unknown_bulk_action' using errcode = '22023'; end if;
  if role_value not in ('admin', 'staff') or not public.has_portal_permission(required_permission) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  for ticket_record in
    select id, status, priority, assigned_to, title
    from public.tickets
    where id = any(p_ticket_ids) and public.can_access_ticket(id)
    for update
  loop
    if p_action = 'priority' and p_value in ('low','normal','high','critical') then
      update public.tickets set priority = p_value::public.ticket_priority where id = ticket_record.id;
    elsif p_action = 'status' then
      update public.tickets
        set status = p_value::public.ticket_status,
            closed_at = case when p_value in ('closed','cancelled') then now() else closed_at end
        where id = ticket_record.id;
    elsif p_action = 'assign' then
      update public.tickets set assigned_to = nullif(p_value, '')::uuid where id = ticket_record.id;
      if nullif(p_value, '')::uuid is not null then
        insert into public.ticket_assignees (ticket_id, engineer_id, crew_role)
        values (ticket_record.id, nullif(p_value, '')::uuid, 'lead')
        on conflict (ticket_id, engineer_id) do nothing;
      end if;
    elsif p_action = 'tag' and coalesce(trim(p_value), '') <> '' then
      update public.tickets
        set tags = (select array_agg(distinct tag_value) from unnest(array_append(tags, trim(p_value))) tag_value)
        where id = ticket_record.id;
    elsif p_action = 'close' then
      update public.tickets set status = 'closed', closed_at = now() where id = ticket_record.id;
    end if;

    insert into public.ticket_events (ticket_id, actor_id, event_type, payload)
    values (ticket_record.id, (select auth.uid()), 'ticket.bulk_' || p_action,
            jsonb_build_object('value', p_value));

    affected := affected + 1;
  end loop;

  return affected;
end;
$$;

create or replace function public.create_ticket_from_template(
  p_template_id uuid,
  p_site_id uuid,
  p_client_org_id uuid,
  p_title text default null,
  p_scheduled_for timestamptz default null,
  p_priority public.ticket_priority default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  template_row public.ticket_templates%rowtype;
  new_ticket_id uuid;
  role_value public.app_role;
begin
  if (select auth.uid()) is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  role_value := public.current_app_role();
  if role_value not in ('admin', 'staff', 'client') or not public.has_portal_permission('tickets.create') then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select * into template_row from public.ticket_templates
    where id = p_template_id and is_active = true;
  if not found then raise exception 'template_not_found' using errcode = 'P0002'; end if;

  if role_value = 'client' and not public.is_org_member(p_client_org_id) then
    raise exception 'organization_scope_denied' using errcode = '42501';
  end if;
  if not exists (select 1 from public.organizations o where o.id = p_client_org_id and o.type = 'client') then
    raise exception 'client_organization_required' using errcode = '22023';
  end if;
  if not exists (select 1 from public.sites s where s.id = p_site_id and s.organization_id = p_client_org_id) then
    raise exception 'site_not_in_client_organization' using errcode = '22023';
  end if;

  insert into public.tickets (
    client_org_id, site_id, created_by, category, priority, title, description,
    estimated_hours, sla_due_at, scheduled_for, template_id
  )
  values (
    p_client_org_id, p_site_id, (select auth.uid()), template_row.category,
    coalesce(p_priority, template_row.priority),
    coalesce(nullif(trim(coalesce(p_title, '')), ''), template_row.title),
    template_row.description,
    template_row.estimated_hours,
    case when template_row.sla_hours is not null then now() + (template_row.sla_hours || ' hours')::interval else null end,
    p_scheduled_for,
    template_row.id
  )
  returning id into new_ticket_id;

  insert into public.ticket_events (ticket_id, actor_id, event_type, payload)
  values (new_ticket_id, (select auth.uid()), 'ticket.created_from_template',
          jsonb_build_object('template', template_row.name, 'checklist', template_row.checklist));

  return new_ticket_id;
end;
$$;

create or replace function public.set_ticket_crew(
  p_ticket_id uuid, p_engineer_id uuid, p_crew_role text default 'helper', p_hourly_rate numeric default null
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or not (
    (public.current_app_role() in ('admin','staff') and public.has_portal_permission('tickets.assign'))
  ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if not public.can_access_ticket(p_ticket_id) then
    raise exception 'ticket_access_denied' using errcode = '42501';
  end if;

  insert into public.ticket_assignees (ticket_id, engineer_id, crew_role, hourly_rate)
  values (p_ticket_id, p_engineer_id, coalesce(p_crew_role, 'helper'), p_hourly_rate)
  on conflict (ticket_id, engineer_id)
  do update set crew_role = excluded.crew_role, hourly_rate = coalesce(excluded.hourly_rate, public.ticket_assignees.hourly_rate);

  update public.tickets set assigned_to = p_engineer_id
    where id = p_ticket_id and coalesce(p_crew_role, 'helper') = 'lead';

  insert into public.ticket_events (ticket_id, actor_id, event_type, payload)
  values (p_ticket_id, (select auth.uid()), 'ticket.crew_changed',
          jsonb_build_object('engineer_id', p_engineer_id, 'crew_role', coalesce(p_crew_role, 'helper')));
end;
$$;

create or replace function public.remove_ticket_crew(p_ticket_id uuid, p_engineer_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or not (
    (public.current_app_role() in ('admin','staff') and public.has_portal_permission('tickets.assign'))
  ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if not public.can_access_ticket(p_ticket_id) then
    raise exception 'ticket_access_denied' using errcode = '42501';
  end if;
  delete from public.ticket_assignees where ticket_id = p_ticket_id and engineer_id = p_engineer_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. Inventory RPCs
-- ---------------------------------------------------------------------------
create or replace function public.save_asset(
  p_id uuid default null,
  p_site_id uuid default null,
  p_parent_id uuid default null,
  p_kind public.asset_kind default 'device',
  p_name text default '',
  p_status public.asset_status default 'in_service',
  p_room text default null,
  p_row_label text default null,
  p_rack_label text default null,
  p_u_position integer default null,
  p_u_height integer default 1,
  p_model text default null,
  p_serial_number text default null,
  p_vendor text default null,
  p_owner text default null,
  p_asset_tag text default null,
  p_purchased_at date default null,
  p_warranty_expires_at date default null,
  p_power_draw_w integer default null,
  p_notes text default '',
  p_attributes jsonb default '{}'::jsonb
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  target_id uuid;
  resolved_org uuid;
  resolved_site uuid;
  is_new boolean := false;
begin
  if (select auth.uid()) is null or not public.has_portal_permission('assets.edit') then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'asset_name_required' using errcode = '22023';
  end if;

  if p_id is not null then
    select id, organization_id, site_id into target_id, resolved_org, resolved_site
      from public.assets where id = p_id;
    if not found then raise exception 'asset_not_found' using errcode = 'P0002'; end if;
    resolved_site := coalesce(p_site_id, resolved_site);
  else
    if p_site_id is null then raise exception 'site_required' using errcode = '22023'; end if;
    resolved_site := p_site_id;
    is_new := true;
  end if;

  select organization_id into resolved_org from public.sites where id = resolved_site;
  if resolved_org is null then raise exception 'site_not_found' using errcode = 'P0002'; end if;

  if not (public.is_internal_user() or public.is_org_member(resolved_org)) then
    raise exception 'organization_scope_denied' using errcode = '42501';
  end if;

  if is_new then
    insert into public.assets (
      organization_id, site_id, parent_id, kind, name, status, room, row_label, rack_label,
      u_position, u_height, model, serial_number, vendor, owner, asset_tag,
      purchased_at, warranty_expires_at, power_draw_w, notes, attributes, created_by
    ) values (
      resolved_org, resolved_site, p_parent_id, p_kind, trim(p_name), p_status, p_room, p_row_label,
      p_rack_label, p_u_position, greatest(coalesce(p_u_height, 1), 1), p_model, p_serial_number,
      p_vendor, p_owner, nullif(trim(coalesce(p_asset_tag, '')), ''), p_purchased_at,
      p_warranty_expires_at, p_power_draw_w, coalesce(p_notes, ''), coalesce(p_attributes, '{}'::jsonb),
      (select auth.uid())
    )
    returning id into target_id;

    insert into public.asset_events (asset_id, event_type, summary, actor_id)
    values (target_id, 'asset.created', format('Created %s "%s"', p_kind, trim(p_name)), (select auth.uid()));
  else
    update public.assets set
      site_id = resolved_site,
      parent_id = p_parent_id,
      kind = p_kind,
      name = trim(p_name),
      status = p_status,
      room = p_room,
      row_label = p_row_label,
      rack_label = p_rack_label,
      u_position = p_u_position,
      u_height = greatest(coalesce(p_u_height, 1), 1),
      model = p_model,
      serial_number = p_serial_number,
      vendor = p_vendor,
      owner = p_owner,
      asset_tag = nullif(trim(coalesce(p_asset_tag, '')), ''),
      purchased_at = p_purchased_at,
      warranty_expires_at = p_warranty_expires_at,
      power_draw_w = p_power_draw_w,
      notes = coalesce(p_notes, ''),
      attributes = coalesce(p_attributes, '{}'::jsonb),
      updated_at = now()
    where id = target_id;

    insert into public.asset_events (asset_id, event_type, summary, actor_id)
    values (target_id, 'asset.updated', format('Updated %s "%s"', p_kind, trim(p_name)), (select auth.uid()));
  end if;

  return target_id;
end;
$$;

create or replace function public.delete_asset(p_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or not public.has_portal_permission('assets.edit') then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if not exists (select 1 from public.assets a where a.id = p_id
                 and (public.is_internal_user() or public.is_org_member(a.organization_id))) then
    raise exception 'asset_access_denied' using errcode = '42501';
  end if;

  insert into public.asset_events (asset_id, event_type, summary, actor_id)
  select p_id, 'asset.deleted', format('Deleted asset %s', p_id), (select auth.uid());

  delete from public.assets where id = p_id;
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- 10. Planned / recurring work (§3.3)
-- ---------------------------------------------------------------------------
create or replace function public.save_recurring_plan(
  p_id uuid default null,
  p_organization_id uuid default null,
  p_site_id uuid default null,
  p_template_id uuid default null,
  p_title text default '',
  p_category text default 'preventive_maintenance',
  p_priority public.ticket_priority default 'normal',
  p_description text default '',
  p_cadence public.recurrence_cadence default 'monthly',
  p_interval_count integer default 1,
  p_start_at timestamptz default now(),
  p_end_at timestamptz default null,
  p_is_active boolean default true
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  target_id uuid;
  resolved_org uuid;
begin
  if (select auth.uid()) is null or not public.has_portal_permission('schedule.recurring') then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if coalesce(trim(p_title), '') = '' then raise exception 'plan_title_required' using errcode = '22023'; end if;
  if p_site_id is null then raise exception 'site_required' using errcode = '22023'; end if;

  select organization_id into resolved_org from public.sites where id = p_site_id;
  if resolved_org is null then raise exception 'site_not_found' using errcode = 'P0002'; end if;
  if not (public.is_internal_user() or public.is_org_member(resolved_org)) then
    raise exception 'organization_scope_denied' using errcode = '42501';
  end if;

  if p_id is null then
    insert into public.recurring_plans (
      organization_id, site_id, template_id, title, category, priority, description,
      cadence, interval_count, start_at, next_run_at, end_at, is_active, created_by
    ) values (
      resolved_org, p_site_id, p_template_id, trim(p_title), p_category, p_priority,
      coalesce(p_description, ''), p_cadence, greatest(coalesce(p_interval_count, 1), 1),
      coalesce(p_start_at, now()), coalesce(p_start_at, now()), p_end_at, p_is_active, (select auth.uid())
    ) returning id into target_id;
  else
    update public.recurring_plans set
      site_id = p_site_id,
      organization_id = resolved_org,
      template_id = p_template_id,
      title = trim(p_title),
      category = p_category,
      priority = p_priority,
      description = coalesce(p_description, ''),
      cadence = p_cadence,
      interval_count = greatest(coalesce(p_interval_count, 1), 1),
      start_at = coalesce(p_start_at, start_at),
      next_run_at = coalesce(p_start_at, next_run_at),
      end_at = p_end_at,
      is_active = p_is_active,
      updated_at = now()
    where id = p_id
    returning id into target_id;
    if target_id is null then raise exception 'plan_not_found' using errcode = 'P0002'; end if;
  end if;

  return target_id;
end;
$$;

create or replace function public.delete_recurring_plan(p_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or not public.has_portal_permission('schedule.recurring') then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  delete from public.recurring_plans
    where id = p_id and (public.is_internal_user() or public.is_org_member(organization_id));
  return true;
end;
$$;

create or replace function public.run_recurring_plans(p_limit integer default 5)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  plan_row record;
  created_count integer := 0;
  new_ticket_id uuid;
  step interval;
begin
  if (select auth.uid()) is null or not public.has_portal_permission('schedule.recurring') then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  for plan_row in
    select * from public.recurring_plans
    where is_active = true
      and next_run_at <= now()
      and (end_at is null or next_run_at <= end_at)
      and (public.is_internal_user() or public.is_org_member(organization_id))
    order by next_run_at
    limit greatest(coalesce(p_limit, 5), 1)
    for update skip locked
  loop
    insert into public.tickets (
      client_org_id, site_id, created_by, category, priority, title, description, scheduled_for
    ) values (
      plan_row.organization_id, plan_row.site_id, coalesce(plan_row.created_by, (select auth.uid())),
      plan_row.category, plan_row.priority, plan_row.title, plan_row.description, plan_row.next_run_at
    ) returning id into new_ticket_id;

    step := (case plan_row.cadence
      when 'weekly' then interval '1 week'
      when 'monthly' then interval '1 month'
      when 'quarterly' then interval '3 months'
      when 'yearly' then interval '1 year'
      else interval '1 month'
    end) * greatest(plan_row.interval_count, 1);

    update public.recurring_plans
      set next_run_at = next_run_at + step,
          last_ticket_id = new_ticket_id,
          updated_at = now()
      where id = plan_row.id;

    insert into public.ticket_events (ticket_id, actor_id, event_type, payload)
    values (new_ticket_id, (select auth.uid()), 'ticket.created_from_plan',
            jsonb_build_object('plan_id', plan_row.id, 'cadence', plan_row.cadence));

    created_count := created_count + 1;
  end loop;

  return created_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- 11. Availability RPCs
-- ---------------------------------------------------------------------------
create or replace function public.set_engineer_availability(p_status text)
returns text language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if p_status not in ('offline', 'available', 'busy') then
    raise exception 'invalid_availability' using errcode = '22023';
  end if;

  insert into public.engineer_profiles (user_id, availability)
  values ((select auth.uid()), p_status)
  on conflict (user_id) do update set availability = excluded.availability, updated_at = now();

  return p_status;
end;
$$;

create or replace function public.save_availability_window(
  p_user_id uuid, p_weekday integer, p_start_minute integer, p_end_minute integer, p_timezone text default 'Europe/Lisbon'
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  target_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if p_user_id <> (select auth.uid()) and not public.has_portal_permission('people.view') then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if p_weekday not between 0 and 6 then raise exception 'invalid_weekday' using errcode = '22023'; end if;
  if p_end_minute <= p_start_minute then raise exception 'invalid_window' using errcode = '22023'; end if;

  insert into public.engineer_availability (user_id, weekday, start_minute, end_minute, timezone)
  values (p_user_id, p_weekday, p_start_minute, p_end_minute, coalesce(p_timezone, 'Europe/Lisbon'))
  on conflict (user_id, weekday)
  do update set start_minute = excluded.start_minute, end_minute = excluded.end_minute, timezone = excluded.timezone
  returning id into target_id;

  return target_id;
end;
$$;

create or replace function public.delete_availability_window(p_user_id uuid, p_weekday integer)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if p_user_id <> (select auth.uid()) and not public.has_portal_permission('people.view') then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  delete from public.engineer_availability where user_id = p_user_id and weekday = p_weekday;
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- 12. Console data RPCs — metrics, search, capacity
-- ---------------------------------------------------------------------------
create or replace function public.portal_metrics()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  result jsonb;
  role_value public.app_role;
  open_states public.ticket_status[] := array['new','triaged','offered','assigned','en_route','on_site','in_progress','waiting_client','waiting_parts']::public.ticket_status[];
begin
  if (select auth.uid()) is null or not public.is_internal_user() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  role_value := public.current_app_role();

  select jsonb_build_object(
    'generated_at', now(),
    'tickets', jsonb_build_object(
      'total', (select count(*) from public.tickets),
      'open', (select count(*) from public.tickets where status = any(open_states)),
      'unassigned', (select count(*) from public.tickets where status = any(open_states) and assigned_to is null),
      'sla_at_risk', (select count(*) from public.tickets
                      where status = any(open_states) and sla_due_at is not null and sla_due_at < now() + interval '4 hours'),
      'sla_breached', (select count(*) from public.tickets
                       where status = any(open_states) and sla_due_at is not null and sla_due_at < now()),
      'critical_open', (select count(*) from public.tickets where status = any(open_states) and priority = 'critical'),
      'awaiting_approval', (select count(*) from public.tickets where status = 'completed_pending_approval'),
      'closed_30d', (select count(*) from public.tickets where closed_at is not null and closed_at > now() - interval '30 days'),
      'by_status', (select coalesce(jsonb_object_agg(status, total), '{}'::jsonb)
                    from (select status, count(*) total from public.tickets group by status) s),
      'by_priority', (select coalesce(jsonb_object_agg(priority, total), '{}'::jsonb)
                      from (select priority, count(*) total from public.tickets group by priority) p)
    ),
    'people', jsonb_build_object(
      'engineers_total', (select count(*) from public.profiles where role = 'freelancer'),
      'engineers_available', (select count(*) from public.engineer_profiles where availability = 'available'),
      'engineers_on_duty', (select count(*) from public.engineer_profiles where availability = 'busy'),
      'pending_verification', (select count(*) from public.engineer_profiles where verification_status = 'pending')
    ),
    'time', jsonb_build_object(
      'hours_this_month', (select coalesce(round(sum(minutes))::numeric / 60, 1) from public.time_entries
                           where started_at > date_trunc('month', now())),
      'pending_approval', (select count(*) from public.time_entries where approval_status = 'submitted'),
      'approved_hours', (select coalesce(round(sum(minutes))::numeric / 60, 1) from public.time_entries
                         where approval_status = 'approved')
    ),
    'assets', jsonb_build_object(
      'total', (select count(*) from public.assets),
      'devices', (select count(*) from public.assets where kind = 'device'),
      'in_service', (select count(*) from public.assets where status = 'in_service'),
      'warranty_expiring_90d', (select count(*) from public.assets
                                where warranty_expires_at is not null
                                  and warranty_expires_at < (now() + interval '90 days')::date)
    ),
    'schedule', jsonb_build_object(
      'active_plans', (select count(*) from public.recurring_plans where is_active = true),
      'plans_due', (select count(*) from public.recurring_plans where is_active = true and next_run_at <= now()),
      'visits_today', (select count(*) from public.tickets
                       where scheduled_for is not null and scheduled_for::date = now()::date),
      'visits_week', (select count(*) from public.tickets
                      where scheduled_for is not null and scheduled_for <= now() + interval '7 days')
    ),
    'money', case when public.has_portal_permission('finance.margins') then jsonb_build_object(
      'budget_open', (select coalesce(sum(budget), 0) from public.tickets where status = any(open_states)),
      'estimated_hours_open', (select coalesce(sum(estimated_hours), 0) from public.tickets where status = any(open_states))
    ) else jsonb_build_object('hidden', true) end
  ) into result;

  return result;
end;
$$;

create or replace function public.portal_search(p_query text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  needle text := '%' || lower(coalesce(trim(p_query), '')) || '%';
  result jsonb := '[]'::jsonb;
begin
  if (select auth.uid()) is null then return result; end if;
  if coalesce(trim(p_query), '') = '' then return result; end if;

  select coalesce(jsonb_agg(entry), '[]'::jsonb) into result
  from (
    (select jsonb_build_object(
      'kind', 'ticket', 'id', t.id,
      'title', t.title,
      'subtitle', format('TM-%s · %s', lpad(t.ticket_number::text, 5, '0'), t.status),
      'href', '/portal?view=dispatch&ticket=' || t.id
    ) as entry
    from public.tickets t
    where (lower(t.title) like needle or lower(coalesce(t.description, '')) like needle
           or t.ticket_number::text like needle)
      and public.can_access_ticket(t.id)
    limit 8)

    union all

    (select jsonb_build_object(
      'kind', 'asset', 'id', a.id,
      'title', a.name,
      'subtitle', coalesce(a.model, a.kind::text) || coalesce(' · ' || a.serial_number, ''),
      'href', '/portal?view=assets&asset=' || a.id
    )
    from public.assets a
    where (lower(a.name) like needle or lower(coalesce(a.serial_number, '')) like needle
           or lower(coalesce(a.asset_tag, '')) like needle or lower(coalesce(a.model, '')) like needle)
      and (public.is_internal_user() or public.is_org_member(a.organization_id))
    limit 8)

    union all

    (select jsonb_build_object(
      'kind', 'site', 'id', s.id,
      'title', s.name,
      'subtitle', s.address,
      'href', '/portal?view=assets&site=' || s.id
    )
    from public.sites s
    where (lower(s.name) like needle or lower(s.address) like needle)
      and (public.is_internal_user() or public.is_org_member(s.organization_id))
    limit 6)

    union all

    (select jsonb_build_object(
      'kind', 'person', 'id', p.id,
      'title', p.full_name,
      'subtitle', p.role::text,
      'href', '/portal?view=people&user=' || p.id
    )
    from public.profiles p
    where (lower(coalesce(p.full_name, '')) like needle or lower(coalesce(p.email, '')) like needle)
      and (public.is_internal_user() or p.id = (select auth.uid()))
    limit 6)
  ) matches;

  return result;
end;
$$;

create or replace function public.portal_capacity(p_days integer default 7)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  result jsonb;
begin
  if (select auth.uid()) is null or not public.is_internal_user() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(to_jsonb(day)), '[]'::jsonb) into result
    from (
      select
        to_char(d.day, 'YYYY-MM-DD') as date,
        to_char(d.day, 'Dy') as label,
        (select count(*) from public.tickets t
          where t.scheduled_for is not null and t.scheduled_for::date = d.day) as visits,
        (select count(*) from public.tickets t
          where t.scheduled_for is not null and t.scheduled_for::date = d.day and t.assigned_to is null) as unassigned,
        (select count(*) from public.time_off o
          where d.day between o.starts_at::date and o.ends_at::date) as on_leave
      from generate_series(
        now()::date,
        (now() + ((greatest(coalesce(p_days, 7), 1) - 1) || ' days')::interval)::date,
        interval '1 day'
      ) as d(day)
    ) day;

  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- 13. Re-assert the Wave 2/3 write RPCs (idempotent — safe on every project)
-- ---------------------------------------------------------------------------
grant update (started_at, ended_at, approval_status, notes, approved_by, approved_at) on public.time_entries to authenticated;

create or replace function public.send_ticket_message(
  p_ticket_id uuid,
  p_channel public.message_channel default 'client',
  p_body text default '',
  p_attachment_paths text[] default '{}'
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  new_msg_id uuid;
  ticket_row public.tickets%rowtype;
begin
  if (select auth.uid()) is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  select * into ticket_row from public.tickets where id = p_ticket_id;
  if not found then raise exception 'ticket_not_found' using errcode = 'P0002'; end if;
  if not public.can_access_ticket(p_ticket_id) then raise exception 'ticket_access_denied' using errcode = '42501'; end if;
  if p_channel = 'internal' and not (public.is_internal_user() or ticket_row.assigned_to = (select auth.uid())) then
    raise exception 'internal_channel_access_denied' using errcode = '42501';
  end if;
  if length(trim(p_body)) < 1 or length(trim(p_body)) > 10000 then
    raise exception 'invalid_message_length' using errcode = '22023';
  end if;

  insert into public.messages (ticket_id, channel, sender_id, body, attachment_paths)
  values (p_ticket_id, p_channel, (select auth.uid()), trim(p_body), p_attachment_paths)
  returning id into new_msg_id;

  insert into public.ticket_events (ticket_id, actor_id, event_type, payload)
  values (p_ticket_id, (select auth.uid()), 'message.sent',
          jsonb_build_object('channel', p_channel, 'message_id', new_msg_id));

  return new_msg_id;
end;
$$;

create or replace function public.log_time_entry(
  p_ticket_id uuid,
  p_category public.time_category,
  p_started_at timestamptz,
  p_ended_at timestamptz default null,
  p_source public.time_source default 'timer',
  p_notes text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  new_entry_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if not public.can_access_ticket(p_ticket_id) then raise exception 'ticket_access_denied' using errcode = '42501'; end if;
  if p_ended_at is not null and p_ended_at < p_started_at then
    raise exception 'invalid_time_interval' using errcode = '22023';
  end if;

  insert into public.time_entries (ticket_id, engineer_id, category, started_at, ended_at, source, approval_status, notes)
  values (p_ticket_id, (select auth.uid()), p_category, p_started_at, p_ended_at, p_source,
          case when p_ended_at is null then 'draft'::public.approval_status else 'submitted'::public.approval_status end,
          p_notes)
  returning id into new_entry_id;

  insert into public.ticket_events (ticket_id, actor_id, event_type, payload)
  values (p_ticket_id, (select auth.uid()), 'time.logged',
          jsonb_build_object('entry_id', new_entry_id, 'source', p_source));

  return new_entry_id;
end;
$$;

create or replace function public.approve_time_entry(
  p_entry_id uuid, p_status public.approval_status, p_notes text default null
) returns public.approval_status language plpgsql security definer set search_path = '' as $$
declare
  entry_row public.time_entries%rowtype;
begin
  if (select auth.uid()) is null or not public.is_internal_user() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if p_status not in ('approved', 'rejected') then raise exception 'invalid_approval_status' using errcode = '22023'; end if;

  select * into entry_row from public.time_entries where id = p_entry_id for update;
  if not found then raise exception 'entry_not_found' using errcode = 'P0002'; end if;

  update public.time_entries
    set approval_status = p_status, approved_by = (select auth.uid()), approved_at = now(),
        notes = coalesce(p_notes, notes)
    where id = p_entry_id;

  insert into public.ticket_events (ticket_id, actor_id, event_type, payload)
  values (entry_row.ticket_id, (select auth.uid()), 'time.approval_changed',
          jsonb_build_object('entry_id', p_entry_id, 'status', p_status));

  return p_status;
end;
$$;

-- ---------------------------------------------------------------------------
-- 14. Sample dataset (explicitly admin-triggered, tagged, and purgable)
-- ---------------------------------------------------------------------------
create or replace function public.portal_seed_demo()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := (select auth.uid());
  org_id uuid; site_id uuid; room_id uuid; row_id uuid; rack_id uuid;
  template_id uuid; plan_id uuid; ticket_id uuid;
  created_tickets integer := 0;
begin
  if actor is null or public.current_app_role() <> 'admin' then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select id into org_id from public.organizations where is_demo = true limit 1;
  if org_id is null then
    insert into public.organizations (type, name, billing_email, vat_number, country_code, is_demo)
    values ('client', 'DEMO — Northwind Colocation', 'billing@northwind-demo.example', 'PT000000000', 'PT', true)
    returning id into org_id;
  end if;

  select id into site_id from public.sites where organization_id = org_id limit 1;
  if site_id is null then
    insert into public.sites (organization_id, name, address, country_code, latitude, longitude, is_demo)
    values (org_id, 'DEMO — Lisbon DC1', 'Rua da Prata 80, 1100-420 Lisboa, Portugal', 'PT', 38.7072, -9.1363, true)
    returning id into site_id;
  end if;

  select a.id into room_id from public.assets a
    where a.organization_id = org_id and a.kind = 'room' and a.is_demo = true
    limit 1;
  if room_id is null then
    insert into public.assets (organization_id, site_id, kind, name, status, is_demo, created_by)
    values (org_id, site_id, 'room', 'Hall A', 'in_service', true, actor)
    returning id into room_id;

    insert into public.assets (organization_id, site_id, parent_id, kind, name, status, room, is_demo, created_by)
    values (org_id, site_id, room_id, 'row', 'Row A1', 'in_service', 'Hall A', true, actor)
    returning id into row_id;

    insert into public.assets (organization_id, site_id, parent_id, kind, name, status, room, row_label, rack_label, u_height, is_demo, created_by)
    values (org_id, site_id, row_id, 'rack', 'A1-01', 'in_service', 'Hall A', 'A1', 'A1-01', 42, true, actor)
    returning id into rack_id;

    insert into public.assets (organization_id, site_id, parent_id, kind, name, status, room, row_label, rack_label,
                               u_position, u_height, model, serial_number, vendor, power_draw_w, is_demo, created_by)
    values
      (org_id, site_id, rack_id, 'device', 'Leaf switch A1-01-01', 'in_service', 'Hall A', 'A1', 'A1-01', 42, 1,
       'Arista 7050X3', 'SN-DEMO-0001', 'Arista', 350, true, actor),
      (org_id, site_id, rack_id, 'device', 'Patch panel A1-01-02', 'in_service', 'Hall A', 'A1', 'A1-01', 41, 1,
       'Panduit 24-port LC', 'SN-DEMO-0002', 'Panduit', 0, true, actor),
      (org_id, site_id, rack_id, 'device', 'Compute node A1-01-10', 'in_service', 'Hall A', 'A1', 'A1-01', 32, 2,
       'Dell PowerEdge R660', 'SN-DEMO-0003', 'Dell', 750, true, actor);
  end if;

  select id into template_id from public.ticket_templates where is_demo = true limit 1;
  if template_id is null then
    insert into public.ticket_templates (organization_id, name, category, priority, title, description, checklist, estimated_hours, sla_hours, is_demo, created_by)
    values (null, 'Rack and stack — 10U', 'rack_and_stack', 'normal', 'Rack and stack 10U of equipment',
            'Install rails, mount equipment, dress and label cabling, photograph the result.',
            '["Confirm rack location and U space","Fit rails and mount equipment","Dress and label cabling","Power on and record serial numbers","Photograph front and rear"]'::jsonb,
            4, 72, true, actor)
    returning id into template_id;
  end if;

  select id into plan_id from public.recurring_plans where is_demo = true limit 1;
  if plan_id is null then
    insert into public.recurring_plans (organization_id, site_id, template_id, title, category, priority, description,
                                        cadence, interval_count, start_at, next_run_at, is_demo, created_by)
    values (org_id, site_id, template_id, 'Monthly hall inspection', 'preventive_maintenance', 'normal',
            'Walk the hall, check airflow, log temperatures and photograph anomalies.',
            'monthly', 1, now(), now() + interval '21 days', true, actor)
    returning id into plan_id;
  end if;

  insert into public.tickets (client_org_id, site_id, created_by, category, priority, title, description,
                              status, sla_due_at, estimated_hours, budget, scheduled_for, is_demo)
  values
    (org_id, site_id, actor, 'rack_and_stack', 'high', 'Install 2 compute nodes in A1-01',
     'Mount, cable and power two Dell R660 nodes in rack A1-01, U32-35.', 'new',
     now() + interval '3 days', 4, 640, now() + interval '2 days', true),
    (org_id, site_id, actor, 'structured_cabling', 'normal', 'Re-dress patch field A1-01',
     'Re-dress and re-label the LC patch field after the leaf switch replacement.', 'triaged',
     now() + interval '9 days', 3, 420, now() + interval '6 days', true),
    (org_id, site_id, actor, 'preventive_maintenance', 'low', 'Quarterly visual inspection — Hall A',
     'Photograph rowhot-aisle containment and record temperature readings.', 'assigned',
     now() + interval '20 days', 2, 260, now() + interval '20 days', true)
  returning id into ticket_id;

  created_tickets := 3;

  insert into public.audit_logs (actor_id, entity, entity_id, action, after_data)
  values (actor, 'demo_dataset', org_id, 'demo.seeded',
          jsonb_build_object('tickets', created_tickets, 'site', site_id));

  return jsonb_build_object('organization', org_id, 'site', site_id, 'tickets', created_tickets);
end;
$$;

create or replace function public.portal_purge_demo()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  removed integer := 0;
begin
  if (select auth.uid()) is null or public.current_app_role() <> 'admin' then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  delete from public.tickets where is_demo = true;
  delete from public.recurring_plans where is_demo = true;
  delete from public.ticket_templates where is_demo = true;
  delete from public.assets where is_demo = true;
  select count(*) into removed from public.organizations where is_demo = true;
  delete from public.organizations where is_demo = true;

  insert into public.audit_logs (actor_id, entity, action, after_data)
  values ((select auth.uid()), 'demo_dataset', 'demo.purged', jsonb_build_object('organizations', removed));

  return removed;
end;
$$;

-- ---------------------------------------------------------------------------
-- 15. Row-level security
-- ---------------------------------------------------------------------------
alter table public.permission_registry enable row level security;
alter table public.user_permissions enable row level security;
alter table public.user_scopes enable row level security;
alter table public.ticket_templates enable row level security;
alter table public.ticket_assignees enable row level security;
alter table public.recurring_plans enable row level security;
alter table public.assets enable row level security;
alter table public.asset_events enable row level security;
alter table public.engineer_availability enable row level security;
alter table public.time_off enable row level security;
alter table public.saved_views enable row level security;

drop policy if exists permission_registry_select on public.permission_registry;
create policy permission_registry_select on public.permission_registry
  for select to authenticated using (true);

drop policy if exists permission_registry_admin_write on public.permission_registry;
create policy permission_registry_admin_write on public.permission_registry
  for all to authenticated using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

drop policy if exists user_permissions_select on public.user_permissions;
create policy user_permissions_select on public.user_permissions
  for select to authenticated using (user_id = (select auth.uid()) or public.has_portal_permission('settings.users'));

drop policy if exists user_permissions_admin_write on public.user_permissions;
create policy user_permissions_admin_write on public.user_permissions
  for all to authenticated using (public.has_portal_permission('settings.users'))
  with check (public.has_portal_permission('settings.users'));

drop policy if exists user_scopes_select on public.user_scopes;
create policy user_scopes_select on public.user_scopes
  for select to authenticated using (user_id = (select auth.uid()) or public.has_portal_permission('settings.users'));

drop policy if exists user_scopes_admin_write on public.user_scopes;
create policy user_scopes_admin_write on public.user_scopes
  for all to authenticated using (public.has_portal_permission('settings.users'))
  with check (public.has_portal_permission('settings.users'));

drop policy if exists templates_select on public.ticket_templates;
create policy templates_select on public.ticket_templates
  for select to authenticated using (
    public.is_internal_user()
    or organization_id is null
    or public.is_org_member(organization_id)
  );

drop policy if exists templates_write on public.ticket_templates;
create policy templates_write on public.ticket_templates
  for all to authenticated using (public.has_portal_permission('settings.templates'))
  with check (public.has_portal_permission('settings.templates'));

drop policy if exists assignees_select on public.ticket_assignees;
create policy assignees_select on public.ticket_assignees
  for select to authenticated using (public.can_access_ticket(ticket_id));

drop policy if exists assignees_write on public.ticket_assignees;
create policy assignees_write on public.ticket_assignees
  for all to authenticated using (
    public.is_internal_user() and public.has_portal_permission('tickets.assign')
  ) with check (
    public.is_internal_user() and public.has_portal_permission('tickets.assign')
  );

drop policy if exists plans_select on public.recurring_plans;
create policy plans_select on public.recurring_plans
  for select to authenticated using (public.is_internal_user() or public.is_org_member(organization_id));

drop policy if exists plans_write on public.recurring_plans;
create policy plans_write on public.recurring_plans
  for all to authenticated using (public.has_portal_permission('schedule.recurring'))
  with check (public.has_portal_permission('schedule.recurring'));

drop policy if exists assets_select on public.assets;
create policy assets_select on public.assets
  for select to authenticated using (
    public.has_portal_permission('assets.view')
    and (public.is_internal_user() or public.is_org_member(organization_id))
  );

drop policy if exists assets_write on public.assets;
create policy assets_write on public.assets
  for all to authenticated using (
    public.has_portal_permission('assets.edit') and public.is_internal_user()
  ) with check (
    public.has_portal_permission('assets.edit') and public.is_internal_user()
  );

drop policy if exists asset_events_select on public.asset_events;
create policy asset_events_select on public.asset_events
  for select to authenticated using (
    exists (select 1 from public.assets a
            where a.id = asset_events.asset_id
              and (public.is_internal_user() or public.is_org_member(a.organization_id)))
  );

drop policy if exists asset_events_insert on public.asset_events;
create policy asset_events_insert on public.asset_events
  for insert to authenticated with check (
    exists (select 1 from public.assets a
            where a.id = asset_events.asset_id
              and (public.is_internal_user() or public.is_org_member(a.organization_id)))
  );

drop policy if exists availability_select on public.engineer_availability;
create policy availability_select on public.engineer_availability
  for select to authenticated using (
    user_id = (select auth.uid())
    or (public.is_internal_user() and public.has_portal_permission('schedule.view'))
  );

drop policy if exists availability_write on public.engineer_availability;
create policy availability_write on public.engineer_availability
  for all to authenticated using (
    user_id = (select auth.uid())
    or (public.is_internal_user() and public.has_portal_permission('people.view'))
  ) with check (
    user_id = (select auth.uid())
    or (public.is_internal_user() and public.has_portal_permission('people.view'))
  );

drop policy if exists time_off_select on public.time_off;
create policy time_off_select on public.time_off
  for select to authenticated using (
    user_id = (select auth.uid())
    or (public.is_internal_user() and public.has_portal_permission('schedule.view'))
  );

drop policy if exists time_off_write on public.time_off;
create policy time_off_write on public.time_off
  for all to authenticated using (
    user_id = (select auth.uid())
    or (public.is_internal_user() and public.has_portal_permission('people.view'))
  ) with check (
    user_id = (select auth.uid())
    or (public.is_internal_user() and public.has_portal_permission('people.view'))
  );

drop policy if exists saved_views_select on public.saved_views;
create policy saved_views_select on public.saved_views
  for select to authenticated using (user_id = (select auth.uid()) or (shared and public.is_internal_user()));

drop policy if exists saved_views_write on public.saved_views;
create policy saved_views_write on public.saved_views
  for all to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 16. Grants
-- ---------------------------------------------------------------------------
grant usage on schema public to authenticated;
grant select on public.permission_registry to authenticated;
grant select, insert, update, delete on public.user_permissions to authenticated;
grant select, insert, update, delete on public.user_scopes to authenticated;
grant select, insert, update, delete on public.ticket_templates to authenticated;
grant select, insert, update, delete on public.ticket_assignees to authenticated;
grant select, insert, update, delete on public.recurring_plans to authenticated;
grant select, insert, update, delete on public.assets to authenticated;
grant select, insert on public.asset_events to authenticated;
grant select, insert, update, delete on public.engineer_availability to authenticated;
grant select, insert, update, delete on public.time_off to authenticated;
grant select, insert, update, delete on public.saved_views to authenticated;

-- Functions are SECURITY DEFINER: strip the implicit PUBLIC execute grant first,
-- then hand access back to authenticated only.
do $$
declare fn record;
begin
  for fn in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'has_portal_permission','current_permissions','portal_list_users','portal_set_role',
        'portal_set_permission','portal_set_scope','portal_set_user_active','bulk_update_tickets',
        'create_ticket_from_template','set_ticket_crew','remove_ticket_crew','save_asset','delete_asset',
        'save_recurring_plan','delete_recurring_plan','run_recurring_plans','set_engineer_availability',
        'save_availability_window','delete_availability_window','portal_metrics','portal_search',
        'portal_capacity','portal_seed_demo','portal_purge_demo','send_ticket_message',
        'log_time_entry','approve_time_entry'
      )
  loop
    execute format('revoke all on function %s from public', fn.sig);
    execute format('grant execute on function %s to authenticated', fn.sig);
  end loop;
end $$;

grant execute on function public.has_portal_permission(text) to authenticated;
revoke all on function public.current_permissions() from public;
grant execute on function public.current_permissions() to authenticated;
grant execute on function public.portal_list_users() to authenticated;
grant execute on function public.portal_set_role(uuid, public.app_role) to authenticated;
grant execute on function public.portal_set_permission(uuid, text, boolean, boolean) to authenticated;
grant execute on function public.portal_set_scope(uuid, public.scope_type, text, boolean) to authenticated;
grant execute on function public.portal_set_user_active(uuid, boolean) to authenticated;
grant execute on function public.bulk_update_tickets(uuid[], text, text) to authenticated;
grant execute on function public.create_ticket_from_template(uuid, uuid, uuid, text, timestamptz, public.ticket_priority) to authenticated;
grant execute on function public.set_ticket_crew(uuid, uuid, text, numeric) to authenticated;
grant execute on function public.remove_ticket_crew(uuid, uuid) to authenticated;
grant execute on function public.save_asset(uuid, uuid, uuid, public.asset_kind, text, public.asset_status, text, text, text, integer, integer, text, text, text, text, text, date, date, integer, text, jsonb) to authenticated;
grant execute on function public.delete_asset(uuid) to authenticated;
grant execute on function public.save_recurring_plan(uuid, uuid, uuid, uuid, text, text, public.ticket_priority, text, public.recurrence_cadence, integer, timestamptz, timestamptz, boolean) to authenticated;
grant execute on function public.delete_recurring_plan(uuid) to authenticated;
grant execute on function public.run_recurring_plans(integer) to authenticated;
grant execute on function public.set_engineer_availability(text) to authenticated;
grant execute on function public.save_availability_window(uuid, integer, integer, integer, text) to authenticated;
grant execute on function public.delete_availability_window(uuid, integer) to authenticated;
grant execute on function public.portal_metrics() to authenticated;
grant execute on function public.portal_search(text) to authenticated;
grant execute on function public.portal_capacity(integer) to authenticated;
grant execute on function public.portal_seed_demo() to authenticated;
grant execute on function public.portal_purge_demo() to authenticated;

-- Backfill profile emails for accounts created before this migration.
-- Non-fatal: if the executing role cannot read auth.users the column simply
-- stays empty and is filled the next time the account is touched.
do $$
begin
  update public.profiles p
    set email = u.email
    from auth.users u
    where u.id = p.id and coalesce(p.email, '') = '';
exception when others then
  raise notice 'profile email backfill skipped: %', sqlerrm;
end $$;
