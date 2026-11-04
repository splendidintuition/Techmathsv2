-- TechMaths Operations Portal — R3.1 "Expenses"
-- Costs booked against a client, site or ticket, with a review step.
--
-- Contract note: additive only. Nothing existing is dropped or retyped.
-- Expenses are internal: no client ever sees them, and nothing here pays anybody.
-- Freelancer payouts stay off, as does any Stripe or card integration.
--
-- Every write goes through a SECURITY DEFINER function; the table is read-only to
-- the API. Submitting a claim and approving one are separate permissions so the
-- person who spent the money cannot quietly sign it off.

-- ---------------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.expense_status as enum ('draft', 'submitted', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.expense_category as enum (
    'travel', 'accommodation', 'parts', 'shipping', 'software', 'subcontract', 'training', 'other'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- 2. Table
-- ---------------------------------------------------------------------------
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  site_id uuid references public.sites(id) on delete set null,
  ticket_id uuid references public.tickets(id) on delete set null,
  spent_on date not null default current_date,
  category public.expense_category not null default 'other',
  vendor text not null default '',
  description text not null default '',
  currency text not null default 'EUR',
  amount_net numeric(12,2) not null default 0 check (amount_net >= 0),
  vat_rate numeric(5,2) not null default 0 check (vat_rate >= 0 and vat_rate <= 100),
  vat_amount numeric(12,2) generated always as (round(amount_net * vat_rate / 100, 2)) stored,
  amount_gross numeric(12,2) generated always as (amount_net + round(amount_net * vat_rate / 100, 2)) stored,
  reimbursable boolean not null default false,
  receipt_url text not null default '',
  notes text not null default '',
  status public.expense_status not null default 'draft',
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  review_note text not null default '',
  is_demo boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expenses_amount_chk check (amount_net > 0)
);

create index if not exists expenses_org_date_idx on public.expenses (organization_id, spent_on desc);
create index if not exists expenses_status_idx on public.expenses (status, spent_on desc);
create index if not exists expenses_ticket_idx on public.expenses (ticket_id);
create index if not exists expenses_demo_idx on public.expenses (is_demo) where is_demo = true;

-- ---------------------------------------------------------------------------
-- 3. Permissions
-- ---------------------------------------------------------------------------
insert into public.permission_registry (key, area, label, description, sensitive, default_roles, sort_order) values
  ('finance.expenses',         'Finance', 'Log expenses',    'Record travel, parts and subcontract costs against a client, site or ticket.', false, '{admin,staff}', 65),
  ('finance.expenses_approve', 'Finance', 'Approve expenses','Approve or reject submitted expense claims.',                                 true,  '{admin}',       66)
on conflict (key) do nothing;

create or replace function public.expense_can_view()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.is_internal_user() and public.has_portal_permission('finance.expenses'), false);
$$;

