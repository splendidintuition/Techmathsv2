-- TechMaths Operations Portal — R3 "Money spine"
-- Rate cards → quotes → client approval → invoice → recorded payment.
--
-- Contract note: additive only. Nothing existing is dropped or retyped.
-- Every write goes through a SECURITY DEFINER function; tables are read-only to
-- clients of the API. Because those functions run as the owner (and therefore
-- bypass RLS), each one implements its own explicit scope check — RLS policies
-- below are defence in depth for direct reads only.
--
-- Client-facing actions (send quote, issue invoice, record payment) are gated by
-- feature_flags rows that default to FALSE, per the release decision that no real
-- money document leaves the building until an Admin turns it on.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- 0. Client VAT setting
-- ---------------------------------------------------------------------------
alter table public.organizations add column if not exists vat_rate numeric(5,2) not null default 23
  check (vat_rate >= 0 and vat_rate <= 100);

-- ---------------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.quote_status as enum ('draft', 'sent', 'accepted', 'declined', 'expired', 'converted', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.invoice_status as enum ('draft', 'sent', 'part_paid', 'paid', 'overdue', 'void');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method as enum ('bank_transfer', 'card', 'stripe', 'cash', 'direct_debit', 'credit_note');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.line_unit as enum ('hour', 'day', 'visit', 'unit', 'fixed');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- 2. Feature flags (the release guard)
-- ---------------------------------------------------------------------------
create table if not exists public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  description text not null default '',
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.feature_flags (key, enabled, description) values
  ('money.send_quotes',      false, 'Mark a quote as sent to the client'),
  ('money.send_invoices',    false, 'Issue an invoice to a client with a legal number'),
  ('money.record_payments',  false, 'Record money received against an invoice')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- 3. Rate cards
-- ---------------------------------------------------------------------------
create table if not exists public.rate_cards (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  name text not null,
  currency text not null default 'EUR',
  country_code text,
  vat_rate numeric(5,2) not null default 23 check (vat_rate >= 0 and vat_rate <= 100),
  is_default boolean not null default false,
  valid_from date not null default current_date,
  valid_to date,
  is_active boolean not null default true,
  notes text not null default '',
  is_demo boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rate_cards_window_chk check (valid_to is null or valid_to >= valid_from)
);

create table if not exists public.rate_card_lines (
  id uuid primary key default gen_random_uuid(),
  rate_card_id uuid not null references public.rate_cards(id) on delete cascade,
  category text not null,
  crew_role text not null default 'engineer' check (crew_role in ('engineer', 'lead', 'helper', 'remote')),
  unit public.line_unit not null default 'hour',
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  engineer_cost numeric(12,2) check (engineer_cost is null or engineer_cost >= 0),
  min_units numeric(6,2) not null default 0 check (min_units >= 0),
  notes text not null default '',
  unique (rate_card_id, category, crew_role, unit)
);

-- ---------------------------------------------------------------------------
-- 4. Quotes
-- ---------------------------------------------------------------------------
create sequence if not exists public.quote_number_seq;
create sequence if not exists public.invoice_number_seq;

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  quote_year smallint not null default (extract(year from now()))::smallint,
  quote_seq bigint not null default nextval('public.quote_number_seq'),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  site_id uuid references public.sites(id) on delete set null,
  title text not null,
  status public.quote_status not null default 'draft',
  currency text not null default 'EUR',
  vat_rate numeric(5,2) not null default 23 check (vat_rate >= 0 and vat_rate <= 100),
  vat_country_code text,
  discount_pct numeric(5,2) not null default 0 check (discount_pct >= 0 and discount_pct <= 100),
  subtotal numeric(14,2) not null default 0,
  vat_total numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  valid_until date,
  notes text not null default '',
  terms text not null default '',
  sent_at timestamptz,
  responded_at timestamptz,
  accepted_by_name text,
  accepted_by uuid references public.profiles(id) on delete set null,
  declined_reason text,
  converted_invoice_id uuid,
  is_demo boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (quote_year, quote_seq)
);

create table if not exists public.quote_lines (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  description text not null,
  category text not null default 'general',
  unit public.line_unit not null default 'hour',
  quantity numeric(10,2) not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  sort_order integer not null default 0,
  line_total numeric(14,2) generated always as (round(quantity * unit_price, 2)) stored
);

-- ---------------------------------------------------------------------------
-- 5. Invoices and payments
-- ---------------------------------------------------------------------------
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_year smallint not null default (extract(year from now()))::smallint,
  invoice_seq bigint not null default nextval('public.invoice_number_seq'),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  site_id uuid references public.sites(id) on delete set null,
  quote_id uuid references public.quotes(id) on delete set null,
  title text not null,
  status public.invoice_status not null default 'draft',
  currency text not null default 'EUR',
  vat_rate numeric(5,2) not null default 23 check (vat_rate >= 0 and vat_rate <= 100),
  vat_country_code text,
  discount_pct numeric(5,2) not null default 0 check (discount_pct >= 0 and discount_pct <= 100),
  subtotal numeric(14,2) not null default 0,
  vat_total numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  amount_paid numeric(14,2) not null default 0,
  reference text not null default '',
  notes text not null default '',
  issued_at timestamptz,
  due_at date,
  paid_at timestamptz,
  voided_at timestamptz,
  void_reason text,
  is_demo boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (invoice_year, invoice_seq)
);

create table if not exists public.invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  category text not null default 'general',
  unit public.line_unit not null default 'hour',
  quantity numeric(10,2) not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  sort_order integer not null default 0,
  line_total numeric(14,2) generated always as (round(quantity * unit_price, 2)) stored
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'EUR',
  method public.payment_method not null default 'bank_transfer',
  reference text not null default '',
  received_at date not null default current_date,
  notes text not null default '',
  is_demo boolean not null default false,
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists quotes_org_idx on public.quotes(organization_id, status);
create index if not exists quote_lines_quote_idx on public.quote_lines(quote_id, sort_order);
create index if not exists invoices_org_idx on public.invoices(organization_id, status);
create index if not exists invoices_due_idx on public.invoices(due_at) where status in ('sent', 'part_paid', 'overdue');
create index if not exists invoice_lines_invoice_idx on public.invoice_lines(invoice_id, sort_order);
create index if not exists payments_invoice_idx on public.payments(invoice_id, received_at desc);
create index if not exists rate_card_lines_card_idx on public.rate_card_lines(rate_card_id);

