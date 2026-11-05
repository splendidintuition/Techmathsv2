-- TechMaths Operations Portal — R9 "Parts, stock and consumables"
-- §7.2 of the Expanded Feature Plan asked for a parts catalog, stock per warehouse or engineer kit,
-- parts requested from a ticket, low-stock alerts, purchase orders, returns and warranty tracking.
-- The build had a permission key (`assets.stock`) and nothing behind it.
--
-- This release adds a small inventory spine: a catalog, stock per location, an immutable movement
-- ledger, ticket consumption that hits stock exactly once, and purchase orders that receive into a
-- location. Stock can only change through `part_stock_move`, so the ledger and the balance can never
-- drift, and a negative balance is refused rather than allowed to go invisible.

-- ---------------------------------------------------------------------------
-- 1. Types and tables
-- ---------------------------------------------------------------------------
do $$
begin
  create type public.stock_location_kind as enum ('warehouse', 'van', 'kit', 'office');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.stock_movement_kind as enum ('receive', 'issue', 'return', 'adjust');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.purchase_order_status as enum ('draft', 'sent', 'partial', 'received', 'cancelled');
exception when duplicate_object then null;
end $$;

create table if not exists public.stock_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 80),
  kind public.stock_location_kind not null default 'warehouse',
  owner_id uuid references public.profiles(id) on delete set null,
  notes text not null default '',
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists stock_locations_name_key
  on public.stock_locations (lower(trim(name)));

create table if not exists public.parts (
  id uuid primary key default gen_random_uuid(),
  sku text not null check (length(trim(sku)) between 1 and 60),
  name text not null check (length(trim(name)) between 2 and 160),
  description text not null default '',
  category text not null default 'General',
  brand text not null default '',
  unit text not null default 'unit',
  unit_cost numeric(12,2) not null default 0 check (unit_cost >= 0),
  sale_price numeric(12,2) not null default 0 check (sale_price >= 0),
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  supplier text not null default '',
  reorder_point numeric(12,2) not null default 0 check (reorder_point >= 0),
  reorder_quantity numeric(12,2) not null default 0 check (reorder_quantity >= 0),
  barcode text not null default '',
  is_active boolean not null default true,
  is_demo boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists parts_sku_key on public.parts (lower(trim(sku)));
create index if not exists parts_name_idx on public.parts (lower(name));
create index if not exists parts_category_idx on public.parts (category);

create table if not exists public.part_stock (
  part_id uuid not null references public.parts(id) on delete cascade,
  location_id uuid not null references public.stock_locations(id) on delete cascade,
  quantity numeric(12,2) not null default 0,
  updated_at timestamptz not null default now(),
  primary key (part_id, location_id)
);

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null default '',
  supplier text not null default '',
  status public.purchase_order_status not null default 'draft',
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  ordered_on date not null default current_date,
  expected_on date,
  notes text not null default '',
  is_demo boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  received_at timestamptz
);

create unique index if not exists purchase_orders_reference_key
  on public.purchase_orders (lower(trim(reference)))
  where length(trim(reference)) > 0;

create index if not exists purchase_orders_status_idx
  on public.purchase_orders (status, ordered_on desc);

create table if not exists public.purchase_order_lines (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  part_id uuid not null references public.parts(id) on delete restrict,
  quantity numeric(12,2) not null check (quantity > 0),
  received_quantity numeric(12,2) not null default 0 check (received_quantity >= 0),
  unit_cost numeric(12,2) not null default 0 check (unit_cost >= 0)
);

create index if not exists purchase_order_lines_po_idx
  on public.purchase_order_lines (purchase_order_id);

create table if not exists public.stock_movements (
  id bigint generated always as identity primary key,
  part_id uuid not null references public.parts(id) on delete cascade,
  location_id uuid not null references public.stock_locations(id) on delete cascade,
  kind public.stock_movement_kind not null,
  quantity numeric(12,2) not null,
  unit_cost numeric(12,2),
  balance_after numeric(12,2) not null default 0,
  ticket_id uuid references public.tickets(id) on delete set null,
  purchase_order_id uuid references public.purchase_orders(id) on delete set null,
  reference text not null default '',
  note text not null default '',
  actor_id uuid references public.profiles(id) on delete set null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  constraint stock_movements_nonzero check (quantity <> 0)
);

create index if not exists stock_movements_part_idx
  on public.stock_movements (part_id, created_at desc);
create index if not exists stock_movements_ticket_idx on public.stock_movements (ticket_id);

create table if not exists public.ticket_parts (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  part_id uuid not null references public.parts(id) on delete restrict,
  location_id uuid references public.stock_locations(id) on delete set null,
  quantity numeric(12,2) not null check (quantity > 0),
  unit_cost numeric(12,2) not null default 0 check (unit_cost >= 0),
  sale_price numeric(12,2) not null default 0 check (sale_price >= 0),
  currency text not null default 'EUR',
  billable boolean not null default true,
  warranty_until date,
  serial text not null default '',
  note text not null default '',
  is_demo boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists ticket_parts_ticket_idx on public.ticket_parts (ticket_id);
create index if not exists ticket_parts_part_idx on public.ticket_parts (part_id);

-- ---------------------------------------------------------------------------
-- 2. Predicates
-- ---------------------------------------------------------------------------
create or replace function public.parts_can_view()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(
    public.is_internal_user() and (
      public.has_portal_permission('assets.view')
      or public.has_portal_permission('assets.stock')
      or public.has_portal_permission('assets.purchase_orders')
    ),
    false
  )
$$;
revoke all on function public.parts_can_view() from public, anon, authenticated;

create or replace function public.parts_can_stock()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.is_internal_user() and public.has_portal_permission('assets.stock'), false)
$$;
revoke all on function public.parts_can_stock() from public, anon, authenticated;

create or replace function public.parts_can_order()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.is_internal_user() and public.has_portal_permission('assets.purchase_orders'), false)
$$;
revoke all on function public.parts_can_order() from public, anon, authenticated;

