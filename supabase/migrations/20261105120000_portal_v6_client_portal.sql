-- TechMaths Operations Portal — R6 "Client-facing portal"
-- Closes the largest product gap in the Expanded Feature Plan: everything the operation does was
-- visible only to internal staff. Clients could raise a ticket and nothing else. This release
-- gives an organisation's own people a read-and-decide surface:
--
--   §3.1  client home with what needs their attention
--   §3.3  client visit booking (creates a real ticket that an admin confirms by scheduling it)
--   §3.4  quotes accepted online, invoices and balances, contracts/SLA card, site list
--   §8    client actions notify the internal team through the R5 notification outbox
--
-- Security model: every entry point below is a security-definer RPC that first resolves the
-- caller's client organisation. No table is writable from the API; the read RPCs only ever expose
-- the caller's own organisation, and drafts are never exposed. `money_respond_quote` is reused for
-- the decision itself so the acceptance rules (status must be `sent`, org membership) stay in one
-- place, and the `money.send_quotes` flag still gates whether a quote can be answered at all.
--
-- Contract note: additive only. No existing RPC changes signature.

-- ---------------------------------------------------------------------------
-- 1. Who is the caller, as a client?
-- ---------------------------------------------------------------------------
create or replace function public.portal_client_org()
returns uuid language sql stable security definer set search_path = '' as $$
  select m.organization_id
  from public.organization_memberships m
  join public.profiles p on p.id = m.user_id
  where m.user_id = (select auth.uid())
    and p.is_active
    and p.role = 'client'
  order by m.created_at
  limit 1
$$;

revoke all on function public.portal_client_org() from public;

-- Internal guard: raises instead of returning null so no RPC can run "org-less".
create or replace function public.portal_client_require_org()
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare
  v_org uuid;
begin
  v_org := public.portal_client_org();
  if v_org is null then
    raise exception 'not_a_client_account' using errcode = '42501';
  end if;
  return v_org;
end;
$$;

revoke all on function public.portal_client_require_org() from public;

-- The client's currency is whatever their documents are in; EUR until the first document exists.
create or replace function public.portal_client_currency(p_org uuid)
returns text language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select i.currency from public.invoices i
      where i.organization_id = p_org order by i.created_at desc limit 1),
    (select q.currency from public.quotes q
      where q.organization_id = p_org order by q.created_at desc limit 1),
    'EUR'
  )
$$;

revoke all on function public.portal_client_currency(uuid) from public;

-- ---------------------------------------------------------------------------
-- 2. Shared read shapes
-- ---------------------------------------------------------------------------
-- Quotes a client is allowed to see: anything that has left draft. Never `cancelled` internals.
create or replace function public.portal_client_quote_list(p_org uuid, p_limit integer)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(entry order by created_at desc), '[]'::jsonb)
  from (
    select
      q.created_at,
      jsonb_build_object(
        'id', q.id,
        'number', format('Q-%s-%s', q.quote_year, lpad(q.quote_seq::text, 4, '0')),
        'title', q.title,
        'status', q.status,
        'currency', q.currency,
        'subtotal', q.subtotal,
        'vat_rate', q.vat_rate,
        'vat_total', q.vat_total,
        'total', q.total,
        'valid_until', q.valid_until,
        'sent_at', q.sent_at,
        'responded_at', q.responded_at,
        'accepted_by_name', q.accepted_by_name,
        'declined_reason', q.declined_reason,
        'site_name', s.name,
        'line_count', (select count(*) from public.quote_lines l where l.quote_id = q.id),
        'can_respond', q.status = 'sent'
      ) as entry
    from public.quotes q
    left join public.sites s on s.id = q.site_id
    where q.organization_id = p_org
      and q.status in ('sent', 'accepted', 'declined', 'expired', 'converted')
    order by q.created_at desc
    limit least(greatest(coalesce(p_limit, 50), 1), 200)
  ) rows;
$$;

