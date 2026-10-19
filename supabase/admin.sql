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
