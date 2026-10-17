-- Basic Suit profile picture and cover photo storage.
-- Run this file once in Supabase Dashboard > SQL Editor.
-- Images are public to display on public profiles; uploads are restricted to each signed-in user's own folder.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-media', 'profile-media', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public profile media is readable" on storage.objects;
create policy "Public profile media is readable"
on storage.objects for select
using (bucket_id = 'profile-media');

drop policy if exists "Users upload own profile media" on storage.objects;
create policy "Users upload own profile media"
on storage.objects for insert to authenticated
with check (bucket_id = 'profile-media' and (storage.foldername(name))[1] = auth.uid()::text);