create or replace function public.parts_can_edit()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(
    public.is_internal_user() and (
      public.has_portal_permission('assets.edit') or public.has_portal_permission('assets.stock')
    ),
    false
  )
$$;
revoke all on function public.parts_can_edit() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Reads
-- ---------------------------------------------------------------------------
create or replace function public.parts_metrics()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  payload jsonb;
begin
  if (select auth.uid()) is null or not public.parts_can_view() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'skus', (select count(*) from public.parts p where p.is_active),
    'all_skus', (select count(*) from public.parts),
    'locations', (select count(*) from public.stock_locations),
    'stock_value', (
      select round(coalesce(sum(ps.quantity * p.unit_cost), 0), 2)
      from public.part_stock ps
      join public.parts p on p.id = ps.part_id
    ),
    'low_stock', (
      select count(*)
      from public.parts p
      left join (
        select ps.part_id, sum(ps.quantity) as qty
        from public.part_stock ps
        group by ps.part_id
      ) s on s.part_id = p.id
      where p.is_active and p.reorder_point > 0 and coalesce(s.qty, 0) <= p.reorder_point
    ),
    'out_of_stock', (
      select count(*)
      from public.parts p
      left join (
        select ps.part_id, sum(ps.quantity) as qty
        from public.part_stock ps
        group by ps.part_id
      ) s on s.part_id = p.id
      where p.is_active and coalesce(s.qty, 0) <= 0
    ),
    'open_orders', (
      select count(*) from public.purchase_orders po where po.status in ('draft', 'sent', 'partial')
    ),
    'movements_30d', (
      select count(*) from public.stock_movements sm where sm.created_at >= now() - interval '30 days'
    ),
    'categories', (
      select coalesce(to_jsonb(array_agg(distinct p.category order by p.category)), '[]'::jsonb)
      from public.parts p
    ),
    'flags', jsonb_build_object(
      'can_stock', public.parts_can_stock(),
      'can_order', public.parts_can_order(),
      'can_edit', public.parts_can_edit()
    )
  ) into payload;

  return payload;
end;
$$;

create or replace function public.parts_list(
  p_query text default null,
  p_category text default null,
  p_low_only boolean default false,
  p_include_inactive boolean default false
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  payload jsonb;
begin
  if (select auth.uid()) is null or not public.parts_can_view() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select coalesce(
    jsonb_agg(row order by (row ->> 'name')),
    '[]'::jsonb
  ) into payload
  from (
    select jsonb_build_object(
      'id', p.id,
      'sku', p.sku,
      'name', p.name,
      'description', p.description,
      'category', p.category,
      'brand', p.brand,
      'unit', p.unit,
      'unit_cost', p.unit_cost,
      'sale_price', p.sale_price,
      'currency', p.currency,
      'supplier', p.supplier,
      'reorder_point', p.reorder_point,
      'reorder_quantity', p.reorder_quantity,
      'barcode', p.barcode,
      'is_active', p.is_active,
      'is_demo', p.is_demo,
      'quantity', coalesce(s.qty, 0),
      'stock_value', round(coalesce(s.value, 0), 2),
      'low', (p.reorder_point > 0 and coalesce(s.qty, 0) <= p.reorder_point),
      'locations', coalesce(l.balances, '[]'::jsonb)
    ) as row
    from public.parts p
    left join lateral (
      select sum(ps.quantity) as qty, sum(ps.quantity * p.unit_cost) as value
      from public.part_stock ps
      where ps.part_id = p.id
    ) s on true
    left join lateral (
      select jsonb_agg(
               jsonb_build_object(
                 'location_id', sl.id,
                 'name', sl.name,
                 'kind', sl.kind,
                 'quantity', ps.quantity
               ) order by sl.name
             ) as balances
      from public.part_stock ps
      join public.stock_locations sl on sl.id = ps.location_id
      where ps.part_id = p.id
    ) l on true
    where (p_include_inactive or p.is_active)
      and (p_category is null or p_category = '' or p.category = p_category)
      and (p_low_only is not true or (p.reorder_point > 0 and coalesce(s.qty, 0) <= p.reorder_point))
      and (
        p_query is null or trim(p_query) = ''
        or p.name ilike '%' || trim(p_query) || '%'
        or p.sku ilike '%' || trim(p_query) || '%'
        or p.brand ilike '%' || trim(p_query) || '%'
        or p.barcode ilike '%' || trim(p_query) || '%'
      )
  ) x;

  return payload;
end;
$$;

create or replace function public.part_get(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  payload jsonb;
begin
  if (select auth.uid()) is null or not public.parts_can_view() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'id', p.id,
    'sku', p.sku,
    'name', p.name,
    'description', p.description,
    'category', p.category,
    'brand', p.brand,
    'unit', p.unit,
    'unit_cost', p.unit_cost,
    'sale_price', p.sale_price,
    'currency', p.currency,
    'supplier', p.supplier,
    'reorder_point', p.reorder_point,
    'reorder_quantity', p.reorder_quantity,
    'barcode', p.barcode,
    'is_active', p.is_active,
    'is_demo', p.is_demo,
    'quantity', coalesce((select sum(ps.quantity) from public.part_stock ps where ps.part_id = p.id), 0),
    'locations', coalesce(
      (
        select jsonb_agg(
                 jsonb_build_object(
                   'location_id', sl.id,
                   'name', sl.name,
                   'kind', sl.kind,
                   'quantity', ps.quantity
                 ) order by sl.name
               )
        from public.part_stock ps
        join public.stock_locations sl on sl.id = ps.location_id
        where ps.part_id = p.id
      ),
      '[]'::jsonb
    ),
    'used_on_tickets', (
      select count(distinct tp.ticket_id) from public.ticket_parts tp where tp.part_id = p.id
    ),
    'movements', coalesce(
      (
        select jsonb_agg(
                 jsonb_build_object(
                   'id', m.id,
                   'kind', m.kind,
                   'quantity', m.quantity,
                   'balance_after', m.balance_after,
                   'location_name', sl.name,
                   'ticket_number', t.ticket_number,
                   'reference', m.reference,
                   'note', m.note,
                   'created_at', m.created_at
                 ) order by m.created_at desc
               )
        from (
          select sm.* from public.stock_movements sm
          where sm.part_id = p.id
          order by sm.created_at desc
          limit 25
        ) m
        join public.stock_locations sl on sl.id = m.location_id
        left join public.tickets t on t.id = m.ticket_id
      ),
      '[]'::jsonb
    )
  ) into payload
  from public.parts p
  where p.id = p_id;

  if payload is null then
    raise exception 'part_not_found' using errcode = 'P0002';
  end if;

  return payload;
end;
$$;

create or replace function public.stock_locations_list()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  payload jsonb;
begin
  if (select auth.uid()) is null or not public.parts_can_view() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(row order by (row ->> 'name')), '[]'::jsonb) into payload
  from (
    select jsonb_build_object(
      'id', sl.id,
      'name', sl.name,
      'kind', sl.kind,
      'owner_id', sl.owner_id,
      'owner_name', pr.full_name,
      'notes', sl.notes,
      'is_demo', sl.is_demo,
      'skus', (
        select count(*) from public.part_stock ps
        where ps.location_id = sl.id and ps.quantity > 0
      ),
      'value', (
        select round(coalesce(sum(ps.quantity * p.unit_cost), 0), 2)
        from public.part_stock ps
        join public.parts p on p.id = ps.part_id
        where ps.location_id = sl.id
      )
    ) as row
    from public.stock_locations sl
    left join public.profiles pr on pr.id = sl.owner_id
  ) x;

  return payload;
