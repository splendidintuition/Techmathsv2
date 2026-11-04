-- TechMaths Operations Portal — R3.2 "Job costing"
-- Attribute money to the job it belongs to, then show what each job earned.
--
-- Contract note: additive only. Two nullable columns, one replacement of
-- money_quote_to_invoice so attribution survives conversion, two new functions.
--
-- Cost comes from data already collected: approved expenses (R3.1) and logged
-- time_entries priced at engineer_profiles.hourly_rate. Revenue comes from
-- invoice lines explicitly attributed to a ticket, discounted per invoice so the
-- attributed money reconciles with the invoice total. Anything unattributed is
-- reported as unallocated rather than silently spread across jobs.
--
-- Payouts stay out of scope: this release measures margin, it does not pay anyone.

-- ---------------------------------------------------------------------------
-- 1. Attribution columns
-- ---------------------------------------------------------------------------
alter table public.quote_lines
  add column if not exists ticket_id uuid references public.tickets(id) on delete set null;

alter table public.invoice_lines
  add column if not exists ticket_id uuid references public.tickets(id) on delete set null;

create index if not exists quote_lines_ticket_idx on public.quote_lines (ticket_id);
create index if not exists invoice_lines_ticket_idx on public.invoice_lines (ticket_id);

-- ---------------------------------------------------------------------------
-- 2. Conversion keeps the attribution
-- ---------------------------------------------------------------------------
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

  insert into public.invoice_lines (invoice_id, description, category, unit, quantity, unit_price, sort_order, ticket_id)
  select v_invoice_id, l.description, l.category, l.unit, l.quantity, l.unit_price, l.sort_order, l.ticket_id
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
-- 2b. Document reads return the job on each line
-- ---------------------------------------------------------------------------
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
        'quantity', l.quantity, 'unit_price', l.unit_price, 'line_total', l.line_total,
        'ticket_id', l.ticket_id
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
        'quantity', l.quantity, 'unit_price', l.unit_price, 'line_total', l.line_total,
        'ticket_id', l.ticket_id
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

