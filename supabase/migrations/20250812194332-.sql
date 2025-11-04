-- Create enum for user roles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('shipper', 'carrier');
  END IF;
END$$;

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id uuid PRIMARY KEY,
  role public.user_role NOT NULL,
  -- Shipper fields
  business_name text,
  gstin text,
  business_model text,
  specialties text,
  address text,
  website text,
  -- Shared contact fields
  contact_email text,
  contact_phone text,
  -- Carrier fields
  company_name text,
  service_regions text,
  vehicle_types text,
  years_experience integer,
  licenses text,
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running to avoid duplicates
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'Users can view their own profile' AND tablename = 'profiles') THEN
    DROP POLICY "Users can view their own profile" ON public.profiles;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'Users can insert their own profile' AND tablename = 'profiles') THEN
    DROP POLICY "Users can insert their own profile" ON public.profiles;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'Users can update their own profile' AND tablename = 'profiles') THEN
    DROP POLICY "Users can update their own profile" ON public.profiles;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'Users can delete their own profile' AND tablename = 'profiles') THEN
    DROP POLICY "Users can delete their own profile" ON public.profiles;
  END IF;
END$$;

-- Policies
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile"
ON public.profiles
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger to keep updated_at current
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_profiles_updated_at'
  ) THEN
    CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END$$;