-- Enable required extension for UUID generation
create extension if not exists pgcrypto;

-- Shipments table (acts as global "transits")
create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  shipper_id uuid not null,
  carrier_id uuid,
  origin text not null,
  destination text not null,
  capacity_kg integer,
  pickup_time timestamp with time zone,
  dropoff_time timestamp with time zone,
  status text not null default 'pending' check (status in ('pending','assigned','in_transit','delivered','cancelled')),
  pooled boolean not null default false,
  pool_id uuid,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Indexes for common filters
create index if not exists idx_shipments_shipper on public.shipments (shipper_id);
create index if not exists idx_shipments_carrier on public.shipments (carrier_id);
create index if not exists idx_shipments_status on public.shipments (status);
create index if not exists idx_shipments_created on public.shipments (created_at desc);

-- RLS: Everyone can view, users can insert/update their own
alter table public.shipments enable row level security;

do $$ begin
  create policy "Shipments are viewable by everyone"
  on public.shipments for select using (true);
exception when duplicate_object then null; end $$;

-- Insert: only the authenticated shipper can create their shipments
-- Update: shipper or assigned carrier can update

do $$ begin
  create policy "Users can create their own shipments"
  on public.shipments for insert
  with check (auth.uid() = shipper_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Shipper or carrier can update shipments"
  on public.shipments for update
  using (auth.uid() = shipper_id or auth.uid() = carrier_id);
exception when duplicate_object then null; end $$;

-- updated_at trigger
create trigger trg_shipments_updated_at
before update on public.shipments
for each row execute function public.update_updated_at_column();

-- Points balances (for Leaderboard)
create table if not exists public.points_balances (
  user_id uuid primary key,
  points integer not null default 0,
  updated_at timestamp with time zone not null default now()
);

alter table public.points_balances enable row level security;

do $$ begin
  create policy "Leaderboard viewable by everyone"
  on public.points_balances for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can manage their own balance"
  on public.points_balances for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- updated_at trigger
create trigger trg_points_balances_updated_at
before update on public.points_balances
for each row execute function public.update_updated_at_column();

-- Award points function
create or replace function public.award_points(
  _user_id uuid,
  _points int,
  _source text default 'manual'
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Upsert balance
  insert into public.points_balances as pb (user_id, points)
  values (_user_id, _points)
  on conflict (user_id)
  do update set points = pb.points + excluded.points, updated_at = now();
end;
$$;

-- Helper: mark shipment as pooled + delivered and award points
create or replace function public.mark_pooled_and_delivered(
  _shipment_id uuid,
  _user_id uuid
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  pts int := 0;
  can_update boolean;
  s record;
begin
  -- Check ownership: shipper or carrier
  select (auth.uid() = shipper_id or auth.uid() = carrier_id) into can_update
  from public.shipments where id = _shipment_id;

  if not coalesce(can_update, false) then
    raise exception 'not authorized';
  end if;

  -- Update shipment
  update public.shipments
  set status = 'delivered', pooled = true
  where id = _shipment_id;

  -- Simple frequency-based points: base 5 + 2 per pooled delivery in last 30 days (capped at +25)
  select count(*) from public.shipments
  where (shipper_id = _user_id or carrier_id = _user_id)
    and pooled = true and status = 'delivered'
    and created_at >= now() - interval '30 days'
  into pts;

  pts := 5 + least(25, 2 * pts);

  perform public.award_points(_user_id, pts, 'pooled_delivery');
  return pts;
end;
$$;

-- Seed some dummy data (ids are random; visible to everyone)
insert into public.shipments (shipper_id, carrier_id, origin, destination, status, pooled, capacity_kg, pickup_time, dropoff_time)
values
  (gen_random_uuid(), null, '28.6139,77.2090', '28.7041,77.1025', 'pending', false, 200, now() + interval '2 hours', now() + interval '6 hours'),
  (gen_random_uuid(), gen_random_uuid(), '19.0760,72.8777', '18.5204,73.8567', 'assigned', false, 500, now() + interval '1 hour', now() + interval '5 hours'),
  (gen_random_uuid(), gen_random_uuid(), '13.0827,80.2707', '12.9716,77.5946', 'delivered', true, 300, now() - interval '1 day', now() - interval '20 hours'),
  (gen_random_uuid(), null, '22.5726,88.3639', '26.8467,80.9462', 'pending', false, 150, now() + interval '3 hours', now() + interval '9 hours'),
  (gen_random_uuid(), gen_random_uuid(), '28.4595,77.0266', '27.1767,78.0081', 'delivered', true, 400, now() - interval '2 days', now() - interval '1 days'),
  (gen_random_uuid(), null, '23.2599,77.4126', '25.4358,81.8463', 'pending', false, 100, now() + interval '4 hours', now() + interval '10 hours')
  on conflict do nothing;

-- Seed some dummy points
insert into public.points_balances (user_id, points)
values
  (gen_random_uuid(), 35),
  (gen_random_uuid(), 22),
  (gen_random_uuid(), 15)
  on conflict (user_id) do nothing;