create or replace function public.portal_client_invoice_list(p_org uuid, p_limit integer)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(entry order by created_at desc), '[]'::jsonb)
  from (
    select
      i.created_at,
      jsonb_build_object(
        'id', i.id,
        'number', format('INV-%s-%s', i.invoice_year, lpad(i.invoice_seq::text, 4, '0')),
        'title', i.title,
        'status', i.status,
        'currency', i.currency,
        'subtotal', i.subtotal,
        'vat_rate', i.vat_rate,
        'vat_total', i.vat_total,
        'total', i.total,
        'amount_paid', i.amount_paid,
        'balance', round(i.total - i.amount_paid, 2),
        'reference', i.reference,
        'issued_at', i.issued_at,
        'due_at', i.due_at,
        'paid_at', i.paid_at,
        'site_name', s.name,
        'is_overdue', (
          i.due_at is not null
          and (i.total - i.amount_paid) > 0
          and i.due_at < current_date
        )
      ) as entry
    from public.invoices i
    left join public.sites s on s.id = i.site_id
    where i.organization_id = p_org
      and i.status in ('sent', 'part_paid', 'paid', 'overdue')
    order by coalesce(i.issued_at, i.created_at) desc
    limit least(greatest(coalesce(p_limit, 50), 1), 200)
  ) rows;
$$;

create or replace function public.portal_client_ticket_list(p_org uuid, p_limit integer)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(entry order by created_at desc), '[]'::jsonb)
  from (
    select
      t.created_at,
      jsonb_build_object(
        'id', t.id,
        'ticket_number', t.ticket_number,
        'title', t.title,
        'status', t.status,
        'priority', t.priority,
        'category', t.category,
        'site_id', t.site_id,
        'site_name', s.name,
        'engineer_name', eng.full_name,
        'scheduled_for', t.scheduled_for,
        'sla_due_at', t.sla_due_at,
        'closed_at', t.closed_at,
        'created_at', t.created_at,
        'awaiting_client', t.status = 'completed_pending_approval'
      ) as entry
    from public.tickets t
    left join public.sites s on s.id = t.site_id
    left join public.profiles eng on eng.id = t.assigned_to
    where t.client_org_id = p_org
    order by t.created_at desc
    limit least(greatest(coalesce(p_limit, 60), 1), 300)
  ) rows;
$$;

-- ---------------------------------------------------------------------------
-- 3. Client home (§3.1)
-- ---------------------------------------------------------------------------
create or replace function public.portal_client_home()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_org uuid := public.portal_client_require_org();
  v_currency text;
  v_org_row public.organizations%rowtype;
  v_stats jsonb;
