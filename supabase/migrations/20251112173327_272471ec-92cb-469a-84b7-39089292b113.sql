-- Create function to update member count
CREATE OR REPLACE FUNCTION update_society_member_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE societies 
    SET member_count = member_count + 1 
    WHERE id = NEW.society_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE societies 
    SET member_count = member_count - 1 
    WHERE id = OLD.society_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS increment_member_count ON society_members;
DROP TRIGGER IF EXISTS decrement_member_count ON society_members;

-- Create trigger for INSERT
CREATE TRIGGER increment_member_count
AFTER INSERT ON society_members
FOR EACH ROW
EXECUTE FUNCTION update_society_member_count();

-- Create trigger for DELETE
CREATE TRIGGER decrement_member_count
AFTER DELETE ON society_members
FOR EACH ROW
EXECUTE FUNCTION update_society_member_count();

-- Initialize member_count for existing societies
UPDATE societies s
SET member_count = (
  SELECT COUNT(*)
  FROM society_members sm
  WHERE sm.society_id = s.id
);