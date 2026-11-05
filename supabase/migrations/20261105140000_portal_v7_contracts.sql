-- TechMaths Operations Portal — R7 "Contracts, SLA tiers, retainers and bundles"
-- §3.4 of the Expanded Feature Plan lists four commercial instruments the portal did not have:
-- retainers, prepaid hour bundles, SLA tiers and framework agreements. `clients.contracts` existed
-- as a permission key gating rate cards, but there was no contract to hold.
--
-- This release adds one table that carries all four shapes, applies an SLA target to every ticket
-- raised while a tier is live, tracks consumption against included or prepaid hours, and exposes a
-- client-safe read so the client portal can show the agreement without leaking fees or margins.

-- ---------------------------------------------------------------------------
-- 1. Types and table
-- ---------------------------------------------------------------------------
do $$
begin
  create type public.contract_kind as enum ('retainer', 'prepaid_bundle', 'sla_tier', 'framework');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.contract_status as enum ('draft', 'active', 'paused', 'expired', 'cancelled');
exception when duplicate_object then null;
end $$;

create table if not exists public.client_contracts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  kind public.contract_kind not null,
  status public.contract_status not null default 'draft',
  name text not null check (length(trim(name)) between 2 and 160),
  reference text not null default '',
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  starts_on date not null default current_date,
  ends_on date,
  -- SLA targets in minutes. `response_minutes` becomes the ticket's sla_due_at.
  response_minutes integer check (response_minutes is null or response_minutes between 15 and 43200),
  resolution_minutes integer check (resolution_minutes is null or resolution_minutes between 15 and 43200),
  coverage text not null default 'business_hours'
    check (coverage in ('business_hours', 'extended', '24x7')),
  -- Retainer fee and included hours; bundle is a prepaid block drawn down over its life.
  monthly_fee numeric(12,2) not null default 0 check (monthly_fee >= 0),
  included_hours numeric(8,2) not null default 0 check (included_hours >= 0),
  bundle_hours numeric(8,2) not null default 0 check (bundle_hours >= 0),
  bundle_consumed numeric(8,2) not null default 0 check (bundle_consumed >= 0),
  overage_rate numeric(12,2) check (overage_rate is null or overage_rate >= 0),
  notes text not null default '',
  is_demo boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_contracts_dates check (ends_on is null or ends_on >= starts_on),
  constraint client_contracts_targets check (
    response_minutes is null or resolution_minutes is null or resolution_minutes >= response_minutes
  )
);

create index if not exists client_contracts_org_idx
  on public.client_contracts (organization_id, status, starts_on desc);

-- One live SLA tier per client: two tiers would make sla_due_at ambiguous.
create unique index if not exists client_contracts_one_active_sla
  on public.client_contracts (organization_id)
  where status = 'active' and kind = 'sla_tier';

alter table public.tickets
  add column if not exists contract_id uuid references public.client_contracts(id) on delete set null;

create index if not exists tickets_contract_idx on public.tickets (contract_id);

-- ---------------------------------------------------------------------------
-- 2. Predicates and helpers
-- ---------------------------------------------------------------------------
create or replace function public.contract_can_manage()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.is_internal_user() and public.has_portal_permission('clients.contracts'), false)
$$;
revoke all on function public.contract_can_manage() from public, anon, authenticated;