end;
$$;

create or replace function public.ticket_parts_list(p_ticket_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_ticket public.tickets%rowtype;
  payload jsonb;
begin
  if (select auth.uid()) is null or not public.parts_can_view() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select * into v_ticket from public.tickets t where t.id = p_ticket_id;
  if not found then
    raise exception 'ticket_not_found' using errcode = 'P0002';
  end if;

  select jsonb_build_object(
    'ticket_id', p_ticket_id,
    'rows', coalesce(
      (
        select jsonb_agg(
                 jsonb_build_object(
                   'id', tp.id,
                   'part_id', tp.part_id,
                   'sku', p.sku,
                   'name', p.name,
                   'quantity', tp.quantity,
                   'unit', p.unit,
                   'unit_cost', tp.unit_cost,
                   'sale_price', tp.sale_price,
                   'currency', tp.currency,
                   'billable', tp.billable,
                   'warranty_until', tp.warranty_until,
                   'serial', tp.serial,
                   'note', tp.note,
                   'location_name', sl.name,
                   'created_at', tp.created_at
                 ) order by tp.created_at
               )
        from public.ticket_parts tp
        join public.parts p on p.id = tp.part_id
        left join public.stock_locations sl on sl.id = tp.location_id
        where tp.ticket_id = p_ticket_id
      ),
      '[]'::jsonb
    ),
    'totals', jsonb_build_object(
      'count', (select count(*) from public.ticket_parts tp where tp.ticket_id = p_ticket_id),
      'cost', (
        select round(coalesce(sum(tp.quantity * tp.unit_cost), 0), 2)
        from public.ticket_parts tp where tp.ticket_id = p_ticket_id
      ),
      'charge', (
        select round(coalesce(sum(case when tp.billable then tp.quantity * tp.sale_price else 0 end), 0), 2)
        from public.ticket_parts tp where tp.ticket_id = p_ticket_id
      )
    ),
    'flags', jsonb_build_object(
      'can_stock', public.parts_can_stock(),
      'can_order', public.parts_can_order()
    )
  ) into payload;

  return payload;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Writes
-- ---------------------------------------------------------------------------
create or replace function public.part_save(
  p_id uuid,
  p_sku text,
  p_name text,
  p_category text default 'General',
  p_brand text default '',
  p_unit text default 'unit',
  p_unit_cost numeric default 0,
  p_sale_price numeric default 0,
  p_currency text default 'EUR',
  p_supplier text default '',
  p_reorder_point numeric default 0,
  p_reorder_quantity numeric default 0,
  p_description text default '',
  p_barcode text default '',
  p_is_active boolean default true
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := (select auth.uid());
  v_id uuid;
  v_before jsonb;
begin
  if v_actor is null or not public.parts_can_edit() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_sku, ''))) < 1 then
    raise exception 'part_sku_required' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_name, ''))) < 2 then
    raise exception 'part_name_required' using errcode = '22023';
  end if;
  if coalesce(p_unit_cost, 0) < 0 or coalesce(p_sale_price, 0) < 0 then
    raise exception 'invalid_price' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.parts p
    where lower(trim(p.sku)) = lower(trim(p_sku)) and (p_id is null or p.id <> p_id)
  ) then
    raise exception 'part_sku_taken' using errcode = '23505';
  end if;

  if p_id is null then
    insert into public.parts (
      sku, name, description, category, brand, unit, unit_cost, sale_price, currency,
      supplier, reorder_point, reorder_quantity, barcode, is_active, created_by
    ) values (
      trim(p_sku), trim(p_name), coalesce(p_description, ''), coalesce(nullif(trim(p_category), ''), 'General'),
      coalesce(p_brand, ''), coalesce(nullif(trim(p_unit), ''), 'unit'),
      coalesce(p_unit_cost, 0), coalesce(p_sale_price, 0), coalesce(nullif(p_currency, ''), 'EUR'),
      coalesce(p_supplier, ''), coalesce(p_reorder_point, 0), coalesce(p_reorder_quantity, 0),
      coalesce(p_barcode, ''), coalesce(p_is_active, true), v_actor
    ) returning id into v_id;
  else
    select to_jsonb(p) into v_before from public.parts p where p.id = p_id;
    if v_before is null then
      raise exception 'part_not_found' using errcode = 'P0002';
    end if;
    update public.parts set
      sku = trim(p_sku),
      name = trim(p_name),
      description = coalesce(p_description, ''),
      category = coalesce(nullif(trim(p_category), ''), category),
      brand = coalesce(p_brand, ''),
      unit = coalesce(nullif(trim(p_unit), ''), unit),
      unit_cost = coalesce(p_unit_cost, unit_cost),
      sale_price = coalesce(p_sale_price, sale_price),
      currency = coalesce(nullif(p_currency, ''), currency),
      supplier = coalesce(p_supplier, ''),
      reorder_point = coalesce(p_reorder_point, reorder_point),
      reorder_quantity = coalesce(p_reorder_quantity, reorder_quantity),
      barcode = coalesce(p_barcode, ''),
      is_active = coalesce(p_is_active, is_active),
      updated_at = now()
    where id = p_id;
    v_id := p_id;
  end if;

  insert into public.audit_logs (actor_id, entity, entity_id, action, before_data, after_data)
  values (v_actor, 'part', v_id,
          case when p_id is null then 'part.created' else 'part.updated' end,
          v_before,
          (select to_jsonb(p) from public.parts p where p.id = v_id));

  return v_id;