begin
  select * into v_org_row from public.organizations where id = v_org;
  v_currency := public.portal_client_currency(v_org);

  select jsonb_build_object(
    'open_tickets', (
      select count(*) from public.tickets t
      where t.client_org_id = v_org
        and t.status not in ('closed', 'cancelled', 'rejected')
    ),
    'awaiting_approval', (
      select count(*) from public.tickets t
      where t.client_org_id = v_org and t.status = 'completed_pending_approval'
    ),
    'quotes_awaiting', (
      select count(*) from public.quotes q
      where q.organization_id = v_org and q.status = 'sent'
    ),
    'invoices_open', (
      select count(*) from public.invoices i
      where i.organization_id = v_org
        and i.status in ('sent', 'part_paid', 'overdue')
        and round(i.total - i.amount_paid, 2) > 0
    ),
    'outstanding', (
      select coalesce(sum(round(i.total - i.amount_paid, 2)), 0)
      from public.invoices i
      where i.organization_id = v_org
        and i.status in ('sent', 'part_paid', 'overdue')
    ),
    'overdue', (
      select coalesce(sum(round(i.total - i.amount_paid, 2)), 0)
      from public.invoices i
      where i.organization_id = v_org
        and i.status in ('sent', 'part_paid', 'overdue')
        and i.due_at is not null and i.due_at < current_date
    ),
    'paid_this_year', (
      select coalesce(sum(p.amount), 0) from public.payments p
      join public.invoices i on i.id = p.invoice_id
      where i.organization_id = v_org
        and p.received_at >= date_trunc('year', current_date)
    ),
    'next_visit_at', (
      select min(t.scheduled_for) from public.tickets t
      where t.client_org_id = v_org
        and t.scheduled_for is not null
        and t.scheduled_for >= now()
        and t.status not in ('closed', 'cancelled', 'rejected')
    )
  ) into v_stats;

  return jsonb_build_object(
    'organization', jsonb_build_object(
      'id', v_org_row.id,
      'name', v_org_row.name,
      'billing_email', v_org_row.billing_email,
      'vat_number', v_org_row.vat_number,
      'country_code', v_org_row.country_code,
      'vat_rate', v_org_row.vat_rate,
      'currency', v_currency
    ),
    'stats', v_stats,
    'quotes', public.portal_client_quote_list(v_org, 3),
    'invoices', public.portal_client_invoice_list(v_org, 3),
    'tickets', public.portal_client_ticket_list(v_org, 5)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Quotes (§3.4 — client accepts online)
-- ---------------------------------------------------------------------------
create or replace function public.portal_client_quotes(p_limit integer default 50)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  return public.portal_client_quote_list(public.portal_client_require_org(), p_limit);
end;
$$;

create or replace function public.portal_client_quote(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_org uuid := public.portal_client_require_org();
  v_quote public.quotes%rowtype;
  v_lines jsonb;
begin
  select * into v_quote from public.quotes
  where id = p_id
    and organization_id = v_org
    and status in ('sent', 'accepted', 'declined', 'expired', 'converted');
  if not found then
    raise exception 'quote_not_found' using errcode = 'P0002';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', l.id,
    'description', l.description,
    'category', l.category,
    'unit', l.unit,
    'quantity', l.quantity,
    'unit_price', l.unit_price,
    'line_total', l.line_total
  ) order by l.sort_order, l.id), '[]'::jsonb) into v_lines
  from public.quote_lines l
  where l.quote_id = v_quote.id;

  return jsonb_build_object(
    'id', v_quote.id,
    'number', format('Q-%s-%s', v_quote.quote_year, lpad(v_quote.quote_seq::text, 4, '0')),
    'title', v_quote.title,
    'status', v_quote.status,
    'currency', v_quote.currency,
    'subtotal', v_quote.subtotal,
    'discount_pct', v_quote.discount_pct,
    'vat_rate', v_quote.vat_rate,
    'vat_total', v_quote.vat_total,
    'total', v_quote.total,
    'valid_until', v_quote.valid_until,
    'notes', v_quote.notes,
    'terms', v_quote.terms,
    'sent_at', v_quote.sent_at,
    'responded_at', v_quote.responded_at,
    'accepted_by_name', v_quote.accepted_by_name,
    'declined_reason', v_quote.declined_reason,
    'site_name', (select s.name from public.sites s where s.id = v_quote.site_id),
    'organization_name', (select o.name from public.organizations o where o.id = v_quote.organization_id),
    'lines', v_lines,
    'can_respond', v_quote.status = 'sent'
  );
end;
$$;

-- The decision itself. Membership + "only a sent quote can be answered" live in
-- `money_respond_quote`; this wrapper adds the client-role guard and keeps the
-- `money.send_quotes` flag meaningful (a client cannot answer what was never sent).
create or replace function public.portal_client_respond_quote(
  p_quote_id uuid,
  p_accept boolean,
  p_reason text default null
) returns public.quote_status language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid := public.portal_client_require_org();
  v_status public.quote_status;
begin
  perform public.money_require_flag('money.send_quotes');

  select status into v_status from public.quotes
  where id = p_quote_id and organization_id = v_org;
  if not found then
    raise exception 'quote_not_found' using errcode = 'P0002';
  end if;

  return public.money_respond_quote(p_quote_id, p_accept, null, p_reason);
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Invoices and balances (§3.4, §6)
-- ---------------------------------------------------------------------------
create or replace function public.portal_client_invoices(p_limit integer default 50)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  return public.portal_client_invoice_list(public.portal_client_require_org(), p_limit);
end;
$$;

