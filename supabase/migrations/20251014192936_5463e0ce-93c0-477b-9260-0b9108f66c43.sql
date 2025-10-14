-- Make user_id nullable and add external contact columns to welfare_contacts
alter table welfare_contacts alter column user_id drop not null;
alter table welfare_contacts add column if not exists external_name text;
alter table welfare_contacts add column if not exists external_phone text;

-- Update profile trigger to save phone number from signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, phone_number)
  values (
    new.id,
    new.raw_user_meta_data->>'display_name',
    new.raw_user_meta_data->>'phone_number'
  );
  return new;
end;
$$;