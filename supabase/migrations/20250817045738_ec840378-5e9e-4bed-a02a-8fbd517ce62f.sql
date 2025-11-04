-- Add missing business_model column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS business_model TEXT;