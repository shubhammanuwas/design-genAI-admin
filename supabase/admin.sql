alter table public.profiles
  add column if not exists is_superadmin boolean not null default false;

create or replace function public.is_current_user_superadmin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and (select auth.jwt() -> 'app_metadata' ->> 'provider') = 'google'
    and exists (
      select 1
      from public.profiles as profile
      where profile.id = (select auth.uid())
        and profile.is_superadmin = true
    );
$$;

revoke all on function public.is_current_user_superadmin() from public;
grant execute on function public.is_current_user_superadmin() to authenticated;

create or replace function public.set_profile_superadmin(
  target_profile_id uuid,
  should_be_superadmin boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_is_superadmin boolean;
  superadmin_count bigint;
begin
  perform profile.id
  from public.profiles as profile
  where profile.is_superadmin = true
  order by profile.id
  for update;

  if not public.is_current_user_superadmin() then
    raise exception 'Only superadmins can change admin roles.'
      using errcode = '42501';
  end if;

  if target_profile_id = (select auth.uid()) and not should_be_superadmin then
    raise exception 'You cannot remove your own superadmin access.'
      using errcode = '42501';
  end if;

  select profile.is_superadmin
  into target_is_superadmin
  from public.profiles as profile
  where profile.id = target_profile_id;

  if not found then
    raise exception 'Profile not found.'
      using errcode = 'P0002';
  end if;

  if not should_be_superadmin and target_is_superadmin then
    select count(*)
    into superadmin_count
    from public.profiles as profile
    where profile.is_superadmin = true;

    if superadmin_count <= 1 then
      raise exception 'At least one superadmin must remain.'
        using errcode = '23514';
    end if;
  end if;

  update public.profiles as profile
  set is_superadmin = should_be_superadmin
  where profile.id = target_profile_id;

  return true;
end;
$$;

revoke all on function public.set_profile_superadmin(uuid, boolean) from public;
grant execute on function public.set_profile_superadmin(uuid, boolean) to authenticated;

grant select on public.profiles to authenticated;
revoke update on public.profiles from authenticated;
grant update (first_name, last_name, avatar_url) on public.profiles to authenticated;
grant update, delete on public.generations to authenticated;
grant select on public.caption_votes to authenticated;

drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users and superadmins can view profiles" on public.profiles;
create policy "Users and superadmins can view profiles"
on public.profiles for select to authenticated
using ((select auth.uid()) = id or (select public.is_current_user_superadmin()));

drop policy if exists "Users can read their own votes" on public.caption_votes;
drop policy if exists "Users and superadmins can read votes" on public.caption_votes;
create policy "Users and superadmins can read votes"
on public.caption_votes for select to authenticated
using ((select auth.uid()) = user_id or (select public.is_current_user_superadmin()));

drop policy if exists "Superadmins can update generations" on public.generations;
create policy "Superadmins can update generations"
on public.generations for update to authenticated
using ((select public.is_current_user_superadmin()))
with check ((select public.is_current_user_superadmin()));

drop policy if exists "Superadmins can create generations" on public.generations;
create policy "Superadmins can create generations"
on public.generations for insert to authenticated
with check ((select public.is_current_user_superadmin()));

drop policy if exists "Superadmins can delete generations" on public.generations;
create policy "Superadmins can delete generations"
on public.generations for delete to authenticated
using ((select public.is_current_user_superadmin()));

drop policy if exists "Superadmins can upload generation photos" on storage.objects;
create policy "Superadmins can upload generation photos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'generation-photos'
  and (select public.is_current_user_superadmin())
);

drop policy if exists "Superadmins can delete generation photos" on storage.objects;
create policy "Superadmins can delete generation photos"
on storage.objects for delete to authenticated
using (
  bucket_id = 'generation-photos'
  and (select public.is_current_user_superadmin())
);

notify pgrst, 'reload schema';
