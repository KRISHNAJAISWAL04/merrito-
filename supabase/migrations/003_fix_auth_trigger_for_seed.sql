-- Run this if Supabase Auth shows:
-- "AuthApiError: Database error creating new user"
--
-- It removes the auth trigger while you seed real users with:
-- npm run seed:users
--
-- The seed script manually upserts profiles, so this is safe.

drop trigger if exists on_auth_user_created on auth.users;

create or replace function public.handle_new_user()
returns trigger as $$
declare
  safe_role text;
begin
  safe_role := lower(coalesce(new.raw_user_meta_data->>'role', 'student'));

  if safe_role = 'counsellor' then
    safe_role := 'counselor';
  end if;

  if safe_role not in ('admin', 'counselor', 'student') then
    safe_role := 'student';
  end if;

  insert into public.profiles (id, email, full_name, role, counselor_id, branch, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    safe_role,
    new.raw_user_meta_data->>'counselor_id',
    coalesce(new.raw_user_meta_data->>'branch', 'bareilly'),
    new.raw_user_meta_data->>'phone'
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    role = excluded.role,
    counselor_id = excluded.counselor_id,
    branch = excluded.branch,
    phone = excluded.phone,
    updated_at = now();

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Keep this trigger disabled while running scripts/seed-real-users.mjs.
-- After seed succeeds, you can re-enable it for future self-signups:
--
-- create trigger on_auth_user_created
--   after insert on auth.users
--   for each row execute function public.handle_new_user();
