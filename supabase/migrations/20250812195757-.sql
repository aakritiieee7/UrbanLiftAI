-- Create profiles table for shipper/carrier details
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text,
  -- Shipper fields
  business_name text,
  gstin text,
  business_model text,
  specialties text,
  contact_email text,
  contact_phone text,
  address text,
  website text,
  -- Carrier fields
  company_name text,
  service_regions text,
  vehicle_types text,
  years_experience integer,
  licenses text,
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- RLS policies: users can manage only their profile
create policy if not exists "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy if not exists "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = user_id);

create policy if not exists "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = user_id);

create policy if not exists "Users can delete their own profile"
  on public.profiles for delete
  using (auth.uid() = user_id);

-- Trigger to auto-update updated_at
create trigger if not exists update_profiles_updated_at
before update on public.profiles
for each row execute function public.update_updated_at_column();

-- Create a public storage bucket for user documents
insert into storage.buckets (id, name, public)
values ('user-files', 'user-files', true)
on conflict (id) do nothing;

-- Storage RLS policies for bucket 'user-files'
create policy if not exists "Public can view user-files"
  on storage.objects for select
  using (bucket_id = 'user-files');

create policy if not exists "Users can upload to their folder (user-files)"
  on storage.objects for insert
  with check (
    bucket_id = 'user-files'
    and auth.role() = 'authenticated'
    and auth.uid()::text = (storage.foldername(name))[2]
  );

create policy if not exists "Users can update their files (user-files)"
  on storage.objects for update
  using (
    bucket_id = 'user-files'
    and auth.uid()::text = (storage.foldername(name))[2]
  );

create policy if not exists "Users can delete their files (user-files)"
  on storage.objects for delete
  using (
    bucket_id = 'user-files'
    and auth.uid()::text = (storage.foldername(name))[2]
  );