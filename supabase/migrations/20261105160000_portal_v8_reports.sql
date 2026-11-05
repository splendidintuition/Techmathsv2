-- TechMaths Operations Portal — R8 "Reports and exports"
-- §7 and §10 of the Expanded Feature Plan: operations, SLA, client and finance reporting with a
-- CSV export of whatever is on screen. The permission keys already existed (`reports.operations`,
-- `reports.finance`, `reports.export`) but nothing read them.
--
-- Everything is computed in Postgres so a report cannot contradict the table it came from. The
-- browser only formats and, on request, turns the same numbers into CSV — no second source of truth.

-- ---------------------------------------------------------------------------
-- 1. Operations and SLA report
-- ---------------------------------------------------------------------------
create or replace function public.reports_ops(
  p_from date default null,
  p_to date default null
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_from date := coalesce(p_from, (current_date - 30));
  v_to date := coalesce(p_to, current_date);
  result jsonb;
begin
  if (select auth.uid()) is null or not (
    public.is_internal_user() and public.has_portal_permission('reports.operations')
  ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if v_to < v_from then
    raise exception 'invalid_date_range' using errcode = '22023';
  end if;

  select jsonb_build_object(
    'range', jsonb_build_object('from', v_from, 'to', v_to),
    'summary', jsonb_build_object(
      'created', (
        select count(*) from public.tickets t where t.created_at::date between v_from and v_to
      ),
      'closed', (
        select count(*) from public.tickets t where t.closed_at::date between v_from and v_to
      ),
      'open_now', (
        select count(*) from public.tickets t where t.status not in ('closed', 'cancelled', 'rejected')
      ),
      'unassigned_now', (
        select count(*) from public.tickets t
        where t.assigned_to is null and t.status not in ('closed', 'cancelled', 'rejected')
      ),
      'sla_tracked', (
        select count(*) from public.tickets t
        where t.created_at::date between v_from and v_to and t.sla_due_at is not null
      ),
      'sla_met', (
        select count(*) from (
          select t.id, t.sla_due_at, r.responded_at
          from public.tickets t
          left join lateral (
            select min(e.created_at) as responded_at from public.ticket_events e
            where e.ticket_id = t.id and e.event_type = 'ticket.status_changed'
              and e.payload ->> 'to' in ('assigned','en_route','on_site','in_progress','completed_pending_approval')
          ) r on true
          where t.created_at::date between v_from and v_to and t.sla_due_at is not null
        ) s
        where s.responded_at is not null and s.responded_at <= s.sla_due_at
      ),
      'sla_breached', (
        select count(*) from (
          select t.id, t.sla_due_at, r.responded_at
          from public.tickets t
          left join lateral (
            select min(e.created_at) as responded_at from public.ticket_events e
            where e.ticket_id = t.id and e.event_type = 'ticket.status_changed'
              and e.payload ->> 'to' in ('assigned','en_route','on_site','in_progress','completed_pending_approval')
          ) r on true
          where t.created_at::date between v_from and v_to and t.sla_due_at is not null
        ) s
        where (s.responded_at is not null and s.responded_at > s.sla_due_at)
           or (s.responded_at is null and s.sla_due_at < now())
      ),
      'sla_at_risk', (
        select count(*) from public.tickets t
        where t.sla_due_at is not null and t.sla_due_at >= now() and t.sla_due_at < now() + interval '4 hours'
          and t.status not in ('closed', 'cancelled', 'rejected')
      ),
      'avg_response_minutes', (
        select round(avg(extract(epoch from (s.responded_at - s.created_at)) / 60.0))
        from (
          select t.created_at, r.responded_at
          from public.tickets t
          left join lateral (
            select min(e.created_at) as responded_at from public.ticket_events e
            where e.ticket_id = t.id and e.event_type = 'ticket.status_changed'
              and e.payload ->> 'to' in ('assigned','en_route','on_site','in_progress','completed_pending_approval')
          ) r on true
          where t.created_at::date between v_from and v_to
        ) s
        where s.responded_at is not null
      ),
      'avg_close_hours', (
        select round(avg(extract(epoch from (t.closed_at - t.created_at)) / 3600.0), 1)
        from public.tickets t
        where t.closed_at is not null and t.closed_at::date between v_from and v_to
      ),
      'logged_hours', (
        select coalesce(round(sum(te.minutes) / 60.0, 2), 0)
        from public.time_entries te
        where te.started_at::date between v_from and v_to
      )
    ),
    'by_status', coalesce((
      select jsonb_agg(jsonb_build_object('key', s.status, 'count', s.n) order by s.n desc)
      from (
        select t.status::text as status, count(*) as n
        from public.tickets t
        where t.created_at::date between v_from and v_to
        group by t.status
      ) s
    ), '[]'::jsonb),
    'by_priority', coalesce((
      select jsonb_agg(jsonb_build_object('key', s.priority, 'count', s.n) order by s.n desc)
      from (
        select t.priority::text as priority, count(*) as n
        from public.tickets t
        where t.created_at::date between v_from and v_to
        group by t.priority
      ) s
    ), '[]'::jsonb),
    'by_category', coalesce((
      select jsonb_agg(jsonb_build_object('key', s.category, 'count', s.n) order by s.n desc)
      from (
        select t.category, count(*) as n
        from public.tickets t
        where t.created_at::date between v_from and v_to
        group by t.category
      ) s
    ), '[]'::jsonb),
    'by_country', coalesce((
      select jsonb_agg(jsonb_build_object('key', coalesce(s.country_code, '—'), 'count', s.n) order by s.n desc)
      from (
        select si.country_code, count(*) as n
        from public.tickets t
        join public.sites si on si.id = t.site_id
        where t.created_at::date between v_from and v_to
        group by si.country_code
      ) s
    ), '[]'::jsonb),
    'by_client', coalesce((
      select jsonb_agg(jsonb_build_object(
        'organization_id', s.organization_id,
        'name', s.name,
        'created', s.created,
        'closed', s.closed,
        'open_now', s.open_now,
        'sla_breached', s.sla_breached
      ) order by s.created desc)
      from (
        select o.id as organization_id, o.name,
          count(t.id) filter (where t.created_at::date between v_from and v_to) as created,
          count(t.id) filter (where t.closed_at::date between v_from and v_to) as closed,
          count(t.id) filter (where t.status not in ('closed','cancelled','rejected')) as open_now,
          count(t.id) filter (where t.sla_due_at is not null and t.sla_due_at < now()
                              and t.status not in ('closed','cancelled','rejected')) as sla_breached
        from public.organizations o
        left join public.tickets t on t.client_org_id = o.id
        where o.type = 'client'
        group by o.id, o.name
        having count(t.id) > 0
      ) s
    ), '[]'::jsonb),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object('day', d.day, 'created', d.created, 'closed', d.closed) order by d.day)
      from (
        select gs::date as day,
          (select count(*) from public.tickets t where t.created_at::date = gs::date) as created,
          (select count(*) from public.tickets t where t.closed_at::date = gs::date) as closed
        from generate_series(v_from, v_to, interval '1 day') gs
      ) d
    ), '[]'::jsonb),
    'engineers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'engineer_id', s.engineer_id,
        'name', s.name,
        'assigned', s.assigned,
        'closed', s.closed,
        'hours', s.hours,
        'rating', s.rating
      ) order by s.hours desc)
      from (
        select p.id as engineer_id, p.full_name as name,
          (select count(*) from public.tickets t where t.assigned_to = p.id
             and t.created_at::date between v_from and v_to) as assigned,
          (select count(*) from public.tickets t where t.assigned_to = p.id
             and t.closed_at::date between v_from and v_to) as closed,
          coalesce((select round(sum(te.minutes) / 60.0, 2) from public.time_entries te
                    where te.engineer_id = p.id and te.started_at::date between v_from and v_to), 0) as hours,
          ep.rating
        from public.profiles p
        left join public.engineer_profiles ep on ep.user_id = p.id
        where p.role = 'freelancer' and p.is_active
      ) s
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Finance report (revenue, cost, margin, aging)
-- ---------------------------------------------------------------------------
create or replace function public.reports_finance(
  p_from date default null,
  p_to date default null
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_from date := coalesce(p_from, (date_trunc('month', current_date) - interval '3 months')::date);
  v_to date := coalesce(p_to, current_date);
  v_revenue numeric(14,2);
  v_expenses numeric(14,2);
  v_labour numeric(14,2);
  result jsonb;
begin
  if (select auth.uid()) is null or not (
    public.is_internal_user() and public.has_portal_permission('reports.finance')
  ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if v_to < v_from then
    raise exception 'invalid_date_range' using errcode = '22023';
  end if;

  select coalesce(sum(il.line_total * (1 - i.discount_pct / 100.0)), 0) into v_revenue
  from public.invoice_lines il
  join public.invoices i on i.id = il.invoice_id
  where i.status in ('sent', 'part_paid', 'paid', 'overdue')
    and coalesce(i.issued_at, i.created_at)::date between v_from and v_to;

  select coalesce(sum(e.amount_net), 0) into v_expenses
  from public.expenses e
  where e.status = 'approved' and e.spent_on between v_from and v_to;

  select coalesce(sum(te.minutes / 60.0 * ep.hourly_rate), 0) into v_labour
  from public.time_entries te
  left join public.engineer_profiles ep on ep.user_id = te.engineer_id
  where te.started_at::date between v_from and v_to
    and te.approval_status = 'approved';

  select jsonb_build_object(
    'range', jsonb_build_object('from', v_from, 'to', v_to),
    'summary', jsonb_build_object(
      'invoiced_net', round(v_revenue, 2),
      'invoiced_gross', (
        select coalesce(round(sum(i.total), 2), 0) from public.invoices i
        where i.status in ('sent','part_paid','paid','overdue')
          and coalesce(i.issued_at, i.created_at)::date between v_from and v_to
      ),
      'vat_billed', (
        select coalesce(round(sum(i.vat_total), 2), 0) from public.invoices i
        where i.status in ('sent','part_paid','paid','overdue')
          and coalesce(i.issued_at, i.created_at)::date between v_from and v_to
      ),
      'collected', (
        select coalesce(round(sum(p.amount), 2), 0) from public.payments p
        where p.received_at between v_from and v_to
      ),
      'outstanding', (
        select coalesce(round(sum(i.total - i.amount_paid), 2), 0) from public.invoices i
        where i.status in ('sent','part_paid','overdue')
      ),
      'overdue', (
        select coalesce(round(sum(i.total - i.amount_paid), 2), 0) from public.invoices i
        where i.status in ('sent','part_paid','overdue')
          and i.due_at is not null and i.due_at < current_date
      ),
      'expenses_net', round(v_expenses, 2),
      'labour_cost', round(v_labour, 2),
      'margin', round(v_revenue - v_expenses - v_labour, 2),
      'margin_pct', case when v_revenue > 0 then round(100.0 * (v_revenue - v_expenses - v_labour) / v_revenue, 1) else null end
    ),
    'by_client', coalesce((
      select jsonb_agg(jsonb_build_object(
        'organization_id', s.organization_id,
        'name', s.name,
        'invoiced_net', s.invoiced_net,
        'expenses', s.expenses,
        'margin', s.margin,
        'margin_pct', case when s.invoiced_net > 0 then round(100.0 * s.margin / s.invoiced_net, 1) else null end
      ) order by s.invoiced_net desc)
      from (
        select o.id as organization_id, o.name,
          coalesce(rev.net, 0) as invoiced_net,
          coalesce(exp.net, 0) as expenses,
          coalesce(rev.net, 0) - coalesce(exp.net, 0) as margin
        from public.organizations o
        left join (
          select i.organization_id, sum(il.line_total * (1 - i.discount_pct / 100.0)) as net
          from public.invoice_lines il
          join public.invoices i on i.id = il.invoice_id
          where i.status in ('sent','part_paid','paid','overdue')
            and coalesce(i.issued_at, i.created_at)::date between v_from and v_to
          group by i.organization_id
        ) rev on rev.organization_id = o.id
        left join (
          select e.organization_id, sum(e.amount_net) as net
          from public.expenses e
          where e.status = 'approved' and e.spent_on between v_from and v_to
          group by e.organization_id
        ) exp on exp.organization_id = o.id
        where o.type = 'client' and (rev.net is not null or exp.net is not null)
      ) s
    ), '[]'::jsonb),
    'by_country', coalesce((
      select jsonb_agg(jsonb_build_object(
        'key', coalesce(s.country_code, '—'),
        'invoiced_gross', s.gross,
        'vat', s.vat
      ) order by s.gross desc)
      from (
        select coalesce(i.vat_country_code, o.country_code) as country_code,
               sum(i.total) as gross, sum(i.vat_total) as vat
        from public.invoices i
        join public.organizations o on o.id = i.organization_id
        where i.status in ('sent','part_paid','paid','overdue')
          and coalesce(i.issued_at, i.created_at)::date between v_from and v_to
        group by coalesce(i.vat_country_code, o.country_code)
      ) s
    ), '[]'::jsonb),
    'by_month', coalesce((
      select jsonb_agg(jsonb_build_object(
        'key', to_char(m.month, 'YYYY-MM'),
        'invoiced', m.invoiced,
        'collected', coalesce(pay.collected, 0)
      ) order by m.month)
      from (
        select date_trunc('month', coalesce(i.issued_at, i.created_at))::date as month,
               sum(i.total - i.vat_total) as invoiced
        from public.invoices i
        where i.status in ('sent','part_paid','paid','overdue')
          and coalesce(i.issued_at, i.created_at)::date between v_from and v_to
        group by 1
      ) m
      left join (
        select date_trunc('month', p.received_at)::date as month, sum(p.amount) as collected
        from public.payments p
        where p.received_at between v_from and v_to
        group by 1
      ) pay on pay.month = m.month
    ), '[]'::jsonb),
    'aging', coalesce((
      select jsonb_agg(jsonb_build_object('bucket', s.bucket, 'count', s.n, 'amount', s.amount) order by s.sort)
      from (
        select case
                 when i.due_at is null or i.due_at >= current_date then 'current'
                 when current_date - i.due_at <= 30 then '1-30'
                 when current_date - i.due_at <= 60 then '31-60'
                 else '60+'
               end as bucket,
               case
                 when i.due_at is null or i.due_at >= current_date then 0
                 when current_date - i.due_at <= 30 then 1
                 when current_date - i.due_at <= 60 then 2
                 else 3
               end as sort,
               count(*) as n,
               round(sum(i.total - i.amount_paid), 2) as amount
        from public.invoices i
        where i.status in ('sent','part_paid','overdue') and (i.total - i.amount_paid) > 0
        group by 1, 2
      ) s
    ), '[]'::jsonb),
    'debtors', coalesce((
      select jsonb_agg(jsonb_build_object('name', s.name, 'amount', s.amount, 'oldest_due', s.oldest_due) order by s.amount desc)
      from (
        select o.name, round(sum(i.total - i.amount_paid), 2) as amount, min(i.due_at) as oldest_due
        from public.invoices i
        join public.organizations o on o.id = i.organization_id
        where i.status in ('sent','part_paid','overdue') and (i.total - i.amount_paid) > 0
        group by o.name
        order by amount desc
        limit 5
      ) s
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. SLA report per client and tier
-- ---------------------------------------------------------------------------
create or replace function public.reports_sla(
  p_from date default null,
  p_to date default null
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_from date := coalesce(p_from, (current_date - 30));
  v_to date := coalesce(p_to, current_date);
  result jsonb;
begin
  if (select auth.uid()) is null or not (
    public.is_internal_user() and public.has_portal_permission('reports.operations')
  ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if v_to < v_from then
    raise exception 'invalid_date_range' using errcode = '22023';
  end if;

  select coalesce(jsonb_agg(row order by row ->> 'organization_name'), '[]'::jsonb) into result
  from (
    select jsonb_build_object(
      'organization_id', o.id,
      'organization_name', o.name,
      'contract_name', c.name,
      'kind', c.kind,
      'coverage', c.coverage,
      'response_minutes', c.response_minutes,
      'tickets', count(t.id),
      'met', count(t.id) filter (where r.responded_at is not null and t.sla_due_at is not null and r.responded_at <= t.sla_due_at),
      'breached', count(t.id) filter (where t.sla_due_at is not null and (
        (r.responded_at is not null and r.responded_at > t.sla_due_at)
        or (r.responded_at is null and t.sla_due_at < now())
      )),
      'at_risk', count(t.id) filter (where t.sla_due_at is not null and r.responded_at is null
                                     and t.sla_due_at >= now() and t.sla_due_at < now() + interval '4 hours'),
      'avg_response_minutes', round(avg(extract(epoch from (r.responded_at - t.created_at)) / 60.0)),
      'compliance_pct', case
        when count(t.id) filter (where r.responded_at is not null or t.sla_due_at < now()) = 0 then null
        else round(100.0 * count(t.id) filter (where r.responded_at is not null and r.responded_at <= t.sla_due_at)
             / nullif(count(t.id) filter (where r.responded_at is not null or t.sla_due_at < now()), 0), 1)
      end
    ) as row
    from public.organizations o
    -- One contract per client: the same precedence the ticket trigger uses.
    left join public.client_contracts c on c.id = public.contract_active_for(o.id)
    left join public.tickets t on t.client_org_id = o.id and t.created_at::date between v_from and v_to
    left join lateral (
      select min(e.created_at) as responded_at from public.ticket_events e
      where e.ticket_id = t.id and e.event_type = 'ticket.status_changed'
        and e.payload ->> 'to' in ('assigned','en_route','on_site','in_progress','completed_pending_approval')
    ) r on true
    where o.type = 'client'
    group by o.id, o.name, c.name, c.kind, c.coverage, c.response_minutes
    having count(t.id) > 0
  ) rows;

  return jsonb_build_object(
    'range', jsonb_build_object('from', v_from, 'to', v_to),
    'rows', result
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Grants
-- ---------------------------------------------------------------------------
do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('reports_ops', 'reports_finance', 'reports_sla')
  loop
    execute format('revoke all on function %s from public, anon', fn.sig);
    execute format('grant execute on function %s to authenticated', fn.sig);
  end loop;
end $$;