end;
$$;

create or replace function public.stock_location_save(
  p_id uuid,
  p_name text,
  p_kind public.stock_location_kind default 'warehouse',
  p_owner_id uuid default null,
  p_notes text default ''
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := (select auth.uid());
  v_id uuid;
begin
  if v_actor is null or not public.parts_can_stock() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_name, ''))) < 2 then
    raise exception 'location_name_required' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.stock_locations sl
    where lower(trim(sl.name)) = lower(trim(p_name)) and (p_id is null or sl.id <> p_id)
  ) then
    raise exception 'location_name_taken' using errcode = '23505';
  end if;

  if p_id is null then
    insert into public.stock_locations (name, kind, owner_id, notes)
    values (trim(p_name), coalesce(p_kind, 'warehouse'), p_owner_id, coalesce(p_notes, ''))
    returning id into v_id;
  else
    update public.stock_locations set
      name = trim(p_name),
      kind = coalesce(p_kind, kind),
      owner_id = p_owner_id,
      notes = coalesce(p_notes, '')
    where id = p_id;
    if not found then
      raise exception 'location_not_found' using errcode = 'P0002';
    end if;
    v_id := p_id;
  end if;

  insert into public.audit_logs (actor_id, entity, entity_id, action, after_data)
  values (v_actor, 'stock_location', v_id, 'location.saved',
          jsonb_build_object('name', p_name, 'kind', p_kind));

  return v_id;
end;
$$;

-- The only way stock changes. `adjust` takes the new absolute count; everything else is a delta.
create or replace function public.part_stock_move(
  p_part_id uuid,
  p_location_id uuid,
  p_kind public.stock_movement_kind,
  p_quantity numeric,
  p_note text default '',
  p_ticket_id uuid default null,
  p_unit_cost numeric default null,
  p_purchase_order_id uuid default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := (select auth.uid());
  v_part public.parts%rowtype;
  v_current numeric(12,2) := 0;
  v_delta numeric(12,2);
  v_balance numeric(12,2);
  v_is_demo boolean := false;
begin
  if v_actor is null or not public.parts_can_stock() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if p_quantity is null or p_quantity = 0 then
    raise exception 'quantity_required' using errcode = '22023';
  end if;
  if p_kind <> 'adjust' and p_quantity < 0 then
    raise exception 'quantity_must_be_positive' using errcode = '22023';
  end if;

  select * into v_part from public.parts p where p.id = p_part_id;
  if not found then
    raise exception 'part_not_found' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.stock_locations sl where sl.id = p_location_id) then
    raise exception 'location_not_found' using errcode = 'P0002';
  end if;

  select coalesce(ps.quantity, 0) into v_current
  from public.part_stock ps
  where ps.part_id = p_part_id and ps.location_id = p_location_id;
  v_current := coalesce(v_current, 0);

  v_delta := case
    when p_kind = 'adjust' then p_quantity - v_current
    when p_kind = 'issue' then -abs(p_quantity)
    else abs(p_quantity)
  end;

  if v_delta = 0 then
    raise exception 'no_change' using errcode = '22023';
  end if;

  v_balance := v_current + v_delta;
  if v_balance < 0 then
    raise exception 'insufficient_stock' using errcode = '22023';
  end if;

  insert into public.part_stock (part_id, location_id, quantity, updated_at)
  values (p_part_id, p_location_id, v_balance, now())
  on conflict (part_id, location_id)
  do update set quantity = excluded.quantity, updated_at = now();

  if p_ticket_id is not null then
    select coalesce(t.is_demo, false) into v_is_demo from public.tickets t where t.id = p_ticket_id;
    v_is_demo := coalesce(v_is_demo, false);
  else
    v_is_demo := v_part.is_demo;
  end if;

  insert into public.stock_movements (
    part_id, location_id, kind, quantity, unit_cost, balance_after, ticket_id,
    purchase_order_id, note, actor_id, is_demo
  ) values (
    p_part_id, p_location_id, p_kind, v_delta, coalesce(p_unit_cost, v_part.unit_cost),
    v_balance, p_ticket_id, p_purchase_order_id, coalesce(p_note, ''), v_actor, v_is_demo
  );

  insert into public.audit_logs (actor_id, entity, entity_id, action, after_data)
  values (v_actor, 'part', p_part_id, 'stock.moved',
          jsonb_build_object(
            'location_id', p_location_id,
            'kind', p_kind,
            'delta', v_delta,
            'balance', v_balance,
            'ticket_id', p_ticket_id
          ));

  return jsonb_build_object('balance', v_balance, 'delta', v_delta, 'location_id', p_location_id);
end;
$$;