create or replace function public.portal_client_invoice(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_org uuid := public.portal_client_require_org();
  v_invoice public.invoices%rowtype;
  v_lines jsonb;
  v_payments jsonb;
begin
  select * into v_invoice from public.invoices
  where id = p_id
    and organization_id = v_org
    and status in ('sent', 'part_paid', 'paid', 'overdue');
  if not found then
    raise exception 'invoice_not_found' using errcode = 'P0002';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', l.id,
    'description', l.description,
    'category', l.category,
    'unit', l.unit,
    'quantity', l.quantity,
    'unit_price', l.unit_price,
    'line_total', l.line_total
  ) order by l.sort_order, l.id), '[]'::jsonb) into v_lines
  from public.invoice_lines l
  where l.invoice_id = v_invoice.id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id,
    'amount', p.amount,
    'method', p.method,
    'reference', p.reference,
    'received_at', p.received_at
  ) order by p.received_at desc), '[]'::jsonb) into v_payments
  from public.payments p
  where p.invoice_id = v_invoice.id;

  return jsonb_build_object(
    'id', v_invoice.id,
    'number', format('INV-%s-%s', v_invoice.invoice_year, lpad(v_invoice.invoice_seq::text, 4, '0')),
    'title', v_invoice.title,
    'status', v_invoice.status,
    'currency', v_invoice.currency,
    'subtotal', v_invoice.subtotal,
    'discount_pct', v_invoice.discount_pct,
    'vat_rate', v_invoice.vat_rate,
    'vat_total', v_invoice.vat_total,
    'total', v_invoice.total,
    'amount_paid', v_invoice.amount_paid,
    'balance', round(v_invoice.total - v_invoice.amount_paid, 2),
    'reference', v_invoice.reference,
    'notes', v_invoice.notes,
    'issued_at', v_invoice.issued_at,
    'due_at', v_invoice.due_at,
    'paid_at', v_invoice.paid_at,
    'site_name', (select s.name from public.sites s where s.id = v_invoice.site_id),
    'organization_name', (select o.name from public.organizations o where o.id = v_invoice.organization_id),
    'lines', v_lines,
    'payments', v_payments
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Tickets and tracking (§3.2 for the client side)
-- ---------------------------------------------------------------------------
create or replace function public.portal_client_tickets(p_limit integer default 60)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  return public.portal_client_ticket_list(public.portal_client_require_org(), p_limit);
end;
$$;

create or replace function public.portal_client_ticket(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_org uuid := public.portal_client_require_org();
  v_ticket public.tickets%rowtype;
  v_timeline jsonb;
begin
  select * into v_ticket from public.tickets
  where id = p_id and client_org_id = v_org;
  if not found then
    raise exception 'ticket_not_found' using errcode = 'P0002';
  end if;

  -- Only what the client is entitled to see: when it was raised, status transitions and
  -- updates explicitly marked client-visible. Internal notes, offers and crew stay internal.
  select coalesce(jsonb_agg(jsonb_build_object(
    'at', e.at,
    'kind', e.kind,
    'label', e.label,
    'note', e.note
  ) order by e.at desc), '[]'::jsonb) into v_timeline
  from (
    select v_ticket.created_at as at, 'created'::text as kind, 'Ticket raised'::text as label, null::text as note
    union all
    select ev.created_at, 'status', coalesce(ev.payload ->> 'to', 'Status changed'), null
    from public.ticket_events ev
    where ev.ticket_id = v_ticket.id and ev.event_type = 'ticket.status_changed'
    union all
    select u.created_at, 'update', 'Update from the team', u.body
    from public.ticket_updates u
    where u.ticket_id = v_ticket.id and u.visibility = 'client'
  ) e;

  return jsonb_build_object(
    'id', v_ticket.id,
    'ticket_number', v_ticket.ticket_number,
    'title', v_ticket.title,
    'description', v_ticket.description,
    'status', v_ticket.status,
    'priority', v_ticket.priority,
    'category', v_ticket.category,
    'site_name', (select s.name from public.sites s where s.id = v_ticket.site_id),
    'site_address', (select s.address from public.sites s where s.id = v_ticket.site_id),
    'engineer_name', (select p.full_name from public.profiles p where p.id = v_ticket.assigned_to),
    'scheduled_for', v_ticket.scheduled_for,
    'sla_due_at', v_ticket.sla_due_at,
    'created_at', v_ticket.created_at,
    'closed_at', v_ticket.closed_at,
    'timeline', v_timeline
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Sites (§3.4, without the sensitive access instructions)
-- ---------------------------------------------------------------------------
create or replace function public.portal_client_sites()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_org uuid := public.portal_client_require_org();
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', s.id,
      'name', s.name,
      'address', s.address,
      'country_code', s.country_code,
      'latitude', s.latitude,
      'longitude', s.longitude,
      'open_tickets', (
        select count(*) from public.tickets t
        where t.site_id = s.id and t.status not in ('closed', 'cancelled', 'rejected')
      ),
      'next_visit_at', (
        select min(t.scheduled_for) from public.tickets t
        where t.site_id = s.id and t.scheduled_for >= now()
          and t.status not in ('closed', 'cancelled', 'rejected')
      )
    ) order by s.name)
    from public.sites s
    where s.organization_id = v_org
  ), '[]'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Visit booking (§3.3 — "client visit booking with admin confirmation")
