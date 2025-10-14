-- Create profiles table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamp with time zone default now()
);

-- Trigger to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'display_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to generate invite codes
create or replace function generate_invite_code()
returns text
language plpgsql
as $$
declare
  chars text := 'abcdefghijklmnopqrstuvwxyz0123456789';
  result text := '';
  i integer;
begin
  for i in 1..8 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  end loop;
  return result;
end;
$$;

-- Create societies table
create table public.societies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  invite_code text unique not null default generate_invite_code(),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create society members table (no roles)
create table public.society_members (
  id uuid primary key default gen_random_uuid(),
  society_id uuid references public.societies(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  joined_at timestamp with time zone default now(),
  unique(society_id, user_id)
);

-- Create events table
create table public.events (
  id uuid primary key default gen_random_uuid(),
  society_id uuid references public.societies(id) on delete cascade not null,
  title text not null,
  slug text not null,
  description text,
  event_date timestamp with time zone not null,
  location text,
  created_by uuid references public.profiles(id),
  status text default 'upcoming',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(society_id, slug)
);

-- Create welfare contacts table
create table public.welfare_contacts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  display_order integer default 0,
  contact_info text,
  created_at timestamp with time zone default now()
);

-- Create emergency info table
create table public.emergency_info (
  id uuid primary key default gen_random_uuid(),
  event_id uuid unique references public.events(id) on delete cascade not null,
  nearest_hospital text,
  hospital_address text,
  hospital_phone text,
  nearest_pharmacy text,
  pharmacy_address text,
  pharmacy_phone text,
  on_duty_contact text,
  on_duty_phone text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create code of conduct table
create table public.code_of_conduct (
  id uuid primary key default gen_random_uuid(),
  society_id uuid references public.societies(id) on delete cascade not null,
  content text not null,
  version integer default 1,
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

-- Create code acceptances table (public write)
create table public.code_acceptances (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade not null,
  code_of_conduct_id uuid references public.code_of_conduct(id),
  accepted_at timestamp with time zone default now(),
  ip_address text,
  user_agent text
);

-- Create reports table (public write, anonymous ok)
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade not null,
  reporter_name text,
  reporter_email text,
  is_anonymous boolean default true,
  concern_type text not null,
  description text not null,
  severity text default 'medium',
  status text default 'new',
  submitted_at timestamp with time zone default now(),
  resolved_at timestamp with time zone,
  notes text
);

-- Create event feedback table (public write, anonymous ok)
create table public.event_feedback (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade not null,
  felt_safe text not null,
  improvements text,
  contact_name text,
  contact_email text,
  is_anonymous boolean default true,
  submitted_at timestamp with time zone default now()
);

-- Create safety page views table (public write)
create table public.safety_page_views (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade not null,
  viewed_at timestamp with time zone default now(),
  ip_address text,
  user_agent text
);

-- RLS Policies for profiles
alter table public.profiles enable row level security;

create policy "Anyone authenticated can view profiles"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- RLS Policies for societies
alter table public.societies enable row level security;

create policy "Anyone can view societies"
  on public.societies for select
  using (true);

create policy "Authenticated users can create societies"
  on public.societies for insert
  to authenticated
  with check (true);

create policy "Society members can update their society"
  on public.societies for update
  to authenticated
  using (
    exists (
      select 1 from public.society_members
      where society_id = societies.id
      and user_id = auth.uid()
    )
  );

-- RLS Policies for society members
alter table public.society_members enable row level security;

create policy "Members can view their society members"
  on public.society_members for select
  to authenticated
  using (
    society_id in (
      select society_id from public.society_members
      where user_id = auth.uid()
    )
  );

create policy "Anyone authenticated can join societies"
  on public.society_members for insert
  to authenticated
  with check (true);

-- RLS Policies for events
alter table public.events enable row level security;

create policy "Anyone can view events"
  on public.events for select
  using (true);

create policy "Society members can create events"
  on public.events for insert
  to authenticated
  with check (
    exists (
      select 1 from public.society_members
      where society_id = events.society_id
      and user_id = auth.uid()
    )
  );

create policy "Society members can update their events"
  on public.events for update
  to authenticated
  using (
    exists (
      select 1 from public.society_members
      where society_id = events.society_id
      and user_id = auth.uid()
    )
  );

-- RLS Policies for welfare contacts
alter table public.welfare_contacts enable row level security;

create policy "Anyone can view welfare contacts"
  on public.welfare_contacts for select
  using (true);

create policy "Society members can manage welfare contacts"
  on public.welfare_contacts for all
  to authenticated
  using (
    exists (
      select 1 from public.events e
      join public.society_members sm on sm.society_id = e.society_id
      where e.id = welfare_contacts.event_id
      and sm.user_id = auth.uid()
    )
  );

-- RLS Policies for emergency info
alter table public.emergency_info enable row level security;

create policy "Anyone can view emergency info"
  on public.emergency_info for select
  using (true);

create policy "Society members can manage emergency info"
  on public.emergency_info for all
  to authenticated
  using (
    exists (
      select 1 from public.events e
      join public.society_members sm on sm.society_id = e.society_id
      where e.id = emergency_info.event_id
      and sm.user_id = auth.uid()
    )
  );

-- RLS Policies for code of conduct
alter table public.code_of_conduct enable row level security;

create policy "Anyone can view active code of conduct"
  on public.code_of_conduct for select
  using (is_active = true);

create policy "Society members can manage code of conduct"
  on public.code_of_conduct for all
  to authenticated
  using (
    exists (
      select 1 from public.society_members
      where society_id = code_of_conduct.society_id
      and user_id = auth.uid()
    )
  );

-- RLS Policies for code acceptances
alter table public.code_acceptances enable row level security;

create policy "Anyone can accept code of conduct"
  on public.code_acceptances for insert
  with check (true);

create policy "Society members can view acceptances for their events"
  on public.code_acceptances for select
  to authenticated
  using (
    exists (
      select 1 from public.events e
      join public.society_members sm on sm.society_id = e.society_id
      where e.id = code_acceptances.event_id
      and sm.user_id = auth.uid()
    )
  );

-- RLS Policies for reports
alter table public.reports enable row level security;

create policy "Anyone can submit reports"
  on public.reports for insert
  with check (true);

create policy "Society members can view reports for their events"
  on public.reports for select
  to authenticated
  using (
    exists (
      select 1 from public.events e
      join public.society_members sm on sm.society_id = e.society_id
      where e.id = reports.event_id
      and sm.user_id = auth.uid()
    )
  );

create policy "Society members can update report status"
  on public.reports for update
  to authenticated
  using (
    exists (
      select 1 from public.events e
      join public.society_members sm on sm.society_id = e.society_id
      where e.id = reports.event_id
      and sm.user_id = auth.uid()
    )
  );

-- RLS Policies for event feedback
alter table public.event_feedback enable row level security;

create policy "Anyone can submit feedback"
  on public.event_feedback for insert
  with check (true);

create policy "Society members can view feedback for their events"
  on public.event_feedback for select
  to authenticated
  using (
    exists (
      select 1 from public.events e
      join public.society_members sm on sm.society_id = e.society_id
      where e.id = event_feedback.event_id
      and sm.user_id = auth.uid()
    )
  );

-- RLS Policies for safety page views
alter table public.safety_page_views enable row level security;

create policy "Anyone can record page views"
  on public.safety_page_views for insert
  with check (true);

create policy "Society members can view page analytics"
  on public.safety_page_views for select
  to authenticated
  using (
    exists (
      select 1 from public.events e
      join public.society_members sm on sm.society_id = e.society_id
      where e.id = safety_page_views.event_id
      and sm.user_id = auth.uid()
    )
  );

-- Storage buckets
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('welfare-photos', 'welfare-photos', true)
on conflict (id) do nothing;

-- Storage policies for avatars
create policy "Authenticated users can upload avatars"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars');

create policy "Anyone can view avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users can update their own avatars"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars');

-- Storage policies for welfare photos
create policy "Authenticated users can upload welfare photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'welfare-photos');

create policy "Anyone can view welfare photos"
  on storage.objects for select
  using (bucket_id = 'welfare-photos');

create policy "Users can update welfare photos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'welfare-photos');