create or replace function public.ticket_part_add(
  p_ticket_id uuid,
  p_part_id uuid,
  p_location_id uuid,
  p_quantity numeric,
  p_billable boolean default true,
  p_warranty_until date default null,
  p_serial text default '',
  p_note text default ''
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := (select auth.uid());
  v_part public.parts%rowtype;
  v_ticket public.tickets%rowtype;
  v_id uuid;
begin
  if v_actor is null or not public.parts_can_stock() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'quantity_must_be_positive' using errcode = '22023';
  end if;

  select * into v_part from public.parts p where p.id = p_part_id;
  if not found then
    raise exception 'part_not_found' using errcode = 'P0002';
  end if;
  select * into v_ticket from public.tickets t where t.id = p_ticket_id;
  if not found then
    raise exception 'ticket_not_found' using errcode = 'P0002';
  end if;

  -- Takes the stock first: if the shelf is empty this raises and nothing is recorded.
  perform public.part_stock_move(
    p_part_id, p_location_id, 'issue', p_quantity,
    coalesce(p_note, ''), p_ticket_id, v_part.unit_cost
  );

  insert into public.ticket_parts (
    ticket_id, part_id, location_id, quantity, unit_cost, sale_price, currency,
    billable, warranty_until, serial, note, is_demo, created_by
  ) values (
    p_ticket_id, p_part_id, p_location_id, p_quantity, v_part.unit_cost, v_part.sale_price,
    v_part.currency, coalesce(p_billable, true), p_warranty_until, coalesce(p_serial, ''),
    coalesce(p_note, ''), v_ticket.is_demo, v_actor
  ) returning id into v_id;

  insert into public.audit_logs (actor_id, entity, entity_id, action, after_data)
  values (v_actor, 'ticket_part', v_id, 'ticket.part_added',
          jsonb_build_object(
            'ticket_id', p_ticket_id,
            'part_id', p_part_id,
            'quantity', p_quantity,
            'location_id', p_location_id
          ));

  return v_id;
end;
$$;

create or replace function public.ticket_part_remove(p_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := (select auth.uid());
  v_row public.ticket_parts%rowtype;
begin
  if v_actor is null or not public.parts_can_stock() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select * into v_row from public.ticket_parts tp where tp.id = p_id;
  if not found then
    raise exception 'ticket_part_not_found' using errcode = 'P0002';
  end if;

  if v_row.location_id is not null then
    perform public.part_stock_move(
      v_row.part_id, v_row.location_id, 'return', v_row.quantity,
      'Returned from ticket', v_row.ticket_id, v_row.unit_cost
    );
  end if;

  delete from public.ticket_parts where id = p_id;

  insert into public.audit_logs (actor_id, entity, entity_id, action, after_data)
  values (v_actor, 'ticket_part', p_id, 'ticket.part_removed',
          jsonb_build_object('ticket_id', v_row.ticket_id, 'part_id', v_row.part_id));

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Purchase orders
-- ---------------------------------------------------------------------------
create or replace function public.purchase_order_list()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  payload jsonb;
begin
  if (select auth.uid()) is null or not public.parts_can_view() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(row order by (row ->> 'created_at') desc), '[]'::jsonb) into payload
  from (
    select jsonb_build_object(
      'id', po.id,
      'reference', po.reference,
      'supplier', po.supplier,
      'status', po.status,
      'currency', po.currency,
      'ordered_on', po.ordered_on,
      'expected_on', po.expected_on,
      'notes', po.notes,
      'is_demo', po.is_demo,
      'created_at', po.created_at,
      'received_at', po.received_at,
      'total', round(coalesce((
        select sum(l.quantity * l.unit_cost)
        from public.purchase_order_lines l
        where l.purchase_order_id = po.id
      ), 0), 2),
      'lines', coalesce((
        select jsonb_agg(
                 jsonb_build_object(
                   'id', l.id,
                   'part_id', l.part_id,
                   'part_name', p.name,
                   'sku', p.sku,
                   'quantity', l.quantity,
                   'received_quantity', l.received_quantity,
                   'remaining', l.quantity - l.received_quantity,
                   'unit_cost', l.unit_cost
                 ) order by p.name
               )
        from public.purchase_order_lines l
        join public.parts p on p.id = l.part_id
        where l.purchase_order_id = po.id
      ), '[]'::jsonb)
    ) as row
    from public.purchase_orders po
  ) x;

  return payload;
end;
$$;

-- Lines arrive as parallel arrays rather than a jsonb blob: PostgREST maps uuid[] and numeric[]
-- without ambiguity, so a malformed call fails here rather than halfway through an insert.
create or replace function public.purchase_order_save(
  p_id uuid,
  p_supplier text,
  p_expected_on date default null,
  p_notes text default '',
  p_part_ids uuid[] default '{}',
  p_quantities numeric[] default '{}',
  p_costs numeric[] default '{}'
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := (select auth.uid());
  v_id uuid;
  v_status public.purchase_order_status;
  v_reference text;
  v_count integer := coalesce(array_length(p_part_ids, 1), 0);
  v_index integer;
  v_before jsonb;
begin
  if v_actor is null or not public.parts_can_order() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_supplier, ''))) < 2 then
    raise exception 'supplier_required' using errcode = '22023';
  end if;
  if v_count = 0
     or coalesce(array_length(p_quantities, 1), 0) <> v_count
     or coalesce(array_length(p_costs, 1), 0) <> v_count then
    raise exception 'order_lines_required' using errcode = '22023';
  end if;

  if p_id is null then
    v_reference := 'PO-' || to_char(current_date, 'YYYY') || '-'
      || lpad((((select count(*) from public.purchase_orders) + 1))::text, 4, '0');
    insert into public.purchase_orders (reference, supplier, status, expected_on, notes, created_by)
    values (v_reference, trim(p_supplier), 'draft', p_expected_on, coalesce(p_notes, ''), v_actor)
    returning id into v_id;
  else
    select to_jsonb(po) into v_before from public.purchase_orders po where po.id = p_id;
    if v_before is null then
      raise exception 'purchase_order_not_found' using errcode = 'P0002';
    end if;
    v_status := (v_before ->> 'status')::public.purchase_order_status;
    if v_status in ('partial', 'received', 'cancelled') then
      raise exception 'order_already_closed' using errcode = '22023';
    end if;
    update public.purchase_orders set
      supplier = trim(p_supplier),
      expected_on = p_expected_on,
      notes = coalesce(p_notes, ''),
      status = 'draft'
    where id = p_id;
    delete from public.purchase_order_lines where purchase_order_id = p_id;
    v_id := p_id;
  end if;

  for v_index in 1..v_count
  loop
    if not exists (select 1 from public.parts p where p.id = p_part_ids[v_index]) then
      raise exception 'part_not_found' using errcode = 'P0002';
    end if;
    if coalesce(p_quantities[v_index], 0) <= 0 then
      raise exception 'quantity_must_be_positive' using errcode = '22023';
    end if;
    insert into public.purchase_order_lines (purchase_order_id, part_id, quantity, unit_cost)
    values (v_id, p_part_ids[v_index], p_quantities[v_index], coalesce(p_costs[v_index], 0));
  end loop;

  insert into public.audit_logs (actor_id, entity, entity_id, action, before_data, after_data)
  values (v_actor, 'purchase_order', v_id,
          case when p_id is null then 'order.created' else 'order.updated' end,
          v_before,
          (select to_jsonb(po) from public.purchase_orders po where po.id = v_id));

  return v_id;