-- ---------------------------------------------------------------------------
-- A client never books an engineer directly: the request becomes a real `new` ticket, which an
-- admin confirms by scheduling or assigning it. The internal team is notified immediately.
create or replace function public.portal_client_request_visit(
  p_site_id uuid,
  p_title text,
  p_description text default '',
  p_preferred_date date default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid := public.portal_client_require_org();
  v_site public.sites%rowtype;
  v_ticket uuid;
  v_when timestamptz;
  v_requester text;
  v_recipient record;
begin
  select * into v_site from public.sites where id = p_site_id and organization_id = v_org;
  if not found then
    raise exception 'site_not_in_client_organization' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_title, ''))) < 3 or length(trim(coalesce(p_title, ''))) > 240 then
    raise exception 'invalid_ticket_fields' using errcode = '22023';
  end if;

  v_when := case when p_preferred_date is null then null
                 else (p_preferred_date + time '09:00') at time zone 'UTC' end;

  insert into public.tickets (client_org_id, site_id, created_by, category, priority, title, description, sla_due_at)
  values (v_org, p_site_id, (select auth.uid()), 'visit_request', 'normal',
          trim(p_title), coalesce(p_description, ''), v_when)
  returning id into v_ticket;

  insert into public.ticket_events (ticket_id, actor_id, event_type, payload)
  values (v_ticket, (select auth.uid()), 'ticket.created',
          jsonb_build_object('status', 'new', 'source', 'client_portal', 'preferred_date', p_preferred_date));

  select full_name into v_requester from public.profiles where id = (select auth.uid());

  for v_recipient in
    select p.id from public.profiles p
    where p.is_active and p.role in ('admin', 'staff')
  loop
    perform public.portal_notify(
      v_recipient.id,
      'request',
      format('Visit request · %s', v_site.name),
      format('%s asked for a visit: %s', coalesce(nullif(v_requester, ''), 'A client'), trim(p_title)),
      'ticket',
      v_ticket
    );
  end loop;

  return v_ticket;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8b. Sign-off on completed work (§3.2 "pending approval", §3.4 client rules)
-- ---------------------------------------------------------------------------
-- The engineer finishes, the ticket waits in `completed_pending_approval`, and the client — not the
-- coordinator — decides whether the job is done. Approving moves it to `approved` (an admin closes
-- it), rejecting pushes it back to `in_progress` and records the client's reason as a visible update.
create or replace function public.portal_client_sign_off(
  p_ticket_id uuid,
  p_approve boolean,
  p_note text default null
) returns public.ticket_status language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid := public.portal_client_require_org();
  v_ticket public.tickets%rowtype;
  v_next public.ticket_status;
  v_note text := nullif(trim(coalesce(p_note, '')), '');
  v_recipient record;
  v_name text;
