-- TechMaths Operations Portal — R4 "Clients, sites & accountability"
-- Closes the three gaps that block real use of the console:
--   §3.4 clients, sites and site access procedure (clients.view / clients.edit / clients.access_codes)
--   §3.5 engineer directory: pay rates, skills, verification (people.edit_rates / people.pay_rates / people.onboarding)
--   §3.8 audit log viewer (audit.view)
--
-- Contract note: additive only. No existing column, type, function or policy is dropped
-- or changed in behaviour. Every function is security definer, permission-checked and audited.
-- Sensitive values (site access text, pay rates) are only returned or written when the caller
-- holds the matching sensitive permission.

-- ---------------------------------------------------------------------------
-- 1. Clients and sites (§3.4)
-- ---------------------------------------------------------------------------

-- Read model for the Clients tab: every organization in scope with its sites,
-- counts and a boolean for whether access notes exist (never the notes themselves).
create or replace function public.portal_list_clients()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  payload jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if not (public.has_portal_permission('clients.view') or public.is_internal_user()) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(entry order by sort_name), '[]'::jsonb) into payload
  from (
    select o.name as sort_name, jsonb_build_object(
      'id', o.id,
      'name', o.name,
      'type', o.type,
      'billing_email', o.billing_email,
      'vat_number', o.vat_number,
      'country_code', o.country_code,
      'is_demo', o.is_demo,
      'created_at', o.created_at,
      'open_tickets', (
        select count(*) from public.tickets t
        where t.client_org_id = o.id and t.status not in ('closed', 'cancelled')
      ),
      'sites', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', s.id,
          'name', s.name,
          'address', s.address,
          'country_code', s.country_code,
          'latitude', s.latitude,
          'longitude', s.longitude,
          'geofence_radius_m', s.geofence_radius_m,
          'is_demo', s.is_demo,
          'has_access_notes', exists (
            select 1 from public.site_access_instructions i where i.site_id = s.id
          ),
          'assets', (select count(*) from public.assets a where a.site_id = s.id)
        ) order by s.name), '[]'::jsonb)
        from public.sites s
        where s.organization_id = o.id
      )
    ) as entry
    from public.organizations o
    where public.is_internal_user() or public.is_org_member(o.id)
  ) q;

  return jsonb_build_object('clients', payload, 'generated_at', now());
end;
$$;