-- ---------------------------------------------------------------------------
-- 4. Read
-- ---------------------------------------------------------------------------
create or replace function public.money_list_expenses(
  p_status text default null,
  p_organization_id uuid default null,
  p_from date default null,
  p_to date default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_result jsonb;
begin
  if (select auth.uid()) is null or not public.expense_can_view() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(entry order by entry ->> 'spent_on' desc, entry ->> 'created_at' desc), '[]'::jsonb)
  into v_result
  from (
    select jsonb_build_object(
      'id', e.id,
      'spent_on', e.spent_on,
      'category', e.category,
      'vendor', e.vendor,
      'description', e.description,
      'currency', e.currency,
      'amount_net', e.amount_net,
      'vat_rate', e.vat_rate,
      'vat_amount', e.vat_amount,
      'amount_gross', e.amount_gross,
      'reimbursable', e.reimbursable,
      'receipt_url', e.receipt_url,
      'notes', e.notes,
      'status', e.status,
      'organization_id', e.organization_id,
      'client_name', o.name,
      'site_id', e.site_id,
      'site_name', s.name,
      'ticket_id', e.ticket_id,
      'ticket_number', t.ticket_number,
      'ticket_title', t.title,
      'submitted_at', e.submitted_at,
      'reviewed_at', e.reviewed_at,
      'reviewed_by_name', rp.full_name,
      'review_note', e.review_note,
      'created_by', e.created_by,
      'created_by_name', cp.full_name,
      'is_demo', e.is_demo,
      'created_at', e.created_at
    ) as entry
    from public.expenses e
    left join public.organizations o on o.id = e.organization_id
    left join public.sites s on s.id = e.site_id
    left join public.tickets t on t.id = e.ticket_id
    left join public.profiles rp on rp.id = e.reviewed_by
    left join public.profiles cp on cp.id = e.created_by
    where (p_status is null or p_status = '' or e.status::text = p_status)
      and (p_organization_id is null or e.organization_id = p_organization_id)
      and (p_from is null or e.spent_on >= p_from)
      and (p_to is null or e.spent_on <= p_to)
  ) rows;

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Write
-- ---------------------------------------------------------------------------
create or replace function public.money_save_expense(
  p_id uuid default null,
  p_organization_id uuid default null,
  p_site_id uuid default null,
  p_ticket_id uuid default null,
  p_spent_on date default current_date,
  p_category text default 'other',
  p_vendor text default '',
  p_description text default '',
  p_currency text default 'EUR',
  p_amount_net numeric default 0,
  p_vat_rate numeric default 0,
  p_reimbursable boolean default false,
  p_receipt_url text default '',
  p_notes text default ''
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := (select auth.uid());
  v_category public.expense_category;
  v_status public.expense_status;
  v_owner uuid;
  v_id uuid;
begin
  if v_actor is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if not public.has_portal_permission('finance.expenses') then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  begin
    v_category := coalesce(nullif(trim(p_category), ''), 'other')::public.expense_category;
  exception when others then
    raise exception 'invalid_expense_category' using errcode = '22023';
  end;

  if coalesce(p_amount_net, 0) <= 0 then
    raise exception 'expense_amount_required' using errcode = '22023';
  end if;
  if coalesce(p_vat_rate, 0) < 0 or coalesce(p_vat_rate, 0) > 100 then
    raise exception 'invalid_vat_rate' using errcode = '22023';
  end if;
  if coalesce(trim(p_description), '') = '' and coalesce(trim(p_vendor), '') = '' then
    raise exception 'expense_description_required' using errcode = '22023';
  end if;
  if coalesce(p_reimbursable, false) and coalesce(trim(p_receipt_url), '') = '' then
    raise exception 'expense_receipt_required' using errcode = '22023';
  end if;

  if p_site_id is not null and p_organization_id is not null then
    if not exists (
      select 1 from public.sites s
      where s.id = p_site_id and s.organization_id = p_organization_id
    ) then
      raise exception 'expense_site_mismatch' using errcode = '22023';
    end if;
  end if;

  if p_ticket_id is not null and p_organization_id is not null then
    if not exists (
      select 1 from public.tickets t
      where t.id = p_ticket_id and t.client_org_id = p_organization_id
    ) then
      raise exception 'expense_ticket_mismatch' using errcode = '22023';
    end if;
  end if;

  if p_id is null then
    insert into public.expenses (
      organization_id, site_id, ticket_id, spent_on, category, vendor, description,
      currency, amount_net, vat_rate, reimbursable, receipt_url, notes, created_by
    ) values (
      p_organization_id, p_site_id, p_ticket_id,
      coalesce(p_spent_on, current_date), v_category,
      coalesce(trim(p_vendor), ''), coalesce(trim(p_description), ''),
      upper(coalesce(nullif(trim(p_currency), ''), 'EUR')),
      round(p_amount_net, 2), round(coalesce(p_vat_rate, 0), 2),
      coalesce(p_reimbursable, false), coalesce(trim(p_receipt_url), ''),
      coalesce(trim(p_notes), ''), v_actor
    )
    returning id into v_id;

    insert into public.audit_logs (actor_id, entity, entity_id, action, after_data)
    values (v_actor, 'expense', v_id, 'expense.created',
            jsonb_build_object('net', p_amount_net, 'category', v_category, 'organization_id', p_organization_id));
    return v_id;
  end if;

  select status, created_by into v_status, v_owner
  from public.expenses where id = p_id for update;
  if not found then
    raise exception 'expense_not_found' using errcode = 'P0002';
  end if;
  if v_status not in ('draft', 'rejected') then
    raise exception 'expense_not_editable' using errcode = '22023';
  end if;
  if v_owner is distinct from v_actor and not public.has_portal_permission('finance.expenses_approve') then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  update public.expenses set
    organization_id = p_organization_id,
    site_id = p_site_id,
    ticket_id = p_ticket_id,
    spent_on = coalesce(p_spent_on, spent_on),
    category = v_category,
    vendor = coalesce(trim(p_vendor), ''),
    description = coalesce(trim(p_description), ''),
    currency = upper(coalesce(nullif(trim(p_currency), ''), 'EUR')),
    amount_net = round(p_amount_net, 2),
    vat_rate = round(coalesce(p_vat_rate, 0), 2),
    reimbursable = coalesce(p_reimbursable, false),
    receipt_url = coalesce(trim(p_receipt_url), ''),
    notes = coalesce(trim(p_notes), ''),
    status = 'draft',
    submitted_at = null,
    reviewed_at = null,
    reviewed_by = null,
    review_note = '',
    updated_at = now()
  where id = p_id;

  insert into public.audit_logs (actor_id, entity, entity_id, action, after_data)
  values (v_actor, 'expense', p_id, 'expense.updated',
          jsonb_build_object('net', p_amount_net, 'category', v_category));

  return p_id;
end;
$$;

create or replace function public.money_submit_expense(p_id uuid)
returns public.expense_status language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := (select auth.uid());
  v_status public.expense_status;
  v_owner uuid;
begin
  if v_actor is null or not public.has_portal_permission('finance.expenses') then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select status, created_by into v_status, v_owner
  from public.expenses where id = p_id for update;
  if not found then
    raise exception 'expense_not_found' using errcode = 'P0002';
  end if;
  if v_status <> 'draft' then
    raise exception 'expense_not_submittable' using errcode = '22023';
  end if;
  if v_owner is distinct from v_actor and not public.has_portal_permission('finance.expenses_approve') then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  update public.expenses set
    status = 'submitted',
    submitted_at = now(),
    updated_at = now()
  where id = p_id;

  insert into public.audit_logs (actor_id, entity, entity_id, action)
  values (v_actor, 'expense', p_id, 'expense.submitted');

  return 'submitted'::public.expense_status;
end;
$$;

create or replace function public.money_review_expense(p_id uuid, p_approve boolean, p_note text default '')
returns public.expense_status language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := (select auth.uid());
  v_status public.expense_status;
  v_owner uuid;
  v_next public.expense_status;
begin
  if v_actor is null or not public.has_portal_permission('finance.expenses_approve') then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select status, created_by into v_status, v_owner
  from public.expenses where id = p_id for update;
  if not found then
    raise exception 'expense_not_found' using errcode = 'P0002';
  end if;
  if v_status <> 'submitted' then
    raise exception 'expense_not_awaiting_review' using errcode = '22023';
  end if;
  -- Nobody but the admin (the single super user) may sign off their own spending.
  if v_owner = v_actor and public.current_app_role() <> 'admin' then
    raise exception 'expense_self_approval' using errcode = '42501';
  end if;

  v_next := case when coalesce(p_approve, false) then 'approved' else 'rejected' end::public.expense_status;

  update public.expenses set
    status = v_next,
    reviewed_at = now(),
    reviewed_by = v_actor,
    review_note = coalesce(trim(p_note), ''),
    updated_at = now()
  where id = p_id;

  insert into public.audit_logs (actor_id, entity, entity_id, action, after_data)
  values (v_actor, 'expense', p_id,
          case when coalesce(p_approve, false) then 'expense.approved' else 'expense.rejected' end,
          jsonb_build_object('note', p_note));

  return v_next;
end;
$$;

create or replace function public.money_delete_expense(p_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := (select auth.uid());
  v_status public.expense_status;
  v_owner uuid;
begin
  if v_actor is null or not public.has_portal_permission('finance.expenses') then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select status, created_by into v_status, v_owner
  from public.expenses where id = p_id for update;
  if not found then
    raise exception 'expense_not_found' using errcode = 'P0002';
  end if;
  if v_status <> 'draft' then
    raise exception 'expense_not_deletable' using errcode = '22023';
  end if;
  if v_owner is distinct from v_actor and not public.has_portal_permission('finance.expenses_approve') then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  delete from public.expenses where id = p_id;

  insert into public.audit_logs (actor_id, entity, entity_id, action)
  values (v_actor, 'expense', p_id, 'expense.deleted');

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Metrics
-- ---------------------------------------------------------------------------
create or replace function public.money_expense_metrics()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_result jsonb;
begin
  if (select auth.uid()) is null or not public.expense_can_view() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'counts', jsonb_build_object(
      'draft', (select count(*) from public.expenses where status = 'draft'),
      'submitted', (select count(*) from public.expenses where status = 'submitted'),
      'approved', (select count(*) from public.expenses where status = 'approved'),
      'rejected', (select count(*) from public.expenses where status = 'rejected')
    ),
    'awaiting_value', coalesce((select sum(amount_gross) from public.expenses where status = 'submitted'), 0),
    'approved_this_month', coalesce((
      select sum(amount_gross) from public.expenses
      where status = 'approved' and spent_on >= date_trunc('month', current_date)::date
    ), 0),
    'approved_ytd', coalesce((
      select sum(amount_gross) from public.expenses
      where status = 'approved' and spent_on >= date_trunc('year', current_date)::date
    ), 0),
    'reimbursable_value', coalesce((
      select sum(amount_gross) from public.expenses
      where status = 'approved' and reimbursable = true
    ), 0),
    'vat_reclaimable', coalesce((
      select sum(vat_amount) from public.expenses
      where status = 'approved' and spent_on >= date_trunc('year', current_date)::date
    ), 0),
    'by_category', coalesce((
      select jsonb_agg(row order by row ->> 'category')
      from (
        select jsonb_build_object(
          'category', category,
          'count', count(*),
          'gross', coalesce(sum(amount_gross), 0)
        ) as row
        from public.expenses
        where status in ('submitted', 'approved')
        group by category
      ) grouped
    ), '[]'::jsonb),
    'generated_at', now()
  ) into v_result;

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Demo data
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

  if not exists (select 1 from public.expenses where is_demo = true) then
    insert into public.expenses (
      organization_id, site_id, spent_on, category, vendor, description, currency,
      amount_net, vat_rate, reimbursable, receipt_url, notes, status,
      submitted_at, reviewed_at, reviewed_by, review_note, is_demo, created_by
    ) values (
      v_org, v_site, current_date - 9, 'travel', 'DEMO — TAP Air Portugal',
      'Lisbon to Porto site visit, return', 'EUR', 84.50, 6, true,
      'https://example.com/demo/receipt-0001.pdf', 'Paid personally by the engineer.',
      'approved', now() - interval '8 days', now() - interval '7 days', v_actor,
      'Receipt matches the trip.', true, v_actor
    ), (
      v_org, v_site, current_date - 2, 'parts', 'DEMO — Cablix',
      'Cat6A patch leads and labels for the rack build', 'EUR', 240.00, 23, false,
      '', 'Charged through to the client invoice.', 'submitted',
      now() - interval '1 day', null, null, '', true, v_actor
    );
  end if;

  insert into public.audit_logs (actor_id, entity, entity_id, action, after_data)
  values (v_actor, 'demo_dataset', v_org, 'demo.money_seeded',
          jsonb_build_object('quote', v_quote, 'invoice', v_invoice));

  return jsonb_build_object('client', v_org, 'quote', v_quote, 'invoice', v_invoice);
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

  delete from public.expenses where is_demo = true;
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
-- 8. RLS
-- ---------------------------------------------------------------------------
alter table public.expenses enable row level security;

drop policy if exists expenses_select on public.expenses;
create policy expenses_select on public.expenses
  for select to authenticated using (public.expense_can_view());

-- ---------------------------------------------------------------------------
-- 9. Grants
-- ---------------------------------------------------------------------------
grant select on public.expenses to authenticated;

do $$
declare fn record;
begin
  for fn in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in (
      'money_list_expenses','money_save_expense','money_submit_expense',
      'money_review_expense','money_delete_expense','money_expense_metrics',
      'money_seed_demo'
    )
  loop
    execute format('revoke all on function %s from public', fn.sig);
    execute format('grant execute on function %s to authenticated', fn.sig);
  end loop;

  for fn in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('expense_can_view')
  loop
    execute format('revoke all on function %s from public', fn.sig);
  end loop;
end $$;

insert into supabase_migrations.schema_migrations (version, name, statements)
values ('20261104140000', 'portal_v3_expenses', array[]::text[])
on conflict (version) do nothing;