drop trigger if exists rate_cards_updated_at on public.rate_cards;
create trigger rate_cards_updated_at before update on public.rate_cards for each row execute function public.set_updated_at();
drop trigger if exists quotes_updated_at on public.quotes;
create trigger quotes_updated_at before update on public.quotes for each row execute function public.set_updated_at();
drop trigger if exists invoices_updated_at on public.invoices;
create trigger invoices_updated_at before update on public.invoices for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 6. Money helpers (internal — no execute grant)
-- ---------------------------------------------------------------------------
create or replace function public.money_can_view(p_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.is_internal_user() and public.has_portal_permission('finance.invoices'), false)
      or coalesce(public.is_org_member(p_org), false);
$$;

create or replace function public.money_require_flag(p_key text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_enabled boolean;
begin
  select enabled into v_enabled from public.feature_flags where key = p_key;
  if not coalesce(v_enabled, false) then
    raise exception 'feature_disabled:%', p_key using errcode = '0A000';
  end if;
end;
$$;

create or replace function public.money_recalc_quote(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_lines numeric(14,2);
  v_pct numeric(5,2);
  v_rate numeric(5,2);
  v_sub numeric(14,2);
  v_vat numeric(14,2);
begin
  select coalesce(sum(line_total), 0) into v_lines from public.quote_lines where quote_id = p_id;
  select discount_pct, vat_rate into v_pct, v_rate from public.quotes where id = p_id;
  if not found then raise exception 'quote_not_found' using errcode = 'P0002'; end if;

  v_sub := round(v_lines * (1 - coalesce(v_pct, 0) / 100), 2);
  v_vat := round(v_sub * coalesce(v_rate, 0) / 100, 2);

  update public.quotes
    set subtotal = v_sub, vat_total = v_vat, total = v_sub + v_vat
    where id = p_id;
end;
$$;

create or replace function public.money_recalc_invoice(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_lines numeric(14,2);
  v_pct numeric(5,2);
  v_rate numeric(5,2);
  v_sub numeric(14,2);
  v_vat numeric(14,2);
  v_total numeric(14,2);
  v_paid numeric(14,2);
  v_status public.invoice_status;
  v_issued timestamptz;
  v_due date;
begin
  select coalesce(sum(line_total), 0) into v_lines from public.invoice_lines where invoice_id = p_id;
  select discount_pct, vat_rate, status, issued_at, due_at
    into v_pct, v_rate, v_status, v_issued, v_due
    from public.invoices where id = p_id;
  if not found then raise exception 'invoice_not_found' using errcode = 'P0002'; end if;

  v_sub := round(v_lines * (1 - coalesce(v_pct, 0) / 100), 2);
  v_vat := round(v_sub * coalesce(v_rate, 0) / 100, 2);
  v_total := v_sub + v_vat;
  select coalesce(sum(amount), 0) into v_paid from public.payments where invoice_id = p_id;

  if v_status = 'void' then
    update public.invoices
      set subtotal = v_sub, vat_total = v_vat, total = v_total, amount_paid = v_paid
      where id = p_id;
  elsif v_total > 0 and v_paid >= v_total then
    update public.invoices
      set subtotal = v_sub, vat_total = v_vat, total = v_total, amount_paid = v_paid,
          status = 'paid', paid_at = coalesce(paid_at, now())
      where id = p_id;
  elsif v_paid > 0 then
    update public.invoices
      set subtotal = v_sub, vat_total = v_vat, total = v_total, amount_paid = v_paid,
          status = 'part_paid', paid_at = null
      where id = p_id;
  else
    update public.invoices
      set subtotal = v_sub, vat_total = v_vat, total = v_total, amount_paid = 0, paid_at = null,
          status = case
            when v_issued is null then 'draft'::public.invoice_status
            when v_due is not null and v_due < current_date then 'overdue'::public.invoice_status
            else 'sent'::public.invoice_status
          end
      where id = p_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Feature flag RPCs
-- ---------------------------------------------------------------------------
create or replace function public.money_flags()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_object_agg(f.key, f.enabled), '{}'::jsonb)
  from public.feature_flags f;
$$;

create or replace function public.money_set_flag(p_key text, p_enabled boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or not (public.current_app_role() = 'admin') then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if not exists (select 1 from public.feature_flags f where f.key = p_key) then
    raise exception 'unknown_flag' using errcode = '22023';
  end if;

  update public.feature_flags
    set enabled = p_enabled, updated_by = (select auth.uid()), updated_at = now()
    where key = p_key;

  insert into public.audit_logs (actor_id, entity, action, after_data)
  values ((select auth.uid()), 'feature_flag', 'flag.changed',
          jsonb_build_object('key', p_key, 'enabled', p_enabled));

  return p_enabled;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Rate cards
-- ---------------------------------------------------------------------------
create or replace function public.money_list_rate_cards()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_result jsonb;
begin
  if (select auth.uid()) is null or not public.is_internal_user() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if not (public.has_portal_permission('clients.contracts') or public.has_portal_permission('finance.invoices')) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(card order by card ->> 'name'), '[]'::jsonb) into v_result
  from (
    select jsonb_build_object(
      'id', rc.id,
      'organization_id', rc.organization_id,
      'client_name', o.name,
      'name', rc.name,
      'currency', rc.currency,
      'country_code', rc.country_code,
      'vat_rate', rc.vat_rate,
      'is_default', rc.is_default,
      'is_active', rc.is_active,
      'valid_from', rc.valid_from,
      'valid_to', rc.valid_to,
      'notes', rc.notes,
      'is_demo', rc.is_demo,
      'lines', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', l.id, 'category', l.category, 'crew_role', l.crew_role, 'unit', l.unit,
          'unit_price', l.unit_price, 'min_units', l.min_units, 'notes', l.notes,
          'engineer_cost', case when public.has_portal_permission('finance.margins') then l.engineer_cost else null end
        ) order by l.category, l.crew_role)
        from public.rate_card_lines l where l.rate_card_id = rc.id
      ), '[]'::jsonb)
    ) as card
    from public.rate_cards rc
    left join public.organizations o on o.id = rc.organization_id
  ) cards;

  return v_result;
end;
$$;

