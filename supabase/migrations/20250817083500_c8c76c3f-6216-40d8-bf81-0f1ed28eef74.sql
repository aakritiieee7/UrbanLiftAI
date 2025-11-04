-- Rename profiles table to shipper_profiles
ALTER TABLE public.profiles RENAME TO shipper_profiles;

-- Create carrier_profiles table with carrier-specific columns
CREATE TABLE public.carrier_profiles (
  user_id UUID NOT NULL PRIMARY KEY,
  business_name TEXT,
  company_name TEXT,
  role TEXT NOT NULL DEFAULT 'carrier',
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  city TEXT,
  state TEXT,
  zip_code TEXT,
  username TEXT,
  auth_email TEXT,
  business_model TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  gstin TEXT,
  specialties TEXT,
  website TEXT,
  -- Carrier-specific columns
  vehicle_type TEXT,
  vehicle_capacity_kg NUMERIC,
  licenses TEXT[],
  insurance_number TEXT,
  years_experience INTEGER,
  service_areas TEXT[]
);

-- Enable RLS on carrier_profiles
ALTER TABLE public.carrier_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for carrier_profiles
CREATE POLICY "Users can insert their own carrier profile" 
ON public.carrier_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own carrier profile" 
ON public.carrier_profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view all carrier profiles" 
ON public.carrier_profiles 
FOR SELECT 
USING (true);

CREATE POLICY "Users can view their own carrier profile" 
ON public.carrier_profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Add trigger for carrier_profiles updated_at
CREATE TRIGGER update_carrier_profiles_updated_at
BEFORE UPDATE ON public.carrier_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update get_user_role function to check both tables
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
AS $function$
  SELECT 
    CASE 
      WHEN EXISTS (SELECT 1 FROM public.shipper_profiles WHERE user_id = user_uuid) THEN 'shipper'
      WHEN EXISTS (SELECT 1 FROM public.carrier_profiles WHERE user_id = user_uuid) THEN 'carrier'
      ELSE NULL
    END;
$function$;