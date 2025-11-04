-- Ensure profiles table exists
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

-- Recreate RLS policies (idempotent)
drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Users can delete their own profile" on public.profiles;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = user_id);

create policy "Users can delete their own profile"
  on public.profiles for delete
  using (auth.uid() = user_id);

-- Recreate trigger for updated_at
drop trigger if exists update_profiles_updated_at on public.profiles;
create trigger update_profiles_updated_at
before update on public.profiles
for each row execute function public.update_updated_at_column();

-- Create a public storage bucket for user documents
insert into storage.buckets (id, name, public)
values ('user-files', 'user-files', true)
on conflict (id) do nothing;

-- Recreate Storage RLS policies for bucket 'user-files'
drop policy if exists "Public can view user-files" on storage.objects;
drop policy if exists "Users can upload to their folder (user-files)" on storage.objects;
drop policy if exists "Users can update their files (user-files)" on storage.objects;
drop policy if exists "Users can delete their files (user-files)" on storage.objects;

create policy "Public can view user-files"
  on storage.objects for select
  using (bucket_id = 'user-files');

create policy "Users can upload to their folder (user-files)"
  on storage.objects for insert
  with check (
    bucket_id = 'user-files'
    and auth.role() = 'authenticated'
    and auth.uid()::text = (storage.foldername(name))[2]
  );

create policy "Users can update their files (user-files)"
  on storage.objects for update
  using (
    bucket_id = 'user-files'
    and auth.uid()::text = (storage.foldername(name))[2]
  );

create policy "Users can delete their files (user-files)"
  on storage.objects for delete
  using (
    bucket_id = 'user-files'
    and auth.uid()::text = (storage.foldername(name))[2]
  );