create or replace function public.money_save_rate_card(
  p_id uuid default null,
  p_organization_id uuid default null,
  p_name text default '',
  p_currency text default 'EUR',
  p_country_code text default null,
  p_vat_rate numeric default 23,
  p_is_default boolean default false,
  p_valid_from date default current_date,
  p_valid_to date default null,
  p_notes text default '',
  p_lines jsonb default '[]'::jsonb
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_line jsonb;
  v_index integer := 0;
begin
  if (select auth.uid()) is null or not public.has_portal_permission('clients.contracts') then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'rate_card_name_required' using errcode = '22023';
  end if;
  if p_valid_to is not null and p_valid_from is not null and p_valid_to < p_valid_from then
    raise exception 'invalid_validity_window' using errcode = '22023';
  end if;

  if p_is_default then
    update public.rate_cards set is_default = false
      where is_default = true and (p_id is null or id <> p_id);
  end if;

  if p_id is null then
    insert into public.rate_cards (
      organization_id, name, currency, country_code, vat_rate, is_default,
      valid_from, valid_to, notes, created_by
    ) values (
      p_organization_id, trim(p_name), coalesce(nullif(trim(p_currency), ''), 'EUR'),
      nullif(trim(coalesce(p_country_code, '')), ''), coalesce(p_vat_rate, 23), p_is_default,
      coalesce(p_valid_from, current_date), p_valid_to, coalesce(p_notes, ''), (select auth.uid())
    ) returning id into v_id;
  else
    update public.rate_cards set
      organization_id = p_organization_id,
      name = trim(p_name),
      currency = coalesce(nullif(trim(p_currency), ''), 'EUR'),
      country_code = nullif(trim(coalesce(p_country_code, '')), ''),
      vat_rate = coalesce(p_vat_rate, vat_rate),
      is_default = p_is_default,
      valid_from = coalesce(p_valid_from, valid_from),
      valid_to = p_valid_to,
      notes = coalesce(p_notes, ''),
      is_active = true
    where id = p_id
    returning id into v_id;
    if v_id is null then raise exception 'rate_card_not_found' using errcode = 'P0002'; end if;
    delete from public.rate_card_lines where rate_card_id = v_id;
  end if;

  for v_line in select * from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb))
  loop
    if coalesce(trim(v_line ->> 'category'), '') = '' then
      continue;
    end if;
    insert into public.rate_card_lines (
      rate_card_id, category, crew_role, unit, unit_price, engineer_cost, min_units, notes
    ) values (
      v_id,
      trim(v_line ->> 'category'),
      coalesce(nullif(trim(v_line ->> 'crew_role'), ''), 'engineer'),
      coalesce(nullif(trim(v_line ->> 'unit'), ''), 'hour')::public.line_unit,
      coalesce((v_line ->> 'unit_price')::numeric, 0),
      nullif(v_line ->> 'engineer_cost', '')::numeric,
      coalesce((v_line ->> 'min_units')::numeric, 0),
      coalesce(v_line ->> 'notes', '')
    );
    v_index := v_index + 1;
  end loop;

  insert into public.audit_logs (actor_id, entity, entity_id, action, after_data)
  values ((select auth.uid()), 'rate_card', v_id,
          case when p_id is null then 'rate_card.created' else 'rate_card.updated' end,
          jsonb_build_object('name', p_name, 'lines', v_index));

  return v_id;
end;
$$;

create or replace function public.money_delete_rate_card(p_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or not public.has_portal_permission('clients.contracts') then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  delete from public.rate_cards where id = p_id;
  insert into public.audit_logs (actor_id, entity, entity_id, action)
  values ((select auth.uid()), 'rate_card', p_id, 'rate_card.deleted');
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. Quotes
-- ---------------------------------------------------------------------------
create or replace function public.money_list_quotes(p_status text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_result jsonb;
begin
  if (select auth.uid()) is null then raise exception 'not_authenticated' using errcode = '42501'; end if;

  select coalesce(jsonb_agg(entry order by entry ->> 'created_at' desc), '[]'::jsonb) into v_result
  from (
    select jsonb_build_object(
      'id', q.id,
      'number', format('Q-%s-%s', q.quote_year, lpad(q.quote_seq::text, 4, '0')),
      'title', q.title,
      'status', q.status,
      'organization_id', q.organization_id,
      'client_name', o.name,
      'site_id', q.site_id,
      'site_name', s.name,
      'currency', q.currency,
      'vat_rate', q.vat_rate,
      'subtotal', q.subtotal,
      'vat_total', q.vat_total,
      'total', q.total,
      'valid_until', q.valid_until,
      'sent_at', q.sent_at,
      'responded_at', q.responded_at,
      'accepted_by_name', q.accepted_by_name,
      'declined_reason', q.declined_reason,
      'converted_invoice_id', q.converted_invoice_id,
      'line_count', (select count(*) from public.quote_lines l where l.quote_id = q.id),
      'is_demo', q.is_demo,
      'created_at', q.created_at
    ) as entry
    from public.quotes q
    join public.organizations o on o.id = q.organization_id
    left join public.sites s on s.id = q.site_id
    where public.money_can_view(q.organization_id)
      and (p_status is null or p_status = '' or q.status::text = p_status)
  ) entries;

  return v_result;
end;
$$;

create or replace function public.money_get_quote(p_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_result jsonb;
begin
  if (select auth.uid()) is null then raise exception 'not_authenticated' using errcode = '42501'; end if;

  select jsonb_build_object(
    'id', q.id,
    'number', format('Q-%s-%s', q.quote_year, lpad(q.quote_seq::text, 4, '0')),
    'title', q.title,
    'status', q.status,
    'organization_id', q.organization_id,
    'client_name', o.name,
    'site_id', q.site_id,
    'currency', q.currency,
    'vat_rate', q.vat_rate,
    'discount_pct', q.discount_pct,
    'subtotal', q.subtotal,
    'vat_total', q.vat_total,
    'total', q.total,
    'valid_until', q.valid_until,
    'notes', q.notes,
    'terms', q.terms,
    'sent_at', q.sent_at,
    'responded_at', q.responded_at,
    'accepted_by_name', q.accepted_by_name,
    'declined_reason', q.declined_reason,
    'converted_invoice_id', q.converted_invoice_id,
    'is_demo', q.is_demo,
    'created_at', q.created_at,
    'lines', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', l.id, 'description', l.description, 'category', l.category, 'unit', l.unit,
        'quantity', l.quantity, 'unit_price', l.unit_price, 'line_total', l.line_total
      ) order by l.sort_order, l.description)
      from public.quote_lines l where l.quote_id = q.id
    ), '[]'::jsonb)
  ) into v_result
  from public.quotes q
  join public.organizations o on o.id = q.organization_id
  where q.id = p_id and public.money_can_view(q.organization_id);

  if v_result is null then raise exception 'quote_not_found' using errcode = 'P0002'; end if;
  return v_result;