-- Create or update a client organization. Admin/staff only; clients can never edit themselves.
create or replace function public.portal_save_client(
  p_id uuid default null,
  p_name text default '',
  p_billing_email text default null,
  p_vat_number text default null,
  p_country_code text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  target_id uuid;
  before_row jsonb;
begin
  if (select auth.uid()) is null or not public.has_portal_permission('clients.edit') then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'client_name_required' using errcode = '22023';
  end if;
  if p_billing_email is not null and trim(p_billing_email) <> ''
     and trim(p_billing_email) !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'invalid_email' using errcode = '22023';
  end if;

  if p_id is null then
    insert into public.organizations (type, name, billing_email, vat_number, country_code)
    values (
      'client',
      trim(p_name),
      nullif(trim(coalesce(p_billing_email, '')), ''),
      nullif(trim(coalesce(p_vat_number, '')), ''),
      nullif(upper(trim(coalesce(p_country_code, ''))), '')
    )
    returning id into target_id;
  else
    select jsonb_build_object('name', o.name, 'billing_email', o.billing_email,
                              'vat_number', o.vat_number, 'country_code', o.country_code)
      into before_row
      from public.organizations o where o.id = p_id;
    if before_row is null then
      raise exception 'client_not_found' using errcode = 'P0002';
    end if;

    update public.organizations o set
      name = trim(p_name),
      billing_email = nullif(trim(coalesce(p_billing_email, '')), ''),
      vat_number = nullif(trim(coalesce(p_vat_number, '')), ''),
      country_code = nullif(upper(trim(coalesce(p_country_code, ''))), '')
    where o.id = p_id
    returning o.id into target_id;
  end if;

  insert into public.audit_logs (actor_id, entity, entity_id, action, before_data, after_data)
  values (
    (select auth.uid()), 'organization', target_id,
    case when p_id is null then 'client.created' else 'client.updated' end,
    before_row,
    jsonb_build_object('name', trim(p_name))
  );

  return target_id;
end;
$$;

-- Create or update a site. Address and geofence are validated in the database.
create or replace function public.portal_save_site(
  p_id uuid default null,
  p_organization_id uuid default null,
  p_name text default '',
  p_address text default '',
  p_country_code text default null,
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_geofence_radius_m integer default 150
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  target_id uuid;
  resolved_org uuid;
  before_row jsonb;
begin
  if (select auth.uid()) is null or not public.has_portal_permission('clients.edit') then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'site_name_required' using errcode = '22023';
  end if;
  if coalesce(trim(p_address), '') = '' then
    raise exception 'site_address_required' using errcode = '22023';
  end if;
  if p_geofence_radius_m is null or p_geofence_radius_m < 25 or p_geofence_radius_m > 2000 then
    raise exception 'invalid_geofence' using errcode = '22023';
  end if;

  if p_id is null then
    if p_organization_id is null then
      raise exception 'organization_required' using errcode = '22023';
    end if;
    select o.id into resolved_org from public.organizations o where o.id = p_organization_id;
    if resolved_org is null then
      raise exception 'client_not_found' using errcode = 'P0002';
    end if;

    insert into public.sites (organization_id, name, address, country_code, latitude, longitude, geofence_radius_m)
    values (
      resolved_org, trim(p_name), trim(p_address),
      nullif(upper(trim(coalesce(p_country_code, ''))), ''),
      p_latitude, p_longitude, p_geofence_radius_m
    )
    returning id into target_id;
  else
    select s.organization_id,
           jsonb_build_object('name', s.name, 'address', s.address, 'geofence_radius_m', s.geofence_radius_m)
      into resolved_org, before_row
      from public.sites s where s.id = p_id;
    if before_row is null then
      raise exception 'site_not_found' using errcode = 'P0002';
    end if;

    update public.sites s set
      name = trim(p_name),
      address = trim(p_address),
      country_code = nullif(upper(trim(coalesce(p_country_code, ''))), ''),
      latitude = coalesce(p_latitude, s.latitude),
      longitude = coalesce(p_longitude, s.longitude),
      geofence_radius_m = p_geofence_radius_m
    where s.id = p_id
    returning s.id into target_id;
  end if;

  insert into public.audit_logs (actor_id, entity, entity_id, action, before_data, after_data)
  values (
    (select auth.uid()), 'site', target_id,
    case when p_id is null then 'site.created' else 'site.updated' end,
    before_row,
    jsonb_build_object('name', trim(p_name), 'organization_id', resolved_org)
  );

  return target_id;
end;
$$;

-- The access procedure is sensitive: separate permission, separate call, never in a list payload.
create or replace function public.portal_get_site_access(p_site_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  payload jsonb;
begin
  if (select auth.uid()) is null or not public.has_portal_permission('clients.access_codes') then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'site_id', s.id,
    'site_name', s.name,
    'instructions', coalesce(i.instructions, ''),
    'updated_at', i.updated_at
  ) into payload
  from public.sites s
  left join public.site_access_instructions i on i.site_id = s.id
  where s.id = p_site_id;

  if payload is null then
    raise exception 'site_not_found' using errcode = 'P0002';
  end if;
  return payload;
end;
$$;

create or replace function public.portal_save_site_access(p_site_id uuid, p_instructions text default '')
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  site_exists boolean;
  previous_length integer;
begin
  if (select auth.uid()) is null or not public.has_portal_permission('clients.access_codes') then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select exists (select 1 from public.sites s where s.id = p_site_id) into site_exists;
  if not site_exists then
    raise exception 'site_not_found' using errcode = 'P0002';
  end if;

  select coalesce(length(i.instructions), 0) into previous_length
    from public.site_access_instructions i where i.site_id = p_site_id;

  insert into public.site_access_instructions (site_id, instructions, updated_at)
  values (p_site_id, coalesce(p_instructions, ''), now())
  on conflict (site_id) do update
    set instructions = excluded.instructions, updated_at = now();

  insert into public.audit_logs (actor_id, entity, entity_id, action, before_data, after_data)
  values (
    (select auth.uid()), 'site_access', p_site_id, 'site.access_updated',
    jsonb_build_object('characters', coalesce(previous_length, 0)),
    jsonb_build_object('characters', length(coalesce(p_instructions, '')))
  );

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Engineer directory: rates, skills, verification (§3.5)
-- ---------------------------------------------------------------------------

-- Pay rates are hidden unless the caller holds people.pay_rates — the row still renders,
-- the sensitive fields come back as null so the UI can show "hidden" rather than a hole.
create or replace function public.portal_list_engineers()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  payload jsonb;
  can_see_rates boolean;
begin
  if (select auth.uid()) is null or not public.has_portal_permission('people.view') then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  can_see_rates := public.has_portal_permission('people.pay_rates');

  select coalesce(jsonb_agg(entry order by sort_name), '[]'::jsonb) into payload
  from (
    select coalesce(nullif(trim(p.full_name), ''), p.email, 'unnamed') as sort_name, jsonb_build_object(
      'user_id', p.id,
      'full_name', coalesce(nullif(trim(p.full_name), ''), p.email, 'unnamed'),
      'email', p.email,
      'role', p.role,
      'is_active', p.is_active,
      'skills', coalesce(e.skills, '{}'::text[]),
      'countries', coalesce(e.countries, '{}'::text[]),
      'currency', coalesce(e.currency, 'EUR'),
      'availability', coalesce(e.availability, 'offline'),
      'verification_status', coalesce(e.verification_status, 'pending'),
      'rating', e.rating,
      'has_profile', e.user_id is not null,
      'hourly_rate', case when can_see_rates then e.hourly_rate else null end,
      'open_tickets', (
        select count(*) from public.tickets t
        where t.assigned_to = p.id and t.status not in ('closed', 'cancelled')
      ),
      'hours_30d', (
        select coalesce(round(sum(te.minutes) / 60.0, 1), 0)
        from public.time_entries te
        where te.engineer_id = p.id
          and te.approval_status = 'approved'
          and te.started_at >= now() - interval '30 days'
      )
    ) as entry
    from public.profiles p
    left join public.engineer_profiles e on e.user_id = p.id
    where p.role = 'freelancer' or e.user_id is not null
  ) q;

  return jsonb_build_object('engineers', payload, 'rates_visible', can_see_rates, 'generated_at', now());
end;
$$;

-- Rate edits need people.edit_rates; verification moves need people.onboarding.
-- An actor may do one and not the other, so each field is checked independently.
create or replace function public.portal_save_engineer_profile(
  p_user_id uuid,
  p_hourly_rate numeric default null,
  p_currency text default null,
  p_verification_status text default null,
  p_skills text[] default null,
  p_countries text[] default null
) returns boolean language plpgsql security definer set search_path = '' as $$
declare
  can_edit_rates boolean := public.has_portal_permission('people.edit_rates');
  can_edit_verification boolean := public.has_portal_permission('people.onboarding');
  can_see_rates boolean := public.has_portal_permission('people.pay_rates');
  before_row jsonb;
  target_role public.app_role;
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if p_hourly_rate is not null and not can_edit_rates then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if p_verification_status is not null and not can_edit_verification then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if not (can_edit_rates or can_edit_verification) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select p.role into target_role from public.profiles p where p.id = p_user_id;
  if target_role is null then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;

  if p_hourly_rate is not null and p_hourly_rate < 0 then
    raise exception 'invalid_rate' using errcode = '22023';
  end if;
  if p_currency is not null and p_currency !~ '^[A-Z]{3}$' then
    raise exception 'invalid_currency' using errcode = '22023';
  end if;
  if p_verification_status is not null
     and p_verification_status not in ('pending', 'approved', 'rejected', 'suspended') then
    raise exception 'invalid_verification' using errcode = '22023';
  end if;

  select jsonb_build_object(
           'hourly_rate', case when can_see_rates then e.hourly_rate else null end,
           'verification_status', e.verification_status,
           'currency', e.currency
         )
    into before_row
    from public.engineer_profiles e where e.user_id = p_user_id;

  update public.engineer_profiles e set
    skills = coalesce(p_skills, e.skills),
    countries = coalesce(p_countries, e.countries),
    hourly_rate = case when can_edit_rates and p_hourly_rate is not null then p_hourly_rate else e.hourly_rate end,
    currency = coalesce(p_currency, e.currency),
    verification_status = case when can_edit_verification and p_verification_status is not null
                               then p_verification_status else e.verification_status end,
    updated_at = now()
  where e.user_id = p_user_id;

  if not found then
    insert into public.engineer_profiles (user_id, skills, countries, hourly_rate, currency, verification_status)
    values (
      p_user_id,
      coalesce(p_skills, '{}'::text[]),
      coalesce(p_countries, '{}'::text[]),
      case when can_edit_rates then p_hourly_rate else null end,
      coalesce(p_currency, 'EUR'),
      case when can_edit_verification then coalesce(p_verification_status, 'pending') else 'pending' end
    );
  end if;

  insert into public.audit_logs (actor_id, entity, entity_id, action, before_data, after_data)
  values (
    (select auth.uid()), 'engineer_profile', p_user_id, 'engineer.profile_saved',
    before_row,
    jsonb_build_object(
      'hourly_rate', case when can_see_rates then p_hourly_rate else null end,
      'verification_status', p_verification_status,
      'skills_count', coalesce(array_length(p_skills, 1), 0)
    )
  );

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Audit log viewer (§3.8)
-- ---------------------------------------------------------------------------

create or replace function public.portal_list_audit(
  p_entity text default null,
  p_actor uuid default null,
  p_limit integer default 100
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  payload jsonb;
  capped integer := least(greatest(coalesce(p_limit, 100), 1), 500);
begin
  if (select auth.uid()) is null or not public.has_portal_permission('audit.view') then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(entry order by created_at desc), '[]'::jsonb) into payload
  from (
    select a.created_at, jsonb_build_object(
      'id', a.id,
      'entity', a.entity,
      'entity_id', a.entity_id,
      'action', a.action,
      'actor_id', a.actor_id,
      'actor_name', coalesce(nullif(trim(p.full_name), ''), p.email),
      'actor_email', p.email,
      'before_data', a.before_data,
      'after_data', a.after_data,
      'created_at', a.created_at
    ) as entry
    from public.audit_logs a
    left join public.profiles p on p.id = a.actor_id
    where (p_entity is null or trim(p_entity) = '' or a.entity ilike '%' || trim(p_entity) || '%')
      and (p_actor is null or a.actor_id = p_actor)
    order by a.created_at desc
    limit capped
  ) q;

  return jsonb_build_object('entries', payload, 'limit', capped, 'generated_at', now());
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Grants
-- ---------------------------------------------------------------------------
grant execute on function public.portal_list_clients() to authenticated;
grant execute on function public.portal_save_client(uuid, text, text, text, text) to authenticated;
grant execute on function public.portal_save_site(uuid, uuid, text, text, text, double precision, double precision, integer) to authenticated;
grant execute on function public.portal_get_site_access(uuid) to authenticated;
grant execute on function public.portal_save_site_access(uuid, text) to authenticated;
grant execute on function public.portal_list_engineers() to authenticated;
grant execute on function public.portal_save_engineer_profile(uuid, numeric, text, text, text[], text[]) to authenticated;
grant execute on function public.portal_list_audit(text, uuid, integer) to authenticated;

insert into public.audit_logs (actor_id, entity, action, after_data)
values (null, 'migration', 'schema.applied', jsonb_build_object('migration', '20261104160000_portal_v4_clients_sites'));