-- ---------------------------------------------------------------------------
-- 3. Attribute a single line to a job
-- ---------------------------------------------------------------------------
create or replace function public.money_set_line_job(p_kind text, p_line_id uuid, p_ticket_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := (select auth.uid());
  v_org uuid;
  v_status text;
  v_label text;
begin
  if v_actor is null or not (
    public.is_internal_user() and public.has_portal_permission('finance.invoices')
  ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if p_kind not in ('quote', 'invoice') then
    raise exception 'invalid_line_kind' using errcode = '22023';
  end if;

  if p_kind = 'quote' then
    select q.organization_id, q.status::text into v_org, v_status
    from public.quote_lines l join public.quotes q on q.id = l.quote_id
    where l.id = p_line_id;
    if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
    v_label := 'quote_line';
  else
    select i.organization_id, i.status::text into v_org, v_status
    from public.invoice_lines l join public.invoices i on i.id = l.invoice_id
    where l.id = p_line_id;
    if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
    if v_status = 'void' then
      raise exception 'invoice_is_void' using errcode = '22023';
    end if;
    v_label := 'invoice_line';
  end if;

  if p_ticket_id is not null then
    if not exists (
      select 1 from public.tickets t
      where t.id = p_ticket_id and t.client_org_id = v_org
    ) then
      raise exception 'job_ticket_mismatch' using errcode = '22023';
    end if;
  end if;

  if p_kind = 'quote' then
    update public.quote_lines set ticket_id = p_ticket_id where id = p_line_id;
  else
    update public.invoice_lines set ticket_id = p_ticket_id where id = p_line_id;
  end if;

  insert into public.audit_logs (actor_id, entity, entity_id, action, after_data)
  values (v_actor, v_label, p_line_id, 'line.job_set',
          jsonb_build_object('ticket_id', p_ticket_id, 'kind', p_kind));

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Job margins
-- ---------------------------------------------------------------------------
create or replace function public.money_job_margins(
  p_from date default null,
  p_to date default null,
  p_organization_id uuid default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_from date := coalesce(p_from, date_trunc('month', current_date)::date);
  v_to date := coalesce(p_to, current_date);
  v_result jsonb;
begin
  if (select auth.uid()) is null or not (
    public.is_internal_user() and public.has_portal_permission('finance.margins')
  ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if v_to < v_from then
    raise exception 'invalid_date_range' using errcode = '22023';
  end if;

  with revenue as (
    select il.ticket_id,
           sum(il.line_total * (1 - i.discount_pct / 100.0)) as net
    from public.invoice_lines il
    join public.invoices i on i.id = il.invoice_id
    where i.status in ('sent', 'part_paid', 'paid', 'overdue')
      and coalesce(i.issued_at, i.created_at)::date between v_from and v_to
      and (p_organization_id is null or i.organization_id = p_organization_id)
    group by il.ticket_id
  ),
  labour as (
    select te.ticket_id,
           sum(te.minutes) / 60.0 as hours,
           sum(te.minutes / 60.0 * ep.hourly_rate) as cost,
           sum(case when ep.hourly_rate is null then te.minutes else 0 end) / 60.0 as unpriced_hours
    from public.time_entries te
    left join public.engineer_profiles ep on ep.user_id = te.engineer_id
    where te.started_at::date between v_from and v_to
      and (p_organization_id is null or te.ticket_id in (
        select t.id from public.tickets t where t.client_org_id = p_organization_id
      ))
    group by te.ticket_id
  ),
  costs as (
    select e.ticket_id, sum(e.amount_net) as net
    from public.expenses e
    where e.status = 'approved'
      and e.spent_on between v_from and v_to
      and (p_organization_id is null or e.organization_id = p_organization_id)
    group by e.ticket_id
  ),
  job_ids as (
    select ticket_id from revenue where ticket_id is not null
    union
    select ticket_id from labour where ticket_id is not null
    union
    select ticket_id from costs where ticket_id is not null
  ),
  jobs as (
    select jsonb_build_object(
      'ticket_id', t.id,
      'ticket_number', t.ticket_number,
      'title', t.title,
      'status', t.status,
      'client_name', o.name,
      'site_name', s.name,
      'revenue_net', round(coalesce(r.net, 0), 2),
      'expenses_net', round(coalesce(c.net, 0), 2),
      'labour_hours', round(coalesce(l.hours, 0), 2),
      'labour_cost', round(coalesce(l.cost, 0), 2),
      'unpriced_hours', round(coalesce(l.unpriced_hours, 0), 2),
      'margin', round(coalesce(r.net, 0) - coalesce(c.net, 0) - coalesce(l.cost, 0), 2),
      'margin_pct', case
        when coalesce(r.net, 0) <= 0 then null
        else round(((coalesce(r.net, 0) - coalesce(c.net, 0) - coalesce(l.cost, 0)) / r.net) * 100, 1)
      end
    ) as row
    from job_ids j
    join public.tickets t on t.id = j.ticket_id
    left join public.organizations o on o.id = t.client_org_id
    left join public.sites s on s.id = t.site_id
    left join revenue r on r.ticket_id = t.id
    left join labour l on l.ticket_id = t.id
    left join costs c on c.ticket_id = t.id
  ),
  totals as (
    select
      coalesce((select sum(net) from revenue where ticket_id is not null), 0) as revenue_net,
      coalesce((select sum(cost) from labour where ticket_id is not null), 0) as labour_cost,
      coalesce((select sum(hours) from labour where ticket_id is not null), 0) as labour_hours,
      coalesce((select sum(net) from costs where ticket_id is not null), 0) as expenses_net,
      coalesce((select sum(net) from revenue where ticket_id is null), 0) as unallocated_revenue,
      coalesce((select sum(net) from costs where ticket_id is null), 0) as unallocated_expenses,
      coalesce((select sum(hours) from labour where ticket_id is null), 0) as unallocated_hours,
      coalesce((select sum(cost) from labour where ticket_id is null), 0) as unallocated_labour
  )
  select jsonb_build_object(
    'from', v_from,
    'to', v_to,
    'jobs', coalesce((select jsonb_agg(row order by (row ->> 'margin')::numeric desc) from jobs), '[]'::jsonb),
    'totals', jsonb_build_object(
      'revenue_net', round(t.revenue_net, 2),
      'expenses_net', round(t.expenses_net, 2),
      'labour_hours', round(t.labour_hours, 2),
      'labour_cost', round(t.labour_cost, 2),
      'margin', round(t.revenue_net - t.expenses_net - t.labour_cost, 2),
      'margin_pct', case
        when t.revenue_net <= 0 then null
        else round(((t.revenue_net - t.expenses_net - t.labour_cost) / t.revenue_net) * 100, 1)
      end
    ),
    'unallocated', jsonb_build_object(
      'revenue_net', round(t.unallocated_revenue, 2),
      'expenses_net', round(t.unallocated_expenses, 2),
      'labour_hours', round(t.unallocated_hours, 2),
      'labour_cost', round(t.unallocated_labour, 2)
    ),
    'generated_at', now()
  )
  into v_result
  from totals t;

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Grants
-- ---------------------------------------------------------------------------
do $$
declare fn record;
begin
  for fn in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in (
      'money_set_line_job','money_job_margins','money_quote_to_invoice',
      'money_get_quote','money_get_invoice'
    )
  loop
    execute format('revoke all on function %s from public', fn.sig);
    execute format('grant execute on function %s to authenticated', fn.sig);
  end loop;
end $$;

insert into supabase_migrations.schema_migrations (version, name, statements)
values ('20261104150000', 'portal_v3_job_costing', array[]::text[])
on conflict (version) do nothing;