end;
$$;

create or replace function public.money_save_quote(
  p_id uuid default null,
  p_organization_id uuid default null,
  p_site_id uuid default null,
  p_title text default '',
  p_vat_rate numeric default 23,
  p_discount_pct numeric default 0,
  p_valid_until date default null,
  p_notes text default '',
  p_terms text default '',
  p_lines jsonb default '[]'::jsonb
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_status public.quote_status;
  v_line jsonb;
  v_index integer := 0;
begin
  if (select auth.uid()) is null or not (
    public.is_internal_user()
    and (public.has_portal_permission('finance.invoices') or public.has_portal_permission('clients.contracts'))
  ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if coalesce(trim(p_title), '') = '' then
    raise exception 'quote_title_required' using errcode = '22023';
  end if;

  if p_id is null then
    if p_organization_id is null then
      raise exception 'client_organization_required' using errcode = '22023';
    end if;
    insert into public.quotes (
      organization_id, site_id, title, vat_rate, discount_pct, valid_until, notes, terms, created_by
    ) values (
      p_organization_id, p_site_id, trim(p_title), coalesce(p_vat_rate, 23),
      coalesce(p_discount_pct, 0), p_valid_until, coalesce(p_notes, ''), coalesce(p_terms, ''),
      (select auth.uid())
    ) returning id into v_id;
  else
    select status into v_status from public.quotes where id = p_id;
    if not found then raise exception 'quote_not_found' using errcode = 'P0002'; end if;
    if v_status <> 'draft' then
      raise exception 'quote_not_editable' using errcode = '22023';
    end if;

    update public.quotes set
      organization_id = coalesce(p_organization_id, organization_id),
      site_id = p_site_id,
      title = trim(p_title),
      vat_rate = coalesce(p_vat_rate, vat_rate),
      discount_pct = coalesce(p_discount_pct, discount_pct),
      valid_until = p_valid_until,
      notes = coalesce(p_notes, ''),
      terms = coalesce(p_terms, '')
    where id = p_id
    returning id into v_id;

    delete from public.quote_lines where quote_id = v_id;
  end if;

  for v_line in select * from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb))
  loop
    if coalesce(trim(v_line ->> 'description'), '') = '' then
      continue;
    end if;
    insert into public.quote_lines (quote_id, description, category, unit, quantity, unit_price, sort_order)
    values (
      v_id,
      trim(v_line ->> 'description'),
      coalesce(nullif(trim(v_line ->> 'category'), ''), 'general'),
      coalesce(nullif(trim(v_line ->> 'unit'), ''), 'hour')::public.line_unit,
      greatest(coalesce((v_line ->> 'quantity')::numeric, 1), 0.01),
      greatest(coalesce((v_line ->> 'unit_price')::numeric, 0), 0),
      v_index
    );
    v_index := v_index + 1;
  end loop;

  perform public.money_recalc_quote(v_id);

  insert into public.audit_logs (actor_id, entity, entity_id, action, after_data)
  values ((select auth.uid()), 'quote', v_id,
          case when p_id is null then 'quote.created' else 'quote.updated' end,
          jsonb_build_object('title', p_title, 'lines', v_index));

  return v_id;
end;
$$;