begin
  select * into v_ticket from public.tickets
  where id = p_ticket_id and client_org_id = v_org
  for update;
  if not found then
    raise exception 'ticket_not_found' using errcode = 'P0002';
  end if;
  if v_ticket.status <> 'completed_pending_approval' then
    raise exception 'ticket_not_awaiting_approval' using errcode = '22023';
  end if;

  v_next := case when p_approve then 'approved'::public.ticket_status else 'in_progress'::public.ticket_status end;

  update public.tickets
    set status = v_next,
        closed_at = case when p_approve then closed_at else null end,
        updated_at = now()
    where id = v_ticket.id;

  insert into public.ticket_events (ticket_id, actor_id, event_type, payload)
  values (v_ticket.id, (select auth.uid()), 'ticket.status_changed',
          jsonb_build_object('from', 'completed_pending_approval', 'to', v_next, 'by', 'client'));

  if v_note is not null then
    insert into public.ticket_updates (ticket_id, author_id, body, visibility)
    values (v_ticket.id, (select auth.uid()), v_note, 'client');
  end if;

  select full_name into v_name from public.profiles where id = (select auth.uid());

  for v_recipient in
    select p.id from public.profiles p where p.is_active and p.role in ('admin', 'staff')
  loop
    perform public.portal_notify(
      v_recipient.id,
      case when p_approve then 'success' else 'warning' end,
      format('%s · ticket #%s', case when p_approve then 'Client approved' else 'Client sent back' end, v_ticket.ticket_number),
      format('%s %s the work on “%s”.', coalesce(nullif(v_name, ''), 'The client'),
             case when p_approve then 'approved' else 'rejected' end, v_ticket.title),
      'ticket',
      v_ticket.id
    );
  end loop;

  return v_next;
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. Demo data (admin only, removable with portal_purge_demo)
-- ---------------------------------------------------------------------------
-- Gives the demo client account something to look at: a membership in the demo organisation,
-- a site, one quote waiting for a decision, one issued invoice and two live tickets.
create or replace function public.portal_client_seed_demo()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := (select auth.uid());
  v_org uuid;
  v_site uuid;
  v_client uuid;
  v_quote uuid;
  v_ticket uuid;
  v_admin uuid;
