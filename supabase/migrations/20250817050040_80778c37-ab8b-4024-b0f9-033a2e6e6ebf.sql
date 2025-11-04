-- Add missing gstin column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS gstin TEXT;