create or replace function public.money_send_quote(p_quote_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_status public.quote_status;
  v_lines integer;
begin
  if (select auth.uid()) is null or not (
    public.is_internal_user() and public.has_portal_permission('finance.invoices')
  ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  perform public.money_require_flag('money.send_quotes');

  select status into v_status from public.quotes where id = p_quote_id for update;
  if not found then raise exception 'quote_not_found' using errcode = 'P0002'; end if;
  if v_status <> 'draft' then raise exception 'quote_not_draft' using errcode = '22023'; end if;

  select count(*) into v_lines from public.quote_lines where quote_id = p_quote_id;
  if v_lines = 0 then raise exception 'quote_has_no_lines' using errcode = '22023'; end if;

  update public.quotes set status = 'sent', sent_at = now() where id = p_quote_id;

  insert into public.audit_logs (actor_id, entity, entity_id, action)
  values ((select auth.uid()), 'quote', p_quote_id, 'quote.sent');

  return true;
end;
$$;

create or replace function public.money_respond_quote(
  p_quote_id uuid, p_accept boolean, p_name text default null, p_reason text default null
) returns public.quote_status language plpgsql security definer set search_path = '' as $$
declare
  v_status public.quote_status;
  v_org uuid;
  v_name text;
  v_next public.quote_status;
begin
  if (select auth.uid()) is null then raise exception 'not_authenticated' using errcode = '42501'; end if;

  select status, organization_id into v_status, v_org from public.quotes where id = p_quote_id for update;
  if not found then raise exception 'quote_not_found' using errcode = 'P0002'; end if;

  if not (
    public.is_org_member(v_org)
    or (public.is_internal_user() and public.has_portal_permission('finance.invoices'))
  ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if v_status <> 'sent' then raise exception 'quote_not_awaiting_response' using errcode = '22023'; end if;

  v_next := case when p_accept then 'accepted'::public.quote_status else 'declined'::public.quote_status end;
  v_name := coalesce(nullif(trim(coalesce(p_name, '')), ''),
                     (select p.full_name from public.profiles p where p.id = (select auth.uid())),
                     'Client');

  update public.quotes set
    status = v_next,
    responded_at = now(),
    accepted_by_name = case when p_accept then v_name else accepted_by_name end,
    accepted_by = case when p_accept then (select auth.uid()) else accepted_by end,
    declined_reason = case when p_accept then null else nullif(trim(coalesce(p_reason, '')), '') end
  where id = p_quote_id;

  insert into public.audit_logs (actor_id, entity, entity_id, action, after_data)
  values ((select auth.uid()), 'quote', p_quote_id,
          case when p_accept then 'quote.accepted' else 'quote.declined' end,
          jsonb_build_object('name', v_name, 'reason', p_reason));

  return v_next;
end;
$$;

create or replace function public.money_quote_to_invoice(p_quote_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_quote public.quotes%rowtype;
  v_invoice_id uuid;
begin
  if (select auth.uid()) is null or not (
    public.is_internal_user() and public.has_portal_permission('finance.invoices')
  ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select * into v_quote from public.quotes where id = p_quote_id for update;
  if not found then raise exception 'quote_not_found' using errcode = 'P0002'; end if;
  if v_quote.status <> 'accepted' then raise exception 'quote_not_accepted' using errcode = '22023'; end if;
  if v_quote.converted_invoice_id is not null then
    select id into v_invoice_id from public.invoices where id = v_quote.converted_invoice_id;
    if v_invoice_id is not null then return v_invoice_id; end if;
  end if;

  insert into public.invoices (
    organization_id, site_id, quote_id, title, vat_rate, vat_country_code,
    discount_pct, notes, created_by
  ) values (
    v_quote.organization_id, v_quote.site_id, v_quote.id,
    v_quote.title, v_quote.vat_rate, v_quote.vat_country_code,
    v_quote.discount_pct, v_quote.notes, (select auth.uid())
  ) returning id into v_invoice_id;

  insert into public.invoice_lines (invoice_id, description, category, unit, quantity, unit_price, sort_order)
  select v_invoice_id, l.description, l.category, l.unit, l.quantity, l.unit_price, l.sort_order
  from public.quote_lines l where l.quote_id = v_quote.id;

  perform public.money_recalc_invoice(v_invoice_id);

  update public.quotes set status = 'converted', converted_invoice_id = v_invoice_id where id = v_quote.id;

  insert into public.audit_logs (actor_id, entity, entity_id, action, after_data)
  values ((select auth.uid()), 'invoice', v_invoice_id, 'invoice.from_quote',
          jsonb_build_object('quote_id', v_quote.id));

  return v_invoice_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 10. Invoices
-- ---------------------------------------------------------------------------
create or replace function public.money_list_invoices(p_status text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_result jsonb;
begin
  if (select auth.uid()) is null then raise exception 'not_authenticated' using errcode = '42501'; end if;

  select coalesce(jsonb_agg(entry order by entry ->> 'created_at' desc), '[]'::jsonb) into v_result
  from (
    select jsonb_build_object(
      'id', i.id,
      'number', format('INV-%s-%s', i.invoice_year, lpad(i.invoice_seq::text, 4, '0')),
      'title', i.title,
      'status', i.status,
      'organization_id', i.organization_id,
      'client_name', o.name,
      'site_id', i.site_id,
      'site_name', s.name,
      'quote_id', i.quote_id,
      'currency', i.currency,
      'vat_rate', i.vat_rate,
      'subtotal', i.subtotal,
      'vat_total', i.vat_total,
      'total', i.total,
      'amount_paid', i.amount_paid,
      'balance', greatest(i.total - i.amount_paid, 0),
      'reference', i.reference,
      'issued_at', i.issued_at,
      'due_at', i.due_at,
      'paid_at', i.paid_at,
      'void_reason', i.void_reason,
      'is_demo', i.is_demo,
      'created_at', i.created_at
    ) as entry
    from public.invoices i
    join public.organizations o on o.id = i.organization_id
    left join public.sites s on s.id = i.site_id
    where public.money_can_view(i.organization_id)
      and (p_status is null or p_status = '' or i.status::text = p_status)
  ) entries;

  return v_result;
end;
$$;

create or replace function public.money_get_invoice(p_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_result jsonb;
begin
  if (select auth.uid()) is null then raise exception 'not_authenticated' using errcode = '42501'; end if;

  select jsonb_build_object(
    'id', i.id,
    'number', format('INV-%s-%s', i.invoice_year, lpad(i.invoice_seq::text, 4, '0')),
    'title', i.title,
    'status', i.status,
    'organization_id', i.organization_id,
    'client_name', o.name,
    'client_vat_number', o.vat_number,
    'site_id', i.site_id,
    'quote_id', i.quote_id,
    'currency', i.currency,
    'vat_rate', i.vat_rate,
    'vat_country_code', i.vat_country_code,
    'discount_pct', i.discount_pct,
    'subtotal', i.subtotal,
    'vat_total', i.vat_total,
    'total', i.total,
    'amount_paid', i.amount_paid,
    'balance', greatest(i.total - i.amount_paid, 0),
    'reference', i.reference,
    'notes', i.notes,
    'issued_at', i.issued_at,
    'due_at', i.due_at,
    'paid_at', i.paid_at,
    'void_reason', i.void_reason,
    'is_demo', i.is_demo,
    'created_at', i.created_at,
    'lines', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', l.id, 'description', l.description, 'category', l.category, 'unit', l.unit,
        'quantity', l.quantity, 'unit_price', l.unit_price, 'line_total', l.line_total
      ) order by l.sort_order, l.description)
      from public.invoice_lines l where l.invoice_id = i.id
    ), '[]'::jsonb),
    'payments', case
      when public.is_internal_user() and public.has_portal_permission('finance.payments')
      then coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', pay.id, 'amount', pay.amount, 'method', pay.method, 'reference', pay.reference,
          'received_at', pay.received_at, 'notes', pay.notes, 'is_demo', pay.is_demo
        ) order by pay.received_at desc)
        from public.payments pay where pay.invoice_id = i.id
      ), '[]'::jsonb)
      else '[]'::jsonb
    end
  ) into v_result
  from public.invoices i
  join public.organizations o on o.id = i.organization_id
  where i.id = p_id and public.money_can_view(i.organization_id);

  if v_result is null then raise exception 'invoice_not_found' using errcode = 'P0002'; end if;
  return v_result;
end;
$$;