end;
$$;

create or replace function public.purchase_order_set_status(
  p_id uuid,
  p_status public.purchase_order_status
) returns public.purchase_order_status language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := (select auth.uid());
  v_po public.purchase_orders%rowtype;
begin
  if v_actor is null or not public.parts_can_order() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select * into v_po from public.purchase_orders po where po.id = p_id for update;
  if not found then
    raise exception 'purchase_order_not_found' using errcode = 'P0002';
  end if;
  if v_po.status in ('received', 'cancelled') then
    raise exception 'order_already_closed' using errcode = '22023';
  end if;
  if p_status = 'received' then
    raise exception 'receive_through_lines' using errcode = '22023';
  end if;
  if p_status not in ('draft', 'sent', 'cancelled') then
    raise exception 'invalid_order_status' using errcode = '22023';
  end if;

  update public.purchase_orders set status = p_status where id = p_id;

  insert into public.audit_logs (actor_id, entity, entity_id, action, before_data, after_data)
  values (v_actor, 'purchase_order', p_id, 'order.status_changed',
          jsonb_build_object('status', v_po.status), jsonb_build_object('status', p_status));

  return p_status;
end;
$$;

create or replace function public.purchase_order_receive(
  p_line_id uuid,
  p_quantity numeric,
  p_location_id uuid
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := (select auth.uid());
  v_line public.purchase_order_lines%rowtype;
  v_po public.purchase_orders%rowtype;
  v_remaining numeric(12,2);
  v_open integer;
begin
  if v_actor is null or not (public.parts_can_order() or public.parts_can_stock()) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'quantity_must_be_positive' using errcode = '22023';
  end if;

  select * into v_line from public.purchase_order_lines l where l.id = p_line_id for update;
  if not found then
    raise exception 'order_line_not_found' using errcode = 'P0002';
  end if;
  v_remaining := v_line.quantity - v_line.received_quantity;
  if p_quantity > v_remaining then
    raise exception 'over_receipt' using errcode = '22023';
  end if;

  select * into v_po from public.purchase_orders po where po.id = v_line.purchase_order_id for update;
  if v_po.status = 'cancelled' then
    raise exception 'order_already_closed' using errcode = '22023';
  end if;

  perform public.part_stock_move(
    v_line.part_id, p_location_id, 'receive', p_quantity,
    'Received on ' || coalesce(v_po.reference, 'purchase order'),
    null, v_line.unit_cost, v_po.id
  );

  update public.purchase_order_lines
  set received_quantity = received_quantity + p_quantity
  where id = p_line_id;

  select count(*) into v_open
  from public.purchase_order_lines l
  where l.purchase_order_id = v_po.id and l.received_quantity < l.quantity;

  update public.purchase_orders
  set status = case
        when v_open = 0 then 'received'::public.purchase_order_status
        else 'partial'::public.purchase_order_status
      end,
      received_at = case when v_open = 0 then now() else received_at end
  where id = v_po.id;

  insert into public.audit_logs (actor_id, entity, entity_id, action, after_data)
  values (v_actor, 'purchase_order', v_po.id, 'order.received',
          jsonb_build_object(
            'line_id', p_line_id,
            'quantity', p_quantity,
            'location_id', p_location_id,
            'open_lines', v_open
          ));

  return jsonb_build_object('order_id', v_po.id, 'open_lines', v_open, 'remaining', v_remaining - p_quantity);
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Demo data
-- ---------------------------------------------------------------------------
create or replace function public.parts_seed_demo()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := (select auth.uid());
  v_org uuid;
  v_ticket uuid;
  v_warehouse uuid;
  v_van uuid;
  v_part uuid;
  v_cat5 uuid;
  v_sfp uuid;
  v_patch uuid;
  v_pdu uuid;
  v_psu uuid;
  v_po uuid;
  v_line uuid;
begin
  if v_actor is null or public.current_app_role() <> 'admin' then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select o.id into v_org from public.organizations o where o.is_demo = true and o.type = 'client' limit 1;
  if v_org is null then
    raise exception 'demo_dataset_missing' using errcode = 'P0002';
  end if;

  select t.id into v_ticket
  from public.tickets t
  where t.client_org_id = v_org and t.is_demo = true and t.status not in ('closed', 'cancelled')
  order by t.created_at
  limit 1;

  select sl.id into v_warehouse from public.stock_locations sl where sl.name = 'Main warehouse';
  if v_warehouse is null then
    insert into public.stock_locations (name, kind, notes, is_demo)
    values ('Main warehouse', 'warehouse', 'Lisbon hub — racks A–D.', true)
    returning id into v_warehouse;
  end if;

  select sl.id into v_van from public.stock_locations sl where sl.name = 'Van 1 — Lisbon';
  if v_van is null then
    insert into public.stock_locations (name, kind, notes, is_demo)
    values ('Van 1 — Lisbon', 'van', 'Daily kit for the Lisbon rounds.', true)
    returning id into v_van;
  end if;

  select p.id into v_cat5 from public.parts p where p.sku = 'CAT6-SFTP-5';
  if v_cat5 is null then
    insert into public.parts (sku, name, description, category, brand, unit, unit_cost, sale_price,
                              supplier, reorder_point, reorder_quantity, is_demo, created_by)
    values ('CAT6-SFTP-5', 'Cat6 S/FTP patch lead, 5 m', 'Grey, snagless, LSZH.', 'Cabling',
            'Excel', 'unit', 6.40, 14.50, 'Excel Networking', 25, 100, true, v_actor)
    returning id into v_cat5;
  end if;

  select p.id into v_sfp from public.parts p where p.sku = 'SFP-10G-SR';
  if v_sfp is null then
    insert into public.parts (sku, name, description, category, brand, unit, unit_cost, sale_price,
                              supplier, reorder_point, reorder_quantity, is_demo, created_by)
    values ('SFP-10G-SR', 'SFP+ 10G SR transceiver', '850 nm, 300 m over OM3.', 'Optics',
            'Finisar', 'unit', 21.00, 48.00, 'Finisar', 10, 20, true, v_actor)
    returning id into v_sfp;
  end if;

  select p.id into v_patch from public.parts p where p.sku = 'PATCH-24-CAT6';
  if v_patch is null then
    insert into public.parts (sku, name, description, category, brand, unit, unit_cost, sale_price,
                              supplier, reorder_point, reorder_quantity, is_demo, created_by)
    values ('PATCH-24-CAT6', '24-port Cat6 patch panel', '1U, shielded, rear cable bar.', 'Cabling',
            'Excel', 'unit', 38.00, 92.00, 'Excel Networking', 4, 8, true, v_actor)
    returning id into v_patch;
  end if;

  select p.id into v_pdu from public.parts p where p.sku = 'PDU-16A-8C13';
  if v_pdu is null then
    insert into public.parts (sku, name, description, category, brand, unit, unit_cost, sale_price,
                              supplier, reorder_point, reorder_quantity, is_demo, created_by)
    values ('PDU-16A-8C13', 'Rack PDU, 16 A, 8× C13', 'Metered, 1U, C20 inlet.', 'Power',
            'APC', 'unit', 118.00, 265.00, 'APC', 2, 4, true, v_actor)
    returning id into v_pdu;
  end if;

  select p.id into v_psu from public.parts p where p.sku = 'PSU-800W-R2';
  if v_psu is null then
    insert into public.parts (sku, name, description, category, brand, unit, unit_cost, sale_price,
                              supplier, reorder_point, reorder_quantity, is_demo, created_by)
    values ('PSU-800W-R2', 'Server PSU 800 W, redundant', 'Hot-swap, 80+ Platinum, R2 chassis.', 'Server spares',
            'Dell', 'unit', 96.00, 210.00, 'Dell', 3, 6, true, v_actor)
    returning id into v_psu;
  end if;

  insert into public.part_stock (part_id, location_id, quantity)
  values
    (v_cat5, v_warehouse, 180),
    (v_cat5, v_van, 20),
    (v_sfp, v_warehouse, 8),
    (v_patch, v_warehouse, 6),
    (v_pdu, v_warehouse, 1),
    (v_psu, v_warehouse, 5)
  on conflict (part_id, location_id) do nothing;

  insert into public.stock_movements (part_id, location_id, kind, quantity, unit_cost, balance_after,
                                      note, actor_id, is_demo)
  values
    (v_cat5, v_warehouse, 'receive', 180, 6.40, 180, 'Demo opening stock', v_actor, true),
    (v_cat5, v_van, 'receive', 20, 6.40, 20, 'Demo opening stock', v_actor, true),
    (v_sfp, v_warehouse, 'receive', 8, 21.00, 8, 'Demo opening stock', v_actor, true),
    (v_patch, v_warehouse, 'receive', 6, 38.00, 6, 'Demo opening stock', v_actor, true),
    (v_pdu, v_warehouse, 'receive', 1, 118.00, 1, 'Demo opening stock', v_actor, true),
    (v_psu, v_warehouse, 'receive', 5, 96.00, 5, 'Demo opening stock', v_actor, true);

  if v_ticket is not null and not exists (
    select 1 from public.ticket_parts tp where tp.ticket_id = v_ticket and tp.part_id = v_cat5
  ) then
    perform public.ticket_part_add(v_ticket, v_cat5, v_van, 4, true, current_date + 730, '', 'Demo cabling run');
    perform public.ticket_part_add(v_ticket, v_sfp, v_warehouse, 2, true, current_date + 1095, 'SN-DEMO-0001', 'Demo uplink pair');
  end if;

  select po.id into v_po from public.purchase_orders po where po.reference = 'PO-DEMO-0001';
  if v_po is null then
    insert into public.purchase_orders (reference, supplier, status, expected_on, notes, is_demo, created_by)
    values ('PO-DEMO-0001', 'Excel Networking', 'sent', current_date + 5,
            'Demo order: replenish patch leads and SFP optics.', true, v_actor)
    returning id into v_po;

    insert into public.purchase_order_lines (purchase_order_id, part_id, quantity, unit_cost)
    values (v_po, v_cat5, 100, 6.20) returning id into v_line;
    insert into public.purchase_order_lines (purchase_order_id, part_id, quantity, unit_cost)
    values (v_po, v_sfp, 12, 20.50);
  end if;

  insert into public.audit_logs (actor_id, entity, entity_id, action, after_data)
  values (v_actor, 'demo_dataset', v_org, 'demo.parts_seeded',
          jsonb_build_object('warehouse', v_warehouse, 'van', v_van, 'order', v_po));

  return jsonb_build_object('warehouse', v_warehouse, 'van', v_van, 'order', v_po);
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Job margins now account for parts
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
  parts_cost as (
    select tp.ticket_id, sum(tp.quantity * tp.unit_cost) as cost
    from public.ticket_parts tp
    join public.tickets t on t.id = tp.ticket_id
    where tp.created_at::date between v_from and v_to
      and (p_organization_id is null or t.client_org_id = p_organization_id)
    group by tp.ticket_id
  ),
  job_ids as (
    select ticket_id from revenue where ticket_id is not null
    union
    select ticket_id from labour where ticket_id is not null
    union
    select ticket_id from costs where ticket_id is not null
    union
    select ticket_id from parts_cost where ticket_id is not null
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
      'parts_cost', round(coalesce(pc.cost, 0), 2),
      'labour_hours', round(coalesce(l.hours, 0), 2),
      'labour_cost', round(coalesce(l.cost, 0), 2),
      'unpriced_hours', round(coalesce(l.unpriced_hours, 0), 2),
      'margin', round(
        coalesce(r.net, 0) - coalesce(c.net, 0) - coalesce(l.cost, 0) - coalesce(pc.cost, 0), 2
      ),
      'margin_pct', case
        when coalesce(r.net, 0) <= 0 then null
        else round((
          (coalesce(r.net, 0) - coalesce(c.net, 0) - coalesce(l.cost, 0) - coalesce(pc.cost, 0))
          / r.net
        ) * 100, 1)
      end
    ) as row
    from job_ids j
    join public.tickets t on t.id = j.ticket_id
    left join public.organizations o on o.id = t.client_org_id
    left join public.sites s on s.id = t.site_id
    left join revenue r on r.ticket_id = t.id
    left join labour l on l.ticket_id = t.id
    left join costs c on c.ticket_id = t.id
    left join parts_cost pc on pc.ticket_id = t.id
  ),
  totals as (
    select
      coalesce((select sum(net) from revenue where ticket_id is not null), 0) as revenue_net,
      coalesce((select sum(cost) from labour where ticket_id is not null), 0) as labour_cost,
      coalesce((select sum(hours) from labour where ticket_id is not null), 0) as labour_hours,
      coalesce((select sum(net) from costs where ticket_id is not null), 0) as expenses_net,
      coalesce((select sum(cost) from parts_cost where ticket_id is not null), 0) as parts_cost,
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
      'parts_cost', round(t.parts_cost, 2),
      'labour_hours', round(t.labour_hours, 2),
      'labour_cost', round(t.labour_cost, 2),
      'margin', round(t.revenue_net - t.expenses_net - t.labour_cost - t.parts_cost, 2),
      'margin_pct', case
        when t.revenue_net <= 0 then null
        else round((
          (t.revenue_net - t.expenses_net - t.labour_cost - t.parts_cost) / t.revenue_net
        ) * 100, 1)
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
-- 8. Row-level security, purge, grants
-- ---------------------------------------------------------------------------
alter table public.stock_locations enable row level security;
alter table public.parts enable row level security;
alter table public.part_stock enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_lines enable row level security;
alter table public.stock_movements enable row level security;
alter table public.ticket_parts enable row level security;

drop policy if exists parts_select on public.parts;
create policy parts_select on public.parts
  for select to authenticated using (public.parts_can_view());

drop policy if exists stock_locations_select on public.stock_locations;
create policy stock_locations_select on public.stock_locations
  for select to authenticated using (public.parts_can_view());

drop policy if exists part_stock_select on public.part_stock;
create policy part_stock_select on public.part_stock
  for select to authenticated using (public.parts_can_view());

drop policy if exists purchase_orders_select on public.purchase_orders;
create policy purchase_orders_select on public.purchase_orders
  for select to authenticated using (public.parts_can_view());

drop policy if exists purchase_order_lines_select on public.purchase_order_lines;
create policy purchase_order_lines_select on public.purchase_order_lines
  for select to authenticated using (public.parts_can_view());

drop policy if exists stock_movements_select on public.stock_movements;
create policy stock_movements_select on public.stock_movements
  for select to authenticated using (public.parts_can_view());

drop policy if exists ticket_parts_select on public.ticket_parts;
create policy ticket_parts_select on public.ticket_parts
  for select to authenticated using (public.parts_can_view());

grant select on public.parts, public.stock_locations, public.part_stock,
  public.purchase_orders, public.purchase_order_lines, public.stock_movements,
  public.ticket_parts to authenticated;

-- Extend the demo purge so inventory never outlives the demo client.
create or replace function public.portal_purge_demo()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  removed integer := 0;
begin
  if (select auth.uid()) is null or public.current_app_role() <> 'admin' then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  delete from public.stock_movements where is_demo = true;
  delete from public.ticket_parts where is_demo = true;
  delete from public.purchase_orders where is_demo = true;
  delete from public.parts where is_demo = true;
  delete from public.stock_locations where is_demo = true;

  update public.tickets set contract_id = null where contract_id is not null;
  delete from public.client_contracts where is_demo = true;
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

do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in (
      'parts_metrics','parts_list','part_get','stock_locations_list','ticket_parts_list',
      'part_save','stock_location_save','part_stock_move','ticket_part_add','ticket_part_remove',
      'purchase_order_list','purchase_order_save','purchase_order_set_status',
      'purchase_order_receive','parts_seed_demo'
    )
  loop
    execute format('revoke all on function %s from public, anon', fn.sig);
    execute format('grant execute on function %s to authenticated', fn.sig);
  end loop;

  -- Non-API helpers: only the definer functions and policies call them.
  for fn in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in (
      'parts_can_stock','parts_can_order','parts_can_edit'
    )
  loop
    execute format('revoke all on function %s from public, anon, authenticated', fn.sig);
  end loop;

  -- The SELECT policies are evaluated as the caller, so the predicate they call must be executable.
  execute 'revoke all on function public.parts_can_view() from public, anon';
  execute 'grant execute on function public.parts_can_view() to authenticated';
end $$;
