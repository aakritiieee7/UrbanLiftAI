-- Add missing vehicle_types column to carrier_profiles table
ALTER TABLE public.carrier_profiles 
ADD COLUMN vehicle_types text;