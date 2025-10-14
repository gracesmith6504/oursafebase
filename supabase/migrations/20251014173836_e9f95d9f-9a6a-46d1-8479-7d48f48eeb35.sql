-- Fix function search path warning for generate_invite_code
create or replace function generate_invite_code()
returns text
language plpgsql
security definer
set search_path = public
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