create or replace function public.money_save_invoice(
  p_id uuid default null,
  p_organization_id uuid default null,
  p_site_id uuid default null,
  p_title text default '',
  p_vat_rate numeric default 23,
  p_discount_pct numeric default 0,
  p_reference text default '',
  p_notes text default '',
  p_lines jsonb default '[]'::jsonb
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_status public.invoice_status;
  v_quote uuid;
  v_line jsonb;
  v_index integer := 0;
begin
  if (select auth.uid()) is null or not (
    public.is_internal_user() and public.has_portal_permission('finance.invoices')
  ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if coalesce(trim(p_title), '') = '' then
    raise exception 'invoice_title_required' using errcode = '22023';
  end if;

  if p_id is null then
    if p_organization_id is null then
      raise exception 'client_organization_required' using errcode = '22023';
    end if;
    insert into public.invoices (
      organization_id, site_id, title, vat_rate, discount_pct, reference, notes, created_by
    ) values (
      p_organization_id, p_site_id, trim(p_title), coalesce(p_vat_rate, 23),
      coalesce(p_discount_pct, 0), coalesce(p_reference, ''), coalesce(p_notes, ''), (select auth.uid())
    ) returning id into v_id;
  else
    select status, quote_id into v_status, v_quote from public.invoices where id = p_id;
    if not found then raise exception 'invoice_not_found' using errcode = 'P0002'; end if;
    if v_status <> 'draft' then raise exception 'invoice_not_editable' using errcode = '22023'; end if;

    update public.invoices set
      organization_id = coalesce(p_organization_id, organization_id),
      site_id = p_site_id,
      title = trim(p_title),
      vat_rate = coalesce(p_vat_rate, vat_rate),
      discount_pct = coalesce(p_discount_pct, discount_pct),
      reference = coalesce(p_reference, ''),
      notes = coalesce(p_notes, '')
    where id = p_id
    returning id into v_id;

    delete from public.invoice_lines where invoice_id = v_id;
  end if;

  for v_line in select * from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb))
  loop
    if coalesce(trim(v_line ->> 'description'), '') = '' then
      continue;
    end if;
    insert into public.invoice_lines (invoice_id, description, category, unit, quantity, unit_price, sort_order)
    values (
      v_id,
      trim(v_line ->> 'description'),
      coalesce(nullif(trim(v_line ->> 'category'), ''), 'general'),
      coalesce(nullif(trim(v_line ->> 'unit'), ''), 'hour')::public.line_unit,
      greatest(coalesce((v_line ->> 'quantity')::numeric, 1), 0.01),
      greatest(coalesce((v_line ->> 'unit_price')::numeric, 0), 0),
      v_index
    );
    v_index := v_index + 1;
  end loop;

  perform public.money_recalc_invoice(v_id);

  insert into public.audit_logs (actor_id, entity, entity_id, action, after_data)
  values ((select auth.uid()), 'invoice', v_id,
          case when p_id is null then 'invoice.created' else 'invoice.updated' end,
          jsonb_build_object('title', p_title, 'lines', v_index));

  return v_id;
end;
$$;

create or replace function public.money_send_invoice(p_invoice_id uuid, p_due_days integer default 14)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_status public.invoice_status;
  v_lines integer;
  v_total numeric(14,2);