-- Internal read path only. A client reads the agreement through `portal_client_contracts`, which
-- strips the fee, the overage rate and the internal note; the table itself is never theirs to read.
create or replace function public.contract_can_view(p_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(
    public.is_internal_user() and (
      public.has_portal_permission('clients.contracts') or public.has_portal_permission('clients.view')
    ),
    false
  )
$$;
revoke all on function public.contract_can_view(uuid) from public, anon, authenticated;

-- The contract that governs a client today: an active SLA tier first, then a framework, then a
-- retainer, each only if its date window covers today.
create or replace function public.contract_active_for(p_org uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select c.id
  from public.client_contracts c
  where c.organization_id = p_org
    and c.status = 'active'
    and c.starts_on <= current_date
    and (c.ends_on is null or c.ends_on >= current_date)
  order by case c.kind
             when 'sla_tier' then 0
             when 'framework' then 1
             when 'retainer' then 2
             else 3
           end,
           c.starts_on desc
  limit 1
$$;
revoke all on function public.contract_active_for(uuid) from public, anon, authenticated;

-- Hours consumed against a contract: approved field time on that client's tickets inside the
-- contract window that are tagged with the contract (or, for older tickets, inside the period).
create or replace function public.contract_usage(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_contract public.client_contracts%rowtype;
  v_hours numeric(10,2);
  v_period_start timestamptz;
  v_period_end timestamptz;
  v_tickets integer;
  v_met integer;
  v_breached integer;
  v_at_risk integer;
begin
  select * into v_contract from public.client_contracts where id = p_id;
  if not found then
    raise exception 'contract_not_found' using errcode = 'P0002';
  end if;

  -- A retainer is drawn down monthly; a bundle over its whole life.
  v_period_start := case
    when v_contract.kind = 'retainer' then greatest(v_contract.starts_on::timestamptz, date_trunc('month', now()))
    else v_contract.starts_on::timestamptz
  end;
  v_period_end := case
    when v_contract.kind = 'retainer' then date_trunc('month', now()) + interval '1 month'
    when v_contract.ends_on is not null then (v_contract.ends_on + 1)::timestamptz
    else now() + interval '100 years'
  end;

  select coalesce(round(sum(te.minutes) / 60.0, 2), 0) into v_hours
  from public.time_entries te
  join public.tickets t on t.id = te.ticket_id
  where t.client_org_id = v_contract.organization_id
    and te.approval_status = 'approved'
    and te.started_at >= v_period_start
    and te.started_at < v_period_end;

  select
    count(*),
    count(*) filter (where r.responded_at is not null and t.sla_due_at is not null and r.responded_at <= t.sla_due_at),
    count(*) filter (where t.sla_due_at is not null and (
      (r.responded_at is not null and r.responded_at > t.sla_due_at)
      or (r.responded_at is null and t.sla_due_at < now())
    )),
    count(*) filter (where t.sla_due_at is not null and r.responded_at is null and t.sla_due_at >= now()
                     and t.sla_due_at < now() + interval '2 hours')
  into v_tickets, v_met, v_breached, v_at_risk
  from public.tickets t
  left join lateral (
    select min(e.created_at) as responded_at
    from public.ticket_events e
    where e.ticket_id = t.id
      and e.event_type = 'ticket.status_changed'
      and e.payload ->> 'to' in ('assigned', 'en_route', 'on_site', 'in_progress', 'completed_pending_approval')
  ) r on true
  where t.client_org_id = v_contract.organization_id
    and t.created_at >= v_period_start
    and t.created_at < v_period_end
    and (t.contract_id = v_contract.id or t.contract_id is null);

  return jsonb_build_object(
    'contract_id', v_contract.id,
    'kind', v_contract.kind,
    'status', v_contract.status,
    'included_hours', v_contract.included_hours,
    'bundle_hours', v_contract.bundle_hours,
    'bundle_consumed', v_contract.bundle_consumed,
    'hours_used', v_hours,
    'included_remaining', round(greatest(v_contract.included_hours - v_hours, 0), 2),
    'bundle_remaining', round(greatest(v_contract.bundle_hours - v_contract.bundle_consumed, 0), 2),
    'overage_hours', round(greatest(v_hours - v_contract.included_hours, 0), 2),
    'overage_value', round(greatest(v_hours - v_contract.included_hours, 0) * coalesce(v_contract.overage_rate, 0), 2),
    'period_start', v_period_start,
    'period_end', v_period_end,
    'tickets', v_tickets,
    'sla_met', v_met,
    'sla_breached', v_breached,
    'sla_at_risk', v_at_risk,
    'sla_compliance_pct', case when (v_met + v_breached) = 0 then null
                               else round(100.0 * v_met / (v_met + v_breached), 1) end
  );
end;
$$;
revoke all on function public.contract_usage(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Reads
-- ---------------------------------------------------------------------------
create or replace function public.contract_list(
  p_organization_id uuid default null,
  p_status text default null
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  payload jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if not (public.contract_can_manage() or public.has_portal_permission('clients.view')) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(entry order by organization_name, starts_on desc), '[]'::jsonb) into payload
  from (
    select c.starts_on, o.name as organization_name,
      jsonb_build_object(
        'id', c.id,
        'organization_id', c.organization_id,
        'organization_name', o.name,
        'kind', c.kind,
        'status', c.status,
        'name', c.name,
        'reference', c.reference,
        'currency', c.currency,
        'starts_on', c.starts_on,
        'ends_on', c.ends_on,
        'response_minutes', c.response_minutes,
        'resolution_minutes', c.resolution_minutes,
        'coverage', c.coverage,
        'monthly_fee', c.monthly_fee,
        'included_hours', c.included_hours,
        'bundle_hours', c.bundle_hours,
        'bundle_consumed', c.bundle_consumed,
        'overage_rate', c.overage_rate,
        'notes', c.notes,
        'is_demo', c.is_demo,
        'created_at', c.created_at,
        'usage', public.contract_usage(c.id)
      ) as entry
    from public.client_contracts c
    join public.organizations o on o.id = c.organization_id
    where (p_organization_id is null or c.organization_id = p_organization_id)
      and (p_status is null or p_status = '' or c.status::text = p_status)
  ) rows;

  return payload;
end;
$$;

create or replace function public.contract_get(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  payload jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'id', c.id,
    'organization_id', c.organization_id,
    'organization_name', o.name,
    'kind', c.kind,
    'status', c.status,
    'name', c.name,
    'reference', c.reference,
    'currency', c.currency,
    'starts_on', c.starts_on,
    'ends_on', c.ends_on,
    'response_minutes', c.response_minutes,
    'resolution_minutes', c.resolution_minutes,
    'coverage', c.coverage,
    'monthly_fee', c.monthly_fee,
    'included_hours', c.included_hours,
    'bundle_hours', c.bundle_hours,
    'bundle_consumed', c.bundle_consumed,
    'overage_rate', c.overage_rate,
    'notes', c.notes,
    'is_demo', c.is_demo,
    'created_at', c.created_at,
    'usage', public.contract_usage(c.id)
  ) into payload
  from public.client_contracts c
  join public.organizations o on o.id = c.organization_id
  where c.id = p_id;

  if payload is null then
    raise exception 'contract_not_found' using errcode = 'P0002';
  end if;
  if not public.contract_can_view((payload ->> 'organization_id')::uuid) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  return payload;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Writes
-- ---------------------------------------------------------------------------
create or replace function public.contract_save(
  p_id uuid,
  p_organization_id uuid,
  p_kind public.contract_kind,
  p_name text,
  p_status public.contract_status default 'draft',
  p_reference text default '',
  p_currency text default 'EUR',
  p_starts_on date default current_date,
  p_ends_on date default null,
  p_response_minutes integer default null,
  p_resolution_minutes integer default null,
  p_coverage text default 'business_hours',
  p_monthly_fee numeric default 0,
  p_included_hours numeric default 0,
  p_bundle_hours numeric default 0,
  p_overage_rate numeric default null,
  p_notes text default ''
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_before jsonb;
begin
  if (select auth.uid()) is null or not public.contract_can_manage() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if not exists (select 1 from public.organizations o where o.id = p_organization_id and o.type = 'client') then
    raise exception 'client_organization_required' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_name, ''))) < 2 then
    raise exception 'contract_name_required' using errcode = '22023';
  end if;
  if p_starts_on is null then
    raise exception 'contract_dates_required' using errcode = '22023';
  end if;

  if p_id is null then
    insert into public.client_contracts (
      organization_id, kind, status, name, reference, currency, starts_on, ends_on,
      response_minutes, resolution_minutes, coverage, monthly_fee, included_hours,
      bundle_hours, overage_rate, notes, created_by
    ) values (
      p_organization_id, p_kind, coalesce(p_status, 'draft'), trim(p_name), coalesce(p_reference, ''),
      coalesce(nullif(p_currency, ''), 'EUR'), p_starts_on, p_ends_on,
      p_response_minutes, p_resolution_minutes, coalesce(p_coverage, 'business_hours'),
      coalesce(p_monthly_fee, 0), coalesce(p_included_hours, 0),
      coalesce(p_bundle_hours, 0), p_overage_rate, coalesce(p_notes, ''), (select auth.uid())
    ) returning id into v_id;
  else
    select to_jsonb(c) into v_before from public.client_contracts c where c.id = p_id;
    if v_before is null then
      raise exception 'contract_not_found' using errcode = 'P0002';
    end if;
    update public.client_contracts set
      organization_id = p_organization_id,
      kind = p_kind,
      status = coalesce(p_status, status),
      name = trim(p_name),
      reference = coalesce(p_reference, ''),
      currency = coalesce(nullif(p_currency, ''), currency),
      starts_on = p_starts_on,
      ends_on = p_ends_on,
      response_minutes = p_response_minutes,
      resolution_minutes = p_resolution_minutes,
      coverage = coalesce(p_coverage, coverage),
      monthly_fee = coalesce(p_monthly_fee, monthly_fee),
      included_hours = coalesce(p_included_hours, included_hours),
      bundle_hours = coalesce(p_bundle_hours, bundle_hours),
      overage_rate = p_overage_rate,
      notes = coalesce(p_notes, ''),
      updated_at = now()
    where id = p_id;
    v_id := p_id;
  end if;

  insert into public.audit_logs (actor_id, entity, entity_id, action, before_data, after_data)
  values ((select auth.uid()), 'client_contract', v_id,
          case when p_id is null then 'contract.created' else 'contract.updated' end,
          v_before,
          (select to_jsonb(c) from public.client_contracts c where c.id = v_id));

  return v_id;
end;
$$;

create or replace function public.contract_set_status(
  p_id uuid,
  p_status public.contract_status
) returns public.contract_status language plpgsql security definer set search_path = '' as $$
declare
  v_contract public.client_contracts%rowtype;
begin
  if (select auth.uid()) is null or not public.contract_can_manage() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select * into v_contract from public.client_contracts where id = p_id for update;
  if not found then
    raise exception 'contract_not_found' using errcode = 'P0002';
  end if;
  if v_contract.status = 'cancelled' then
    raise exception 'contract_already_cancelled' using errcode = '22023';
  end if;
  if p_status = 'active' and v_contract.kind = 'sla_tier' and exists (
    select 1 from public.client_contracts c
    where c.organization_id = v_contract.organization_id
      and c.kind = 'sla_tier' and c.status = 'active' and c.id <> v_contract.id
  ) then
    raise exception 'sla_tier_already_active' using errcode = '22023';
  end if;

  update public.client_contracts
    set status = p_status, updated_at = now()
    where id = p_id;

  insert into public.audit_logs (actor_id, entity, entity_id, action, before_data, after_data)
  values ((select auth.uid()), 'client_contract', p_id,
          'contract.status_changed',
          jsonb_build_object('status', v_contract.status),
          jsonb_build_object('status', p_status));

  return p_status;
end;
$$;

-- Draw down a prepaid bundle by hand (e.g. hours used before the portal tracked time).
create or replace function public.contract_consume_bundle(
  p_id uuid,
  p_hours numeric,
  p_note text default ''
) returns numeric language plpgsql security definer set search_path = '' as $$
declare
  v_contract public.client_contracts%rowtype;
  v_next numeric(8,2);
begin
  if (select auth.uid()) is null or not public.contract_can_manage() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if coalesce(p_hours, 0) <= 0 then
    raise exception 'invalid_hours' using errcode = '22023';
  end if;

  select * into v_contract from public.client_contracts where id = p_id for update;
  if not found then
    raise exception 'contract_not_found' using errcode = 'P0002';
  end if;
  if v_contract.kind <> 'prepaid_bundle' or v_contract.bundle_hours <= 0 then
    raise exception 'not_a_bundle' using errcode = '22023';
  end if;
  if v_contract.bundle_consumed + p_hours > v_contract.bundle_hours then
    raise exception 'bundle_exhausted' using errcode = '22023';
  end if;

  v_next := v_contract.bundle_consumed + p_hours;
  update public.client_contracts set bundle_consumed = v_next, updated_at = now() where id = p_id;

  insert into public.audit_logs (actor_id, entity, entity_id, action, after_data)
  values ((select auth.uid()), 'client_contract', p_id, 'contract.bundle_consumed',
          jsonb_build_object('hours', p_hours, 'consumed', v_next, 'note', p_note));

  return v_next;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. SLA applied to tickets automatically
-- ---------------------------------------------------------------------------
create or replace function public.portal_apply_contract_sla()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_contract public.client_contracts%rowtype;
begin
  if new.contract_id is null then
    select * into v_contract from public.client_contracts c
    where c.id = public.contract_active_for(new.client_org_id);
    if found and v_contract.response_minutes is not null then
      new.contract_id := v_contract.id;
      if new.sla_due_at is null then
        new.sla_due_at := now() + make_interval(mins => v_contract.response_minutes);
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists tickets_apply_contract_sla on public.tickets;
create trigger tickets_apply_contract_sla
  before insert on public.tickets
  for each row execute function public.portal_apply_contract_sla();

-- Portfolio view for the console header.
create or replace function public.contract_metrics()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  payload jsonb;
begin
  if (select auth.uid()) is null or not (public.contract_can_manage() or public.has_portal_permission('clients.view')) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'active', (select count(*) from public.client_contracts c where c.status = 'active'),
    'draft', (select count(*) from public.client_contracts c where c.status = 'draft'),
    'mrr', (select coalesce(sum(c.monthly_fee), 0) from public.client_contracts c where c.status = 'active' and c.kind = 'retainer'),
    'retained_hours', (select coalesce(sum(c.included_hours), 0) from public.client_contracts c where c.status = 'active' and c.kind = 'retainer'),
    'bundle_hours_left', (select coalesce(sum(greatest(c.bundle_hours - c.bundle_consumed, 0)), 0)
                          from public.client_contracts c where c.status = 'active' and c.kind = 'prepaid_bundle'),
    'expiring_30d', (select count(*) from public.client_contracts c
                     where c.status = 'active' and c.ends_on is not null
                       and c.ends_on between current_date and current_date + 30),
    'sla_clients', (select count(*) from public.client_contracts c where c.status = 'active' and c.kind = 'sla_tier'),
    'sla_cover_24x7', (select count(*) from public.client_contracts c where c.status = 'active' and c.coverage = '24x7'),
    'breached_30d', (
      select count(*) from public.tickets t
      join public.client_contracts c on c.id = t.contract_id
      where t.sla_due_at is not null
        and t.sla_due_at < now()
        and t.created_at >= now() - interval '30 days'
        and not exists (
          select 1 from public.ticket_events e
          where e.ticket_id = t.id and e.event_type = 'ticket.status_changed'
            and e.payload ->> 'to' in ('assigned','en_route','on_site','in_progress','completed_pending_approval')
            and e.created_at <= t.sla_due_at
        )
    ),
    'flags', jsonb_build_object(
      'can_manage', public.contract_can_manage()
    )
  ) into payload;

  return payload;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Client-safe read (§3.4 — the client portal shows the agreement, never the fee)
-- ---------------------------------------------------------------------------
create or replace function public.portal_client_contracts()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_org uuid := public.portal_client_require_org();
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', c.id,
      'kind', c.kind,
      'status', c.status,
      'name', c.name,
      'reference', c.reference,
      'starts_on', c.starts_on,
      'ends_on', c.ends_on,
      'response_minutes', c.response_minutes,
      'resolution_minutes', c.resolution_minutes,
      'coverage', c.coverage,
      'included_hours', c.included_hours,
      'bundle_hours', c.bundle_hours,
      'usage', jsonb_build_object(
        'hours_used', u ->> 'hours_used',
        'included_remaining', u ->> 'included_remaining',
        'bundle_remaining', u ->> 'bundle_remaining',
        'sla_met', u ->> 'sla_met',
        'sla_breached', u ->> 'sla_breached',
        'sla_compliance_pct', u ->> 'sla_compliance_pct'
      )
    ) order by c.starts_on desc)
    from public.client_contracts c
    cross join lateral public.contract_usage(c.id) u
    where c.organization_id = v_org
      and c.status in ('active', 'paused')
  ), '[]'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Demo data
