-- Add new columns to societies table
ALTER TABLE societies 
ADD COLUMN creator_email text NULL,
ADD COLUMN is_verified boolean NOT NULL DEFAULT false;

-- Add indexes for faster lookups
CREATE INDEX idx_societies_creator_email ON societies(creator_email);
CREATE INDEX idx_societies_is_verified ON societies(is_verified) WHERE is_verified = true;

-- Add comments for documentation
COMMENT ON COLUMN societies.creator_email IS 'Email of the user who created this society. Nullable for backward compatibility with existing societies.';
COMMENT ON COLUMN societies.is_verified IS 'Indicates if this society has been verified by an admin.';

-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policy: Users can view their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- RLS policy: Only admins can insert/update/delete roles
CREATE POLICY "Only admins can manage roles"
ON public.user_roles
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Create helper function to check if user is society creator
CREATE OR REPLACE FUNCTION public.is_society_creator(_user_id uuid, _society_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.societies s
    JOIN auth.users u ON u.email = s.creator_email
    WHERE s.id = _society_id
      AND u.id = _user_id
      AND s.creator_email IS NOT NULL
  )
$$;

-- Drop existing update policy for societies
DROP POLICY IF EXISTS "Committee members can update their society" ON societies;

-- New policy: Creators and committee can update societies (but not is_verified)
CREATE POLICY "Creators and committee can update societies"
ON societies
FOR UPDATE
USING (
  is_committee_member(auth.uid(), id)
)
WITH CHECK (
  -- Creators can update everything except is_verified
  (is_society_creator(auth.uid(), id) AND is_verified = (SELECT is_verified FROM societies WHERE id = societies.id))
  OR
  -- Committee can only update name and slug (not creator_email or is_verified)
  (is_committee_member(auth.uid(), id) 
   AND creator_email = (SELECT creator_email FROM societies WHERE id = societies.id)
   AND is_verified = (SELECT is_verified FROM societies WHERE id = societies.id))
);

-- Policy for admins to update is_verified
CREATE POLICY "Admins can verify societies"
ON societies
FOR UPDATE
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Drop existing delete policy for society_members
DROP POLICY IF EXISTS "Users can delete their own memberships" ON society_members;

-- New policy: Creators can remove any member OR users can leave themselves
CREATE POLICY "Creators can remove members or users can leave"
ON society_members
FOR DELETE
USING (
  is_society_creator(auth.uid(), society_id)
  OR
  (auth.uid() = user_id)
);