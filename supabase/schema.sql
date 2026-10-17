-- Basic Suit Supabase setup. Run once in Supabase SQL Editor.
create extension if not exists pgcrypto;
create table if not exists public.profiles (id uuid primary key references auth.users(id) on delete cascade, username text unique not null check (char_length(username) between 3 and 30), display_name text not null default 'Creator', avatar_url text, bio text not null default '', is_verified boolean not null default false, created_at timestamptz not null default now());
create table if not exists public.videos (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, caption text not null default '', video_url text not null, thumbnail_url text, visibility text not null default 'public' check (visibility in ('public','followers','private')), likes_count integer not null default 0, comments_count integer not null default 0, shares_count integer not null default 0, created_at timestamptz not null default now());
create table if not exists public.likes (video_id uuid not null references public.videos(id) on delete cascade, user_id uuid not null references public.profiles(id) on delete cascade, created_at timestamptz not null default now(), primary key(video_id,user_id));
create table if not exists public.comments (id uuid primary key default gen_random_uuid(), video_id uuid not null references public.videos(id) on delete cascade, user_id uuid not null references public.profiles(id) on delete cascade, body text not null check (char_length(body) between 1 and 2000), parent_id uuid references public.comments(id) on delete cascade, created_at timestamptz not null default now());
create table if not exists public.follows (follower_id uuid not null references public.profiles(id) on delete cascade, following_id uuid not null references public.profiles(id) on delete cascade, created_at timestamptz not null default now(), primary key(follower_id,following_id), check(follower_id <> following_id));
create table if not exists public.bookmarks (user_id uuid not null references public.profiles(id) on delete cascade, video_id uuid not null references public.videos(id) on delete cascade, created_at timestamptz not null default now(), primary key(user_id,video_id));
create table if not exists public.notifications (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, actor_id uuid references public.profiles(id) on delete set null, video_id uuid references public.videos(id) on delete cascade, kind text not null check (kind in ('like','comment','follow','mention')), read_at timestamptz, created_at timestamptz not null default now());
create index if not exists videos_created_at_idx on public.videos(created_at desc);
create index if not exists videos_user_id_idx on public.videos(user_id);
create index if not exists comments_video_created_idx on public.comments(video_id,created_at);
create index if not exists notifications_user_created_idx on public.notifications(user_id,created_at desc);
alter table public.profiles enable row level security;
alter table public.videos enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.follows enable row level security;
alter table public.bookmarks enable row level security;
alter table public.notifications enable row level security;
create policy "Profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "Public videos readable" on public.videos for select using (visibility = 'public' or auth.uid() = user_id);
create policy "Users publish own videos" on public.videos for insert to authenticated with check (auth.uid() = user_id);
create policy "Users edit own videos" on public.videos for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete own videos" on public.videos for delete to authenticated using (auth.uid() = user_id);
create policy "Likes readable" on public.likes for select using (true);
create policy "Users like as themselves" on public.likes for insert to authenticated with check (auth.uid() = user_id);
create policy "Users remove own likes" on public.likes for delete to authenticated using (auth.uid() = user_id);
create policy "Comments readable" on public.comments for select using (true);
create policy "Users comment as themselves" on public.comments for insert to authenticated with check (auth.uid() = user_id);
create policy "Users delete own comments" on public.comments for delete to authenticated using (auth.uid() = user_id);
create policy "Follows readable" on public.follows for select using (true);
create policy "Users follow as themselves" on public.follows for insert to authenticated with check (auth.uid() = follower_id);
create policy "Users unfollow as themselves" on public.follows for delete to authenticated using (auth.uid() = follower_id);
create policy "Users read own bookmarks" on public.bookmarks for select to authenticated using (auth.uid() = user_id);
create policy "Users save own bookmarks" on public.bookmarks for insert to authenticated with check (auth.uid() = user_id);
create policy "Users remove own bookmarks" on public.bookmarks for delete to authenticated using (auth.uid() = user_id);
create policy "Users read own notifications" on public.notifications for select to authenticated using (auth.uid() = user_id);
create policy "Users update own notifications" on public.notifications for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Automatically provision a profile for each new auth account.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
declare base_name text;
begin
  base_name := left(regexp_replace(coalesce(new.raw_user_meta_data->>'username', split_part(coalesce(new.email, 'creator'), '@', 1)), '[^a-zA-Z0-9_.]', '', 'g'), 20);
  if length(base_name) < 3 then base_name := 'creator'; end if;
  insert into public.profiles (id, username, display_name)
  values (new.id, base_name || '_' || substr(new.id::text, 1, 6), coalesce(new.raw_user_meta_data->>'display_name', split_part(coalesce(new.email, 'Creator'), '@', 1), 'Creator'))
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
-- Public playback, 50 MB upload limit; users can only upload/delete within their own UUID folder.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values ('videos','videos',true,52428800,array['video/mp4','video/webm','video/quicktime']) on conflict (id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy "Public video objects are readable" on storage.objects for select using (bucket_id = 'videos');
create policy "Users upload to own video folder" on storage.objects for insert to authenticated with check (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users delete own video objects" on storage.objects for delete to authenticated using (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);