-- ---------------------------------------------------------------------------
create or replace function public.contract_seed_demo()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := (select auth.uid());
  v_org uuid;
  v_sla uuid;
  v_retainer uuid;
begin
  if v_actor is null or public.current_app_role() <> 'admin' then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select id into v_org from public.organizations where is_demo = true order by created_at limit 1;
  if v_org is null then
    raise exception 'demo_dataset_missing' using errcode = '22023';
  end if;

  select id into v_sla from public.client_contracts where organization_id = v_org and kind = 'sla_tier';
  if v_sla is null then
    v_sla := public.contract_save(
      p_id => null,
      p_organization_id => v_org,
      p_kind => 'sla_tier',
      p_name => 'DEMO — Gold SLA',
      p_status => 'active',
      p_reference => 'DEMO-SLA-GOLD',
      p_starts_on => current_date - 30,
      p_ends_on => current_date + 335,
      p_response_minutes => 240,
      p_resolution_minutes => 1440,
      p_coverage => '24x7',
      p_monthly_fee => 0,
      p_included_hours => 0,
      p_notes => 'Demo tier: 4 hour response, 24 hour resolution, 24x7 coverage.'
    );
    update public.client_contracts set is_demo = true where id = v_sla;
  end if;

  select id into v_retainer from public.client_contracts where organization_id = v_org and kind = 'retainer';
  if v_retainer is null then
    v_retainer := public.contract_save(
      p_id => null,
      p_organization_id => v_org,
      p_kind => 'retainer',
      p_name => 'DEMO — Smart-hands retainer, 20h/month',
      p_status => 'active',
      p_reference => 'DEMO-RET-20',
      p_starts_on => date_trunc('month', current_date)::date,
      p_ends_on => (date_trunc('month', current_date) + interval '11 months')::date,
      p_response_minutes => 480,
      p_resolution_minutes => 2880,
      p_coverage => 'extended',
      p_monthly_fee => 1400,
      p_included_hours => 20,
      p_overage_rate => 62,
      p_notes => 'Demo retainer: 20 included hours per month, overage at the framework rate.'
    );
    update public.client_contracts set is_demo = true where id = v_retainer;
  end if;

  insert into public.audit_logs (actor_id, entity, entity_id, action, after_data)
  values (v_actor, 'demo_dataset', v_org, 'demo.contracts_seeded',
          jsonb_build_object('sla', v_sla, 'retainer', v_retainer));

  return jsonb_build_object('organization', v_org, 'sla', v_sla, 'retainer', v_retainer);
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Row-level security, purge, grants
-- ---------------------------------------------------------------------------
alter table public.client_contracts enable row level security;

