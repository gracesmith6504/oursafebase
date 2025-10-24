-- Clean up duplicate Code of Conduct entries and prevent future duplicates

-- Step 1: Mark all event CoCs as inactive first
UPDATE code_of_conduct
SET is_active = false
WHERE event_id IS NOT NULL;

-- Step 2: For each event, set only the most recent CoC as active
WITH latest_cocs AS (
  SELECT DISTINCT ON (event_id)
    id,
    event_id
  FROM code_of_conduct
  WHERE event_id IS NOT NULL
  ORDER BY event_id, created_at DESC
)
UPDATE code_of_conduct
SET is_active = true
WHERE id IN (SELECT id FROM latest_cocs);

-- Step 3: Delete exact duplicates (same event_id, content, file_url, version)
DELETE FROM code_of_conduct a
USING code_of_conduct b
WHERE a.id < b.id
  AND a.event_id = b.event_id
  AND a.event_id IS NOT NULL
  AND COALESCE(a.content, '') = COALESCE(b.content, '')
  AND COALESCE(a.file_url, '') = COALESCE(b.file_url, '')
  AND a.version = b.version;

-- Step 4: Create unique partial index to prevent future duplicate active CoCs per event
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_coc_per_event 
ON code_of_conduct (event_id) 
WHERE is_active = true AND event_id IS NOT NULL;

-- Step 5: Create function to enforce single active CoC per event
CREATE OR REPLACE FUNCTION enforce_single_active_event_coc()
RETURNS TRIGGER AS $$
BEGIN
  -- If inserting/updating to active, deactivate others
  IF NEW.is_active = true AND NEW.event_id IS NOT NULL THEN
    UPDATE code_of_conduct
    SET is_active = false
    WHERE event_id = NEW.event_id
      AND id != NEW.id
      AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Step 6: Create trigger for automatic enforcement
DROP TRIGGER IF EXISTS trg_single_active_event_coc ON code_of_conduct;
CREATE TRIGGER trg_single_active_event_coc
BEFORE INSERT OR UPDATE ON code_of_conduct
FOR EACH ROW
EXECUTE FUNCTION enforce_single_active_event_coc();