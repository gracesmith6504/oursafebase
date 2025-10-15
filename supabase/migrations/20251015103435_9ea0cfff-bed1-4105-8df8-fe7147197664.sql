-- Add snapshot fields for public display
alter table event_contacts 
  add column if not exists contact_name text,
  add column if not exists contact_phone text;

-- Backfill contact_name and contact_phone from profiles for existing member contacts
update event_contacts ec
set 
  contact_name = p.display_name,
  contact_phone = p.phone_number
from profiles p
where ec.user_id = p.id
  and ec.user_id is not null
  and ec.contact_name is null;

-- Backfill contact_name and contact_phone from external fields for external contacts
update event_contacts
set 
  contact_name = external_name,
  contact_phone = external_phone
where user_id is null
  and external_name is not null
  and contact_name is null;

-- Create index for performance (if not exists)
create index if not exists idx_event_contacts_user_id on event_contacts(user_id) where user_id is not null;

-- Add helpful comments
comment on column event_contacts.contact_name is 'Snapshot of contact name for public display (avoids RLS issues)';
comment on column event_contacts.contact_phone is 'Snapshot of contact phone for public display (avoids RLS issues)';