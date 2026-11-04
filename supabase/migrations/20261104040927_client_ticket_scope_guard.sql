-- Admin/staff may create tickets only for real client organizations, not internal orgs.
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
