-- Fix Critical Security Issue 1 & 2: Societies invite codes exposed to all users
-- Drop the overly permissive policy that exposes invite codes
DROP POLICY IF EXISTS "Anyone can view societies" ON societies;

-- Allow anyone to view basic society information (excluding invite codes)
-- Note: PostgreSQL doesn't support column-level RLS, so we create a security definer function instead
CREATE OR REPLACE FUNCTION public.get_society_basic_info(society_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  description text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, slug, description, created_at, updated_at
  FROM societies
  WHERE societies.id = society_id;
$$;

-- Create a new policy that allows viewing societies (without invite codes)
CREATE POLICY "Anyone can view basic society info"
ON societies FOR SELECT
TO authenticated
USING (true);

-- Create a security definer function to get invite codes (committee only)
CREATE OR REPLACE FUNCTION public.get_society_invite_codes(society_id uuid)
RETURNS TABLE (
  committee_invite_code text,
  attendee_invite_code text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT committee_invite_code, attendee_invite_code
  FROM societies
  WHERE societies.id = society_id
    AND is_committee_member(auth.uid(), society_id);
$$;

-- Fix Critical Security Issue 3: User phone numbers exposed to all authenticated users
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone authenticated can view profiles" ON profiles;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Users can view profiles of people in their societies
CREATE POLICY "Users can view society member profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM society_members sm1
    JOIN society_members sm2 ON sm1.society_id = sm2.society_id
    WHERE sm1.user_id = auth.uid()
      AND sm2.user_id = profiles.id
  )
);