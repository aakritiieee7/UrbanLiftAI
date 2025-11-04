-- Create profiles table to support login flow and profile setup
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  role text check (role in ('shipper','carrier')),
  username text,
  auth_email text,
  -- Shipper fields
  business_name text,
  gstin text,
  business_model text,
  specialties text,
  address text,
  website text,
  -- Carrier fields
  company_name text,
  service_regions text,
  vehicle_types text,
  years_experience int,
  licenses text,
  -- Shared contact
  contact_email text,
  contact_phone text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Security definer function for timestamp updates
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.update_updated_at_column();

-- Policies
-- Allow anyone to view non-sensitive profile display info (needed for leaderboard and public pages)
create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

-- Allow users to insert their own profile
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = user_id);

-- Allow users to update their own profile
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = user_id);
