-- Fix licenses column type mismatch - change from ARRAY to text
ALTER TABLE public.carrier_profiles 
ALTER COLUMN licenses TYPE text;