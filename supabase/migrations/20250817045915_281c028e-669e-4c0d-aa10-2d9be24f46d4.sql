-- Add missing contact_email column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS contact_email TEXT;