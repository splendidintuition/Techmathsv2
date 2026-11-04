-- TechMaths Operations Portal — Wave 2 / 3 operations migration
-- Realtime chat & messaging RPCs, time entries logging and timesheet approval workflow

grant update (started_at, ended_at, approval_status, notes, approved_by, approved_at) on public.time_entries to authenticated;

-- Helper RPC to safely send ticket messages with role and scope validation
create or replace function public.send_ticket_message(
  p_ticket_id uuid,
  p_channel public.message_channel default 'client',
  p_body text default '',
  p_attachment_paths text[] default '{}'
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  new_msg_id uuid;
  role_value public.app_role;
  ticket_row public.tickets%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  role_value := public.current_app_role();

  select * into ticket_row from public.tickets where id = p_ticket_id;
  if not found then
    raise exception 'ticket_not_found' using errcode = 'P0002';
  end if;

  -- Validate ticket access
  if not public.can_access_ticket(p_ticket_id) then
    raise exception 'ticket_access_denied' using errcode = '42501';
  end if;

  -- Client users cannot write to internal channel
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
  values (p_ticket_id, (select auth.uid()), 'message.sent', jsonb_build_object('channel', p_channel, 'message_id', new_msg_id));

  return new_msg_id;
end;
$$;
revoke all on function public.send_ticket_message(uuid, public.message_channel, text, text[]) from public;
grant execute on function public.send_ticket_message(uuid, public.message_channel, text, text[]) to authenticated;

-- Helper RPC to log or update time entries
create or replace function public.log_time_entry(
  p_ticket_id uuid,
  p_category public.time_category,
  p_started_at timestamptz,
  p_ended_at timestamptz default null,
  p_source public.time_source default 'timer',
  p_notes text default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  new_entry_id uuid;
  role_value public.app_role;
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  role_value := public.current_app_role();

  if not public.can_access_ticket(p_ticket_id) then
    raise exception 'ticket_access_denied' using errcode = '42501';
  end if;

  if p_ended_at is not null and p_ended_at < p_started_at then
    raise exception 'invalid_time_interval' using errcode = '22023';
  end if;

  insert into public.time_entries (
    ticket_id, engineer_id, category, started_at, ended_at, source,
    approval_status, notes
  )
  values (
    p_ticket_id,
    (select auth.uid()),
    p_category,
    p_started_at,
    p_ended_at,
    p_source,
    case when p_ended_at is null then 'draft'::public.approval_status else 'submitted'::public.approval_status end,
    p_notes
  )
  returning id into new_entry_id;

  insert into public.ticket_events (ticket_id, actor_id, event_type, payload)
  values (p_ticket_id, (select auth.uid()), 'time.logged', jsonb_build_object('entry_id', new_entry_id, 'source', p_source));

  return new_entry_id;
end;
$$;
revoke all on function public.log_time_entry(uuid, public.time_category, timestamptz, timestamptz, public.time_source, text) from public;
grant execute on function public.log_time_entry(uuid, public.time_category, timestamptz, timestamptz, public.time_source, text) to authenticated;

-- Helper RPC to approve or reject a time entry
create or replace function public.approve_time_entry(
  p_entry_id uuid,
  p_status public.approval_status,
  p_notes text default null
)
returns public.approval_status language plpgsql security definer set search_path = '' as $$
declare
  entry_row public.time_entries%rowtype;
begin
  if (select auth.uid()) is null or not public.is_internal_user() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if p_status not in ('approved', 'rejected') then
    raise exception 'invalid_approval_status' using errcode = '22023';
  end if;

  select * into entry_row from public.time_entries where id = p_entry_id for update;
  if not found then
    raise exception 'entry_not_found' using errcode = 'P0002';
  end if;

  update public.time_entries
  set approval_status = p_status,
      approved_by = (select auth.uid()),
      approved_at = now(),
      notes = coalesce(p_notes, notes)
  where id = p_entry_id;

  insert into public.ticket_events (ticket_id, actor_id, event_type, payload)
  values (entry_row.ticket_id, (select auth.uid()), 'time.approval_changed', jsonb_build_object('entry_id', p_entry_id, 'status', p_status));

  return p_status;
end;
$$;
revoke all on function public.approve_time_entry(uuid, public.approval_status, text) from public;
grant execute on function public.approve_time_entry(uuid, public.approval_status, text) to authenticated;
