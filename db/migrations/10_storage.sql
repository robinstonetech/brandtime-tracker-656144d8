-- 10. Storage buckets and policies
-- org-logos : public read (branding is shown on login/invite pages)
-- avatars   : public read, owner write

insert into storage.buckets (id, name, public)
values ('org-logos', 'org-logos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Object paths are "<organization_id>/<filename>" for org-logos
-- and "<user_id>/<filename>" for avatars.

drop policy if exists "public read org logos" on storage.objects;
create policy "public read org logos" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'org-logos');

drop policy if exists "admins manage org logos" on storage.objects;
create policy "admins manage org logos" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'org-logos'
    and public.has_min_role(((storage.foldername(name))[1])::uuid, 'admin')
  )
  with check (
    bucket_id = 'org-logos'
    and public.has_min_role(((storage.foldername(name))[1])::uuid, 'admin')
  );

drop policy if exists "public read avatars" on storage.objects;
create policy "public read avatars" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'avatars');

drop policy if exists "users manage own avatar" on storage.objects;
create policy "users manage own avatar" on storage.objects
  for all to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
