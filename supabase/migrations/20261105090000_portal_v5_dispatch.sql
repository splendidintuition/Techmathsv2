-- TechMaths Operations Portal — R5 "Dispatch offers and notifications"
-- Closes the largest remaining gap from the Expanded Feature Plan (§3.2 dispatch, §5 offers,
-- §8 notifications): offers could be accepted but nothing ever created one, and no event was
-- ever pushed to a person.
--
-- Contract note: additive only. `accept_offer(uuid)` is unchanged and still works; the new
-- `portal_respond_offer` wraps the same rules and adds a decline path. `ticket_offers` is reused
-- as-is (status enum already had pending/accepted/declined/expired/taken).
--
-- No email provider is wired in this release, on purpose: notifications are in-app rows that an
-- engineer or coordinator sees in the portal. `portal_notifications` is also the outbox an email
-- worker would drain later, so nothing has to be rewritten when a provider is chosen.

-- ---------------------------------------------------------------------------
-- 1. Notifications (§8)
-- ---------------------------------------------------------------------------
create table if not exists public.portal_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null default 'info',
  title text not null,
  body text not null default '',
  entity text,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists portal_notifications_user_idx
  on public.portal_notifications (user_id, read_at, created_at desc);

alter table public.portal_notifications enable row level security;

drop policy if exists portal_notifications_select_own on public.portal_notifications;
create policy portal_notifications_select_own on public.portal_notifications
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists portal_notifications_update_own on public.portal_notifications;
create policy portal_notifications_update_own on public.portal_notifications
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

grant select on public.portal_notifications to authenticated;
grant update (read_at) on public.portal_notifications to authenticated;

