-- Authenticated ticket creation and restricted ticket status workflow RPCs.

create or replace function public.create_ticket(
  p_client_org_id uuid,
  p_site_id uuid,
  p_category text,
  p_title text,
  p_description text default '',
  p_priority public.ticket_priority default 'normal',
  p_sla_due_at timestamptz default null,
  p_estimated_hours numeric default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  new_ticket_id uuid;
  role_value public.app_role;
begin
  role_value := public.current_app_role();
  if (select auth.uid()) is null or role_value not in ('admin','staff','client') then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if role_value = 'client' and not public.is_org_member(p_client_org_id) then
    raise exception 'organization_scope_denied' using errcode = '42501';
  end if;
  if not exists (select 1 from public.organizations o where o.id = p_client_org_id and o.type = 'client') then
    raise exception 'client_organization_required' using errcode = '22023';
  end if;
  if not exists (select 1 from public.sites s where s.id = p_site_id and s.organization_id = p_client_org_id) then
    raise exception 'site_not_in_client_organization' using errcode = '22023';
  end if;
  if length(trim(p_title)) < 3 or length(trim(p_title)) > 240 or length(trim(p_category)) = 0 then
    raise exception 'invalid_ticket_fields' using errcode = '22023';
  end if;
  insert into public.tickets (client_org_id, site_id, created_by, category, priority, title, description, sla_due_at, estimated_hours)
  values (p_client_org_id, p_site_id, (select auth.uid()), trim(p_category), p_priority, trim(p_title), coalesce(p_description,''), p_sla_due_at, p_estimated_hours)
  returning id into new_ticket_id;
  insert into public.ticket_events (ticket_id, actor_id, event_type, payload)
  values (new_ticket_id, (select auth.uid()), 'ticket.created', jsonb_build_object('status','new'));
  return new_ticket_id;
end;
$$;
revoke all on function public.create_ticket(uuid,uuid,text,text,text,public.ticket_priority,timestamptz,numeric) from public;
grant execute on function public.create_ticket(uuid,uuid,text,text,text,public.ticket_priority,timestamptz,numeric) to authenticated;

create or replace function public.update_ticket_status(p_ticket_id uuid, p_next_status public.ticket_status)
returns public.ticket_status language plpgsql security definer set search_path = '' as $$
declare
  ticket_row public.tickets%rowtype;
  role_value public.app_role;
  allowed boolean := false;
begin
  if (select auth.uid()) is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  role_value := public.current_app_role();
  select * into ticket_row from public.tickets where id = p_ticket_id for update;
  if not found then raise exception 'ticket_not_found' using errcode = 'P0002'; end if;
  if role_value in ('admin','staff') then
    allowed := true;
  elsif role_value = 'freelancer' and ticket_row.assigned_to = (select auth.uid()) then
    allowed := case ticket_row.status
      when 'assigned' then p_next_status = 'en_route'
      when 'en_route' then p_next_status = 'on_site'
      when 'on_site' then p_next_status = 'in_progress'
      when 'in_progress' then p_next_status in ('waiting_client','waiting_parts','completed_pending_approval')
      when 'waiting_client' then p_next_status = 'in_progress'
      when 'waiting_parts' then p_next_status = 'in_progress'
      else false
    end;
  end if;
  if not allowed then raise exception 'status_transition_not_allowed' using errcode = '42501'; end if;
  update public.tickets set status = p_next_status,
    closed_at = case when p_next_status in ('closed','cancelled') then now() else closed_at end
    where id = p_ticket_id;
  insert into public.ticket_events (ticket_id, actor_id, event_type, payload)
  values (p_ticket_id, (select auth.uid()), 'ticket.status_changed', jsonb_build_object('from',ticket_row.status,'to',p_next_status));
  return p_next_status;
end;
$$;
revoke all on function public.update_ticket_status(uuid,public.ticket_status) from public;
grant execute on function public.update_ticket_status(uuid,public.ticket_status) to authenticated;
