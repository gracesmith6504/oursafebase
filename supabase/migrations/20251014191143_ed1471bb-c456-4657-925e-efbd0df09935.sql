-- Add phone number to profiles table for welfare contacts
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS phone_number text;