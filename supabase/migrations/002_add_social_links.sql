-- Add social links to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS instagram_handle text;
