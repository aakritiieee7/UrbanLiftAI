-- Add service_regions column to carrier_profiles table
ALTER TABLE public.carrier_profiles 
ADD COLUMN service_regions text;