begin
  if v_actor is null or public.current_app_role() <> 'admin' then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select id into v_org from public.organizations where is_demo = true order by created_at limit 1;
  if v_org is null then
    perform public.money_seed_demo();
    select id into v_org from public.organizations where is_demo = true order by created_at limit 1;
  end if;

  select id into v_site from public.sites where organization_id = v_org order by created_at limit 1;
  if v_site is null then
    insert into public.sites (organization_id, name, address, country_code, latitude, longitude, is_demo)
    values (v_org, 'DEMO — Lisbon DC1', 'Rua da Alfândega 12, 1100-585 Lisboa', 'PT', 38.7089, -9.1365, true)
    returning id into v_site;
  end if;

  -- The client login gets a seat in the demo organisation so the client portal is reachable.
  select p.id into v_client
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.role = 'client' and p.is_active
  order by (u.email = 'client@techmaths-dc.com') desc, p.created_at
  limit 1;

  if v_client is not null then
    insert into public.organization_memberships (organization_id, user_id, permission)
    values (v_org, v_client, 'manager')
    on conflict (organization_id, user_id) do nothing;
  end if;

  -- A quote that is still waiting, so the client has a real decision to take.
  if not exists (
    select 1 from public.quotes q
    where q.organization_id = v_org and q.status = 'sent' and q.is_demo = true
  ) then
    v_quote := public.money_save_quote(
      p_id => null,
      p_organization_id => v_org,
      p_site_id => v_site,
      p_title => 'DEMO — Quarterly smart-hands retainer top-up',
      p_vat_rate => 23,
      p_discount_pct => 0,
      p_valid_until => (current_date + 14),
      p_notes => 'Awaiting your approval. Accept it and the operations team converts it to an invoice.',
      p_terms => 'Valid 14 days. Response within 4 business hours.',
      p_lines => '[
        {"description":"Smart-hands hours (10h block)","category":"remote_hands","unit":"hour","quantity":10,"unit_price":55},
        {"description":"Quarterly preventive inspection","category":"survey","unit":"fixed","quantity":1,"unit_price":240}
      ]'::jsonb
    );
    update public.quotes set is_demo = true, status = 'sent', sent_at = now() - interval '2 days'
      where id = v_quote;
  end if;

  -- Two tickets: one in flight, one waiting for the client's sign-off.
  if not exists (
    select 1 from public.tickets t where t.client_org_id = v_org and t.is_demo = true
  ) then
    insert into public.tickets (client_org_id, site_id, created_by, category, priority, title, description,
                                status, scheduled_for, sla_due_at, is_demo)
    values (v_org, v_site, coalesce(v_client, v_actor), 'rack_and_stack', 'high',
            'DEMO — Install 2× 1U servers in rack B4',
            'Delivered hardware is on site. Rack space reserved, cabling prepared.',
            'assigned', now() + interval '2 days', now() + interval '4 hours', true)
    returning id into v_ticket;

    insert into public.ticket_events (ticket_id, actor_id, event_type, payload)
    values (v_ticket, coalesce(v_client, v_actor), 'ticket.created', jsonb_build_object('status', 'new'));

    insert into public.tickets (client_org_id, site_id, created_by, category, priority, title, description,
                                status, closed_at, is_demo)
    values (v_org, v_site, coalesce(v_client, v_actor), 'survey', 'normal',
            'DEMO — Cabling audit and labelling report',
            'Audit completed by the field engineer. Please confirm the report so we can close it.',
            'completed_pending_approval', null, true)
    returning id into v_ticket;
  end if;

  insert into public.audit_logs (actor_id, entity, entity_id, action, after_data)
  values (v_actor, 'demo_dataset', v_org, 'demo.client_seeded',
          jsonb_build_object('site', v_site, 'client_user', v_client, 'quote', v_quote));

  return jsonb_build_object('organization', v_org, 'site', v_site, 'client_user', v_client, 'quote', v_quote);
end;
$$;

-- ---------------------------------------------------------------------------
-- 10. Keep the demo purges complete
-- ---------------------------------------------------------------------------
-- Memberships go with the organisation (cascade), demo tickets with the purge below.
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
-- 11. Grants — only the client-facing surface is reachable from the API
-- ---------------------------------------------------------------------------
-- Note: this project (like every Supabase project) grants EXECUTE on new functions to `anon`
-- and `authenticated` by default. Revoking from `public` alone is therefore not enough: the
-- organisation-scoped helpers below take an organisation id or return rows for one, so they are
-- explicitly revoked from `anon` and `authenticated` too. Same treatment for `portal_notify`,
-- which would otherwise let any signed-in user drop a notification on any other user.
do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in (
      'portal_client_home','portal_client_quotes','portal_client_quote','portal_client_respond_quote',
      'portal_client_invoices','portal_client_invoice','portal_client_tickets','portal_client_ticket',
      'portal_client_sites','portal_client_request_visit','portal_client_sign_off','portal_client_seed_demo'
    )
  loop
    execute format('revoke all on function %s from public, anon', fn.sig);
    execute format('grant execute on function %s to authenticated', fn.sig);
  end loop;

  -- Internal helpers stay unreachable from the API.
  for fn in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in (
      'portal_client_org','portal_client_require_org','portal_client_currency',
      'portal_client_quote_list','portal_client_invoice_list','portal_client_ticket_list',
      'portal_notify'
    )
  loop
    execute format('revoke all on function %s from public, anon, authenticated', fn.sig);
  end loop;
end $$;