drop policy if exists client_contracts_select on public.client_contracts;
create policy client_contracts_select on public.client_contracts
  for select to authenticated using (public.contract_can_view(organization_id));

grant select on public.client_contracts to authenticated;

-- Extend the demo purge so contracts never outlive the demo client.
create or replace function public.portal_purge_demo()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  removed integer := 0;
begin
  if (select auth.uid()) is null or public.current_app_role() <> 'admin' then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  update public.tickets set contract_id = null where contract_id is not null;
  delete from public.client_contracts where is_demo = true;
  delete from public.payments where is_demo = true;
  delete from public.invoices where is_demo = true;
  delete from public.quotes where is_demo = true;
  delete from public.rate_cards where is_demo = true;
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

do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in (
      'contract_list','contract_get','contract_save','contract_set_status',
      'contract_consume_bundle','contract_metrics','contract_seed_demo',
      'portal_client_contracts'
    )
  loop
    execute format('revoke all on function %s from public, anon', fn.sig);
    execute format('grant execute on function %s to authenticated', fn.sig);
  end loop;

  -- Helper predicates and triggers are not an API: nothing outside the definer functions calls them.
  for fn in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in (
      'contract_can_manage','contract_active_for','contract_usage','portal_apply_contract_sla'
    )
  loop
    execute format('revoke all on function %s from public, anon, authenticated', fn.sig);
  end loop;

  -- Exception: the SELECT policy on client_contracts is evaluated as the caller, so the caller must
  -- be allowed to execute the predicate it calls. It returns a boolean and reads no rows.
  execute 'revoke all on function public.contract_can_view(uuid) from public, anon';
  execute 'grant execute on function public.contract_can_view(uuid) to authenticated';
end $$;
