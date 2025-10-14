-- Drop old welfare_contacts table
drop table if exists public.welfare_contacts cascade;

-- Create new simplified event_contacts table
create table public.event_contacts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  
  -- For society member contacts
  user_id uuid references auth.users(id) on delete cascade,
  
  -- For external contacts
  external_name text,
  external_phone text,
  
  -- Common fields
  role text not null,
  display_order integer default 0,
  created_at timestamp with time zone default now(),
  
  -- Constraint: must be either a user_id OR external contact (not both, not neither)
  constraint contact_type_check check (
    (user_id is not null and external_name is null and external_phone is null) or
    (user_id is null and external_name is not null and external_phone is not null)
  )
);

-- Enable RLS
alter table public.event_contacts enable row level security;

-- RLS Policies
create policy "Anyone can view event contacts"
  on event_contacts for select
  using (true);

create policy "Society members can manage event contacts"
  on event_contacts for all
  using (
    exists (
      select 1 from events e
      join society_members sm on sm.society_id = e.society_id
      where e.id = event_contacts.event_id
      and sm.user_id = auth.uid()
    )
  );

-- Index for performance
create index idx_event_contacts_event_id on event_contacts(event_id);
create index idx_event_contacts_user_id on event_contacts(user_id) where user_id is not null;