-- Internal helper: one row per person. Never granted to clients of the API.
create or replace function public.portal_notify(
  p_user_id uuid,
  p_kind text,
  p_title text,
  p_body text default '',
  p_entity text default null,
  p_entity_id uuid default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  new_id uuid;
begin
  if p_user_id is null then
    return null;
  end if;
  insert into public.portal_notifications (user_id, kind, title, body, entity, entity_id)
  values (p_user_id, coalesce(p_kind, 'info'), p_title, coalesce(p_body, ''), p_entity, p_entity_id)
  returning id into new_id;
  return new_id;
end;
$$;

revoke all on function public.portal_notify(uuid, text, text, text, text, uuid) from public;

create or replace function public.portal_notifications_list(
  p_limit integer default 30,
  p_unread_only boolean default false
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  payload jsonb;
  capped integer := least(greatest(coalesce(p_limit, 30), 1), 200);
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(entry order by created_at desc), '[]'::jsonb) into payload
  from (
    select n.created_at, jsonb_build_object(
      'id', n.id,
      'kind', n.kind,
      'title', n.title,
      'body', n.body,
      'entity', n.entity,
      'entity_id', n.entity_id,
      'read_at', n.read_at,
      'created_at', n.created_at
    ) as entry
    from public.portal_notifications n
    where n.user_id = (select auth.uid())
      and (not coalesce(p_unread_only, false) or n.read_at is null)
    order by n.created_at desc
    limit capped
  ) q;

  return jsonb_build_object(
    'notifications', payload,
    'unread', (select count(*) from public.portal_notifications n
               where n.user_id = (select auth.uid()) and n.read_at is null)
  );
end;
$$;

create or replace function public.portal_notifications_mark(p_ids uuid[] default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  affected integer;
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  update public.portal_notifications n
    set read_at = now()
    where n.user_id = (select auth.uid())
      and n.read_at is null
      and (p_ids is null or n.id = any (p_ids));
  get diagnostics affected = row_count;
  return affected;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Dispatch offers (§3.2, §5)
-- ---------------------------------------------------------------------------

-- Housekeeping: anything past its deadline stops being actionable, and a ticket left in
-- 'offered' with nothing pending goes back to the pool.
create or replace function public.portal_expire_offers()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  expired integer := 0;
begin
  with dead as (
    update public.ticket_offers o
      set status = 'expired', responded_at = now()
      where o.status = 'pending' and o.expires_at <= now()
      returning o.ticket_id
  )
  select count(*) into expired from dead;

  update public.tickets t
    set status = 'new'
    where t.status = 'offered'
      and not exists (
        select 1 from public.ticket_offers o
        where o.ticket_id = t.id and o.status = 'pending' and o.expires_at > now()
      );

  return expired;
end;
$$;

create or replace function public.portal_send_offer(
  p_ticket_id uuid,
  p_engineer_id uuid,
  p_minutes integer default 60,
  p_rate numeric default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  ticket_row public.tickets%rowtype;
  engineer_role public.app_role;
  engineer_name text;
  offer_id uuid;
  minutes integer := least(greatest(coalesce(p_minutes, 60), 5), 2880);
  existing public.ticket_offers%rowtype;
begin
  if (select auth.uid()) is null or not public.has_portal_permission('dispatch.offer') then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select * into ticket_row from public.tickets where id = p_ticket_id for update;
  if not found then
    raise exception 'ticket_not_found' using errcode = 'P0002';
  end if;
  if ticket_row.status in ('closed', 'cancelled', 'approved') then
    raise exception 'ticket_closed' using errcode = '22023';
  end if;

  select p.role, coalesce(nullif(trim(p.full_name), ''), p.email, 'Engineer')
    into engineer_role, engineer_name
    from public.profiles p where p.id = p_engineer_id and p.is_active = true;
  if engineer_role is null then
    raise exception 'engineer_not_found' using errcode = 'P0002';
  end if;
  if engineer_role not in ('freelancer', 'staff', 'admin') then
    raise exception 'engineer_not_dispatchable' using errcode = '22023';
  end if;

  public.portal_expire_offers();

  select * into existing from public.ticket_offers o
    where o.ticket_id = p_ticket_id and o.engineer_id = p_engineer_id;

  if existing.id is not null and existing.status = 'pending' and existing.expires_at > now() then
    raise exception 'offer_already_pending' using errcode = '22023';
  end if;

  if existing.id is not null then
    update public.ticket_offers o set
      status = 'pending',
      offered_rate = p_rate,
      expires_at = now() + make_interval(mins => minutes),
      responded_at = null,
      decline_reason = null
    where o.id = existing.id
    returning o.id into offer_id;
  else
    insert into public.ticket_offers (ticket_id, engineer_id, status, offered_rate, expires_at)
    values (p_ticket_id, p_engineer_id, 'pending', p_rate, now() + make_interval(mins => minutes))
    returning id into offer_id;
  end if;

  update public.tickets t set status = 'offered' where t.id = p_ticket_id and t.status in ('new', 'triaged');

  insert into public.ticket_events (ticket_id, actor_id, event_type, payload)
  values (p_ticket_id, (select auth.uid()), 'offer.sent',
          jsonb_build_object('offer_id', offer_id, 'engineer_id', p_engineer_id, 'minutes', minutes));

  insert into public.audit_logs (actor_id, entity, entity_id, action, after_data)
  values ((select auth.uid()), 'ticket_offer', offer_id, 'offer.sent',
          jsonb_build_object('ticket_id', p_ticket_id, 'engineer_id', p_engineer_id,
                             'minutes', minutes, 'rate', p_rate));

  perform public.portal_notify(
    p_engineer_id,
    'offer',
    'New job offer · ' || coalesce(ticket_row.title, 'Ticket'),
    'Expires in ' || minutes || ' minutes. Open Offers to accept or decline.',
    'ticket_offer',
    offer_id
  );

  return offer_id;
end;
$$;

create or replace function public.portal_respond_offer(
  p_offer_id uuid,
  p_accept boolean,
  p_reason text default null
) returns text language plpgsql security definer set search_path = '' as $$
declare
  offer_row public.ticket_offers%rowtype;
  ticket_row public.tickets%rowtype;
  engineer_name text;
  result text;
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select * into offer_row from public.ticket_offers o where o.id = p_offer_id for update;
  if not found then
    raise exception 'offer_not_found' using errcode = 'P0002';
  end if;
  if offer_row.engineer_id <> (select auth.uid()) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select * into ticket_row from public.tickets t where t.id = offer_row.ticket_id for update;

  select coalesce(nullif(trim(p.full_name), ''), p.email, 'Engineer')
    into engineer_name from public.profiles p where p.id = offer_row.engineer_id;

  if offer_row.status <> 'pending' then
    raise exception 'offer_not_pending' using errcode = '22023';
  end if;
  if offer_row.expires_at <= now() then
    update public.ticket_offers o set status = 'expired', responded_at = now() where o.id = offer_row.id;
    raise exception 'offer_expired' using errcode = '22023';
  end if;

  if p_accept then
    if ticket_row.status <> 'offered' then
      raise exception 'offer_unavailable' using errcode = '22023';
    end if;
    update public.tickets t set assigned_to = offer_row.engineer_id, status = 'assigned'
      where t.id = ticket_row.id;
    update public.ticket_offers o set status = 'accepted', responded_at = now() where o.id = offer_row.id;
    update public.ticket_offers o set status = 'taken', responded_at = now()
      where o.ticket_id = ticket_row.id and o.id <> offer_row.id and o.status = 'pending';

    insert into public.ticket_events (ticket_id, actor_id, event_type, payload)
    values (ticket_row.id, offer_row.engineer_id, 'offer.accepted',
            jsonb_build_object('offer_id', offer_row.id));

    insert into public.audit_logs (actor_id, entity, entity_id, action, after_data)
    values (offer_row.engineer_id, 'ticket_offer', offer_row.id, 'offer.accepted',
            jsonb_build_object('ticket_id', ticket_row.id));

    perform public.portal_notify(
      u.user_id, 'offer',
      'Offer accepted · ' || coalesce(ticket_row.title, 'Ticket'),
      engineer_name || ' accepted and is now assigned.',
      'ticket', ticket_row.id
    )
    from (
      select p.id as user_id from public.profiles p
      where p.is_active = true and p.role in ('admin', 'staff')
    ) u;

    result := 'accepted';
  else
    update public.ticket_offers o set
      status = 'declined', responded_at = now(),
      decline_reason = nullif(trim(coalesce(p_reason, '')), '')
    where o.id = offer_row.id;

    insert into public.ticket_events (ticket_id, actor_id, event_type, payload)
    values (ticket_row.id, offer_row.engineer_id, 'offer.declined',
            jsonb_build_object('offer_id', offer_row.id, 'reason', p_reason));

    insert into public.audit_logs (actor_id, entity, entity_id, action, after_data)
    values (offer_row.engineer_id, 'ticket_offer', offer_row.id, 'offer.declined',
            jsonb_build_object('ticket_id', ticket_row.id, 'reason', p_reason));

    update public.tickets t set status = 'new'
      where t.id = ticket_row.id and t.status = 'offered'
        and not exists (
          select 1 from public.ticket_offers o
          where o.ticket_id = ticket_row.id and o.status = 'pending' and o.expires_at > now()
        );

    perform public.portal_notify(
      u.user_id, 'offer',
      'Offer declined · ' || coalesce(ticket_row.title, 'Ticket'),
      engineer_name || ' declined' || coalesce(' — ' || nullif(trim(p_reason), ''), '.'),
      'ticket', ticket_row.id
    )
    from (
      select p.id as user_id from public.profiles p
      where p.is_active = true and p.role in ('admin', 'staff')
    ) u;

    result := 'declined';
  end if;

  return result;
end;
$$;

create or replace function public.portal_my_offers(p_limit integer default 20)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  payload jsonb;
  capped integer := least(greatest(coalesce(p_limit, 20), 1), 100);
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  perform public.portal_expire_offers();

  select coalesce(jsonb_agg(entry order by created_at desc), '[]'::jsonb) into payload
  from (
    select o.created_at, jsonb_build_object(
      'id', o.id,
      'ticket_id', o.ticket_id,
      'ticket_number', t.ticket_number,
      'title', t.title,
      'description', t.description,
      'priority', t.priority,
      'status', o.status,
      'offered_rate', o.offered_rate,
      'expires_at', o.expires_at,
      'responded_at', o.responded_at,
      'decline_reason', o.decline_reason,
      'scheduled_for', t.scheduled_for,
      'sla_due_at', t.sla_due_at,
      'estimated_hours', t.estimated_hours,
      'site_name', s.name,
      'site_address', s.address,
      'client_name', org.name
    ) as entry
    from public.ticket_offers o
    join public.tickets t on t.id = o.ticket_id
    left join public.sites s on s.id = t.site_id
    left join public.organizations org on org.id = t.client_org_id
    where o.engineer_id = (select auth.uid())
    order by o.created_at desc
    limit capped
  ) q;

  return jsonb_build_object('offers', payload, 'generated_at', now());
end;
$$;

create or replace function public.portal_list_ticket_offers(p_ticket_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  payload jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if not (public.is_internal_user() or public.can_access_ticket(p_ticket_id)) then
    raise exception 'ticket_access_denied' using errcode = '42501';
  end if;

  perform public.portal_expire_offers();

  select coalesce(jsonb_agg(entry order by created_at desc), '[]'::jsonb) into payload
  from (
    select o.created_at, jsonb_build_object(
      'id', o.id,
      'engineer_id', o.engineer_id,
      'engineer_name', coalesce(nullif(trim(p.full_name), ''), p.email, 'Engineer'),
      'status', o.status,
      'offered_rate', o.offered_rate,
      'expires_at', o.expires_at,
      'responded_at', o.responded_at,
      'decline_reason', o.decline_reason
    ) as entry
    from public.ticket_offers o
    left join public.profiles p on p.id = o.engineer_id
    where o.ticket_id = p_ticket_id
  ) q;

  return jsonb_build_object('offers', payload, 'generated_at', now());
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Event notifications from existing tables (§8)
-- ---------------------------------------------------------------------------
create or replace function public.portal_notify_ticket_assigned()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.assigned_to is not null and new.assigned_to is distinct from old.assigned_to then
    perform public.portal_notify(
      new.assigned_to, 'ticket',
      'You have been assigned · ' || coalesce(new.title, 'Ticket'),
      'Open the ticket to see the site, the checklist and the chat.',
      'ticket', new.id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists tickets_notify_assignment on public.tickets;
create trigger tickets_notify_assignment
  after update of assigned_to on public.tickets
  for each row execute function public.portal_notify_ticket_assigned();

create or replace function public.portal_notify_quote_response()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status in ('accepted', 'declined') and new.status is distinct from old.status then
    perform public.portal_notify(
      p.id, 'money',
      'Quote ' || new.status || ' · ' || coalesce(new.title, 'Quote'),
      'The client recorded a decision. Open Money → Quotes to see the detail.',
      'quote', new.id
    )
    from public.profiles p
    where p.is_active = true and p.role in ('admin', 'staff');
  end if;
  return new;
end;
$$;

drop trigger if exists quotes_notify_response on public.quotes;
create trigger quotes_notify_response
  after update of status on public.quotes
  for each row execute function public.portal_notify_quote_response();

create or replace function public.portal_notify_expense_submitted()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'submitted' and new.status is distinct from old.status then
    perform public.portal_notify(
      p.id, 'money',
      'Expense waiting for review · ' || coalesce(new.vendor, new.description, 'claim'),
      coalesce(new.amount_net::text, '') || ' ' || coalesce(new.currency, ''),
      'expense', new.id
    )
    from public.profiles p
    where p.is_active = true and p.role in ('admin', 'staff');
  end if;
  return new;
end;
$$;

drop trigger if exists expenses_notify_submitted on public.expenses;
create trigger expenses_notify_submitted
  after update of status on public.expenses
  for each row execute function public.portal_notify_expense_submitted();

-- ---------------------------------------------------------------------------
-- 4. Grants
-- ---------------------------------------------------------------------------
grant execute on function public.portal_notifications_list(integer, boolean) to authenticated;
grant execute on function public.portal_notifications_mark(uuid[]) to authenticated;
grant execute on function public.portal_expire_offers() to authenticated;
grant execute on function public.portal_send_offer(uuid, uuid, integer, numeric) to authenticated;
grant execute on function public.portal_respond_offer(uuid, boolean, text) to authenticated;
grant execute on function public.portal_my_offers(integer) to authenticated;
grant execute on function public.portal_list_ticket_offers(uuid) to authenticated;

insert into public.audit_logs (actor_id, entity, action, after_data)
values (null, 'migration', 'schema.applied', jsonb_build_object('migration', '20261105090000_portal_v5_dispatch'));

-- Realtime: the bell subscribes to its own rows. Without this the subscription is silent and the
-- 60-second poll is the only path, so the table is added to the publication when it exists.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'portal_notifications'
     ) then
    alter publication supabase_realtime add table public.portal_notifications;
  end if;
end $$;