begin
  if (select auth.uid()) is null or not (
    public.is_internal_user() and public.has_portal_permission('finance.invoices')
  ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  perform public.money_require_flag('money.send_invoices');

  select status, total into v_status, v_total from public.invoices where id = p_invoice_id for update;
  if not found then raise exception 'invoice_not_found' using errcode = 'P0002'; end if;
  if v_status <> 'draft' then raise exception 'invoice_not_draft' using errcode = '22023'; end if;

  select count(*) into v_lines from public.invoice_lines where invoice_id = p_invoice_id;
  if v_lines = 0 or v_total <= 0 then raise exception 'invoice_has_no_value' using errcode = '22023'; end if;

  update public.invoices set
    status = 'sent',
    issued_at = coalesce(issued_at, now()),
    due_at = coalesce(due_at, current_date + greatest(coalesce(p_due_days, 14), 0))
  where id = p_invoice_id;

  insert into public.audit_logs (actor_id, entity, entity_id, action, after_data)
  values ((select auth.uid()), 'invoice', p_invoice_id, 'invoice.issued',
          jsonb_build_object('due_days', p_due_days, 'total', v_total));

  return true;
end;
$$;

create or replace function public.money_void_invoice(p_invoice_id uuid, p_reason text default '')
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_status public.invoice_status;
  v_paid numeric(14,2);
begin
  if (select auth.uid()) is null or not (
    public.is_internal_user() and public.has_portal_permission('finance.invoices')
  ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select status, amount_paid into v_status, v_paid from public.invoices where id = p_invoice_id for update;
  if not found then raise exception 'invoice_not_found' using errcode = 'P0002'; end if;
  if v_status = 'void' then raise exception 'invoice_already_void' using errcode = '22023'; end if;
  if v_paid > 0 then raise exception 'invoice_has_payments' using errcode = '22023'; end if;

  update public.invoices set
    status = 'void',
    voided_at = now(),
    void_reason = nullif(trim(coalesce(p_reason, '')), '')
  where id = p_invoice_id;

  insert into public.audit_logs (actor_id, entity, entity_id, action, after_data)
  values ((select auth.uid()), 'invoice', p_invoice_id, 'invoice.voided',
          jsonb_build_object('reason', p_reason));

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- 11. Payments
-- ---------------------------------------------------------------------------
create or replace function public.money_record_payment(
  p_invoice_id uuid,
  p_amount numeric,
  p_method text default 'bank_transfer',
  p_reference text default '',
  p_received_at date default current_date,
  p_notes text default ''
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_invoice public.invoices%rowtype;
  v_payment_id uuid;
begin
  if (select auth.uid()) is null or not (
    public.is_internal_user() and public.has_portal_permission('finance.payments')
  ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  perform public.money_require_flag('money.record_payments');

  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid_payment_amount' using errcode = '22023';
  end if;

  select * into v_invoice from public.invoices where id = p_invoice_id for update;
  if not found then raise exception 'invoice_not_found' using errcode = 'P0002'; end if;
  if v_invoice.status = 'void' then raise exception 'invoice_is_void' using errcode = '22023'; end if;
  if v_invoice.status = 'draft' then raise exception 'invoice_not_issued' using errcode = '22023'; end if;
  if v_invoice.amount_paid + p_amount > v_invoice.total then
    raise exception 'payment_exceeds_balance' using errcode = '22023';
  end if;

  insert into public.payments (invoice_id, amount, currency, method, reference, received_at, notes, recorded_by)
  values (
    p_invoice_id, p_amount, v_invoice.currency,
    coalesce(nullif(trim(p_method), ''), 'bank_transfer')::public.payment_method,
    coalesce(p_reference, ''), coalesce(p_received_at, current_date), coalesce(p_notes, ''),
    (select auth.uid())
  ) returning id into v_payment_id;

  perform public.money_recalc_invoice(p_invoice_id);

  insert into public.audit_logs (actor_id, entity, entity_id, action, after_data)
  values ((select auth.uid()), 'payment', v_payment_id, 'payment.recorded',
          jsonb_build_object('invoice_id', p_invoice_id, 'amount', p_amount, 'method', p_method));

  return v_payment_id;
end;
$$;

create or replace function public.money_delete_payment(p_payment_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_invoice_id uuid;
  v_amount numeric(14,2);
begin
  if (select auth.uid()) is null or not (
    public.is_internal_user() and public.has_portal_permission('finance.payments')
  ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select invoice_id, amount into v_invoice_id, v_amount from public.payments where id = p_payment_id;
  if not found then raise exception 'payment_not_found' using errcode = 'P0002'; end if;

  delete from public.payments where id = p_payment_id;
  perform public.money_recalc_invoice(v_invoice_id);

  insert into public.audit_logs (actor_id, entity, entity_id, action, after_data)
  values ((select auth.uid()), 'payment', p_payment_id, 'payment.deleted',
          jsonb_build_object('invoice_id', v_invoice_id, 'amount', v_amount));

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- 12. Money metrics — pipeline and receivables
-- ---------------------------------------------------------------------------
create or replace function public.money_metrics()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_result jsonb;
begin
  if (select auth.uid()) is null or not public.is_internal_user() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if not public.has_portal_permission('finance.invoices') then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'generated_at', now(),
    'quotes', jsonb_build_object(
      'draft', (select count(*) from public.quotes where status = 'draft'),
      'sent', (select count(*) from public.quotes where status = 'sent'),
      'accepted', (select count(*) from public.quotes where status = 'accepted'),
      'declined', (select count(*) from public.quotes where status = 'declined'),
      'pipeline_value', (select coalesce(sum(total), 0) from public.quotes where status = 'sent'),
      'accepted_value', (select coalesce(sum(total), 0) from public.quotes where status = 'accepted'),
      'win_rate', (
        select case
          when count(*) filter (where status in ('accepted', 'converted', 'declined')) = 0 then 0
          else round(
            100.0 * count(*) filter (where status in ('accepted', 'converted'))
            / count(*) filter (where status in ('accepted', 'converted', 'declined')), 1)
        end
        from public.quotes
      )
    ),
    'invoices', jsonb_build_object(
      'draft', (select count(*) from public.invoices where status = 'draft'),
      'sent', (select count(*) from public.invoices where status = 'sent'),
      'part_paid', (select count(*) from public.invoices where status = 'part_paid'),
      'paid', (select count(*) from public.invoices where status = 'paid'),
      'overdue', (select count(*) from public.invoices where status = 'overdue'),
      'void', (select count(*) from public.invoices where status = 'void')
    ),
    'receivables', jsonb_build_object(
      'outstanding', (select coalesce(sum(greatest(total - amount_paid, 0)), 0)
                      from public.invoices where status in ('sent', 'part_paid', 'overdue')),
      'overdue', (select coalesce(sum(greatest(total - amount_paid, 0)), 0)
                  from public.invoices
                  where status in ('sent', 'part_paid', 'overdue')
                    and due_at is not null and due_at < current_date),
      'current', (select coalesce(sum(greatest(total - amount_paid, 0)), 0)
                  from public.invoices
                  where status in ('sent', 'part_paid', 'overdue')
                    and (due_at is null or due_at >= current_date)),
      'd1_30', (select coalesce(sum(greatest(total - amount_paid, 0)), 0)
                from public.invoices
                where status in ('sent', 'part_paid', 'overdue')
                  and due_at is not null and current_date - due_at between 1 and 30),
      'd31_60', (select coalesce(sum(greatest(total - amount_paid, 0)), 0)
                 from public.invoices
                 where status in ('sent', 'part_paid', 'overdue')
                   and due_at is not null and current_date - due_at between 31 and 60),
      'd61_90', (select coalesce(sum(greatest(total - amount_paid, 0)), 0)
                 from public.invoices
                 where status in ('sent', 'part_paid', 'overdue')
                   and due_at is not null and current_date - due_at between 61 and 90),
      'd90_plus', (select coalesce(sum(greatest(total - amount_paid, 0)), 0)
                   from public.invoices
                   where status in ('sent', 'part_paid', 'overdue')
                     and due_at is not null and current_date - due_at > 90)
    ),
    'revenue', jsonb_build_object(
      'invoiced_this_month', (select coalesce(sum(total), 0) from public.invoices
                              where issued_at >= date_trunc('month', now()) and status <> 'void'),
      'invoiced_this_year', (select coalesce(sum(total), 0) from public.invoices
                             where issued_at >= date_trunc('year', now()) and status <> 'void'),
      'collected_this_month', (select coalesce(sum(amount), 0) from public.payments
                               where received_at >= date_trunc('month', now())::date)
    ),
    'flags', (select coalesce(jsonb_object_agg(key, enabled), '{}'::jsonb) from public.feature_flags)
  ) into v_result;

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- 13. Demo money data (admin only, tagged, purgable)
-- ---------------------------------------------------------------------------
create or replace function public.money_seed_demo()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := (select auth.uid());
  v_org uuid;
  v_site uuid;
  v_card uuid;
  v_quote uuid;
  v_invoice uuid;
  v_total numeric(14,2);
begin
  if v_actor is null or public.current_app_role() <> 'admin' then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select id into v_org from public.organizations where is_demo = true limit 1;
  if v_org is null then
    insert into public.organizations (type, name, billing_email, vat_number, country_code, is_demo)
    values ('client', 'DEMO — Northwind Colocation', 'billing@northwind-demo.example', 'PT000000000', 'PT', true)
    returning id into v_org;
  end if;
  select id into v_site from public.sites where organization_id = v_org limit 1;

  select id into v_card from public.rate_cards where is_demo = true limit 1;
  if v_card is null then
    v_card := public.money_save_rate_card(
      p_id => null,
      p_organization_id => null,
      p_name => 'DEMO — Standard 2026',
      p_currency => 'EUR',
      p_country_code => 'PT',
      p_vat_rate => 23,
      p_is_default => false,
      p_notes => 'Demo card. Delete with Purge demo.',
      p_lines => '[
        {"category":"rack_and_stack","crew_role":"engineer","unit":"hour","unit_price":68,"engineer_cost":38,"min_units":2},
        {"category":"structured_cabling","crew_role":"engineer","unit":"hour","unit_price":72,"engineer_cost":40,"min_units":2},
        {"category":"remote_hands","crew_role":"remote","unit":"hour","unit_price":55,"engineer_cost":30,"min_units":1}
      ]'::jsonb
    );
    update public.rate_cards set is_demo = true where id = v_card;
  end if;

  select id into v_quote from public.quotes where is_demo = true limit 1;
  if v_quote is null then
    v_quote := public.money_save_quote(
      p_id => null,
      p_organization_id => v_org,
      p_site_id => v_site,
      p_title => 'DEMO — Rack and stack 10U with cabling',
      p_vat_rate => 23,
      p_discount_pct => 0,
      p_valid_until => (current_date + 21),
      p_notes => 'Demo quote. Accepted, so an invoice can be generated from it.',
      p_terms => '50% on order, 50% on completion. Validity 21 days.',
      p_lines => '[
        {"description":"Rack and stack 10U of equipment","category":"rack_and_stack","unit":"hour","quantity":8,"unit_price":68},
        {"description":"Structured cabling and labelling","category":"structured_cabling","unit":"hour","quantity":6,"unit_price":72},
        {"description":"Site survey and reporting","category":"survey","unit":"fixed","quantity":1,"unit_price":180}
      ]'::jsonb
    );
    update public.quotes set is_demo = true, status = 'accepted', sent_at = now() - interval '6 days',
      responded_at = now() - interval '4 days', accepted_by_name = 'DEMO — Ana Ferreira'
      where id = v_quote;
  end if;

  select id into v_invoice from public.invoices where is_demo = true limit 1;
  if v_invoice is null and v_quote is not null then
    v_invoice := public.money_quote_to_invoice(v_quote);
    update public.invoices set
      is_demo = true,
      status = 'sent',
      issued_at = now() - interval '3 days',
      due_at = current_date + 11
      where id = v_invoice;

    select total into v_total from public.invoices where id = v_invoice;
    insert into public.payments (invoice_id, amount, currency, method, reference, received_at, notes, is_demo, recorded_by)
    values (v_invoice, round(v_total * 0.4, 2), 'EUR', 'bank_transfer', 'DEMO-REF-0001',
            current_date - 1, 'Demo deposit of 40%.', true, v_actor);
    perform public.money_recalc_invoice(v_invoice);
  end if;

  insert into public.audit_logs (actor_id, entity, entity_id, action, after_data)
  values (v_actor, 'demo_dataset', v_org, 'demo.money_seeded',
          jsonb_build_object('quote', v_quote, 'invoice', v_invoice));

  return jsonb_build_object('client', v_org, 'quote', v_quote, 'invoice', v_invoice);
end;
$$;

-- Extend the existing purge so demo money rows never outlive the demo client.
create or replace function public.portal_purge_demo()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  removed integer := 0;
begin
  if (select auth.uid()) is null or public.current_app_role() <> 'admin' then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

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

-- ---------------------------------------------------------------------------
-- 14. Row-level security (reads only — writes go through the RPCs above)
-- ---------------------------------------------------------------------------
alter table public.feature_flags enable row level security;
alter table public.rate_cards enable row level security;
alter table public.rate_card_lines enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_lines enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_lines enable row level security;
alter table public.payments enable row level security;

drop policy if exists feature_flags_select on public.feature_flags;
create policy feature_flags_select on public.feature_flags
  for select to authenticated using (true);

drop policy if exists rate_cards_select on public.rate_cards;
create policy rate_cards_select on public.rate_cards
  for select to authenticated using (
    public.is_internal_user() and public.has_portal_permission('clients.contracts')
  );

drop policy if exists rate_card_lines_select on public.rate_card_lines;
create policy rate_card_lines_select on public.rate_card_lines
  for select to authenticated using (
    exists (select 1 from public.rate_cards rc where rc.id = rate_card_lines.rate_card_id)
  );

drop policy if exists quotes_select on public.quotes;
create policy quotes_select on public.quotes
  for select to authenticated using (public.money_can_view(organization_id));

drop policy if exists quote_lines_select on public.quote_lines;
create policy quote_lines_select on public.quote_lines
  for select to authenticated using (
    exists (select 1 from public.quotes q where q.id = quote_lines.quote_id)
  );

drop policy if exists invoices_select on public.invoices;
create policy invoices_select on public.invoices
  for select to authenticated using (public.money_can_view(organization_id));

drop policy if exists invoice_lines_select on public.invoice_lines;
create policy invoice_lines_select on public.invoice_lines
  for select to authenticated using (
    exists (select 1 from public.invoices i where i.id = invoice_lines.invoice_id)
  );

drop policy if exists payments_select on public.payments;
create policy payments_select on public.payments
  for select to authenticated using (
    exists (
      select 1 from public.invoices i
      where i.id = payments.invoice_id and public.money_can_view(i.organization_id)
    )
    and public.is_internal_user()
  );

-- ---------------------------------------------------------------------------
-- 15. Grants
-- ---------------------------------------------------------------------------
grant select on public.feature_flags to authenticated;
grant select on public.rate_cards to authenticated;
grant select on public.rate_card_lines to authenticated;
grant select on public.quotes to authenticated;
grant select on public.quote_lines to authenticated;
grant select on public.invoices to authenticated;
grant select on public.invoice_lines to authenticated;
grant select on public.payments to authenticated;
grant usage, select on sequence public.quote_number_seq to authenticated;
grant usage, select on sequence public.invoice_number_seq to authenticated;

do $$
declare fn record;
begin
  for fn in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in (
      'money_flags','money_set_flag','money_list_rate_cards','money_save_rate_card','money_delete_rate_card',
      'money_list_quotes','money_get_quote','money_save_quote','money_send_quote','money_respond_quote',
      'money_quote_to_invoice','money_list_invoices','money_get_invoice','money_save_invoice',
      'money_send_invoice','money_void_invoice','money_record_payment','money_delete_payment',
      'money_metrics','money_seed_demo'
    )
  loop
    execute format('revoke all on function %s from public', fn.sig);
    execute format('grant execute on function %s to authenticated', fn.sig);
  end loop;

  -- Internal helpers and scope predicates stay unreachable from the API.
  for fn in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in (
      'money_can_view','money_require_flag','money_recalc_quote','money_recalc_invoice'
    )
  loop
    execute format('revoke all on function %s from public', fn.sig);
  end loop;
end $$;
