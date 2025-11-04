-- Add missing contact_phone column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS contact_phone TEXT;