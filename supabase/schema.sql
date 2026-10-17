-- Basic Suit Supabase setup. Run once in Supabase SQL Editor.
create extension if not exists pgcrypto;
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (char_length(username) between 3 and 30),
  display_name text not null default 'Creator',
  avatar_url text,
  bio text not null default '',
  pronouns text,
  cover_url text,
  country text,
  region text,
  city text,
  location_visible boolean not null default true,
  account_type text not null default 'personal',
  profile_theme text not null default 'default',
  background_url text,
  accent_color text,
  profile_music_url text,
  profile_music_title text,
  featured_post_id uuid,
  online_status_visible boolean not null default true,
  activity_visible boolean not null default true,
  email_verified boolean not null default false,
  phone_verified boolean not null default false,
  creator_verified boolean not null default false,
  platform_verified boolean not null default false,
  verification_status text not null default 'none',
  verification_date timestamptz,
  creator_mode boolean not null default false,
  featured_content_enabled boolean not null default true,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  date_of_birth date,
  date_of_birth_visible boolean not null default false,
  gender text,
  gender_visible boolean not null default false,
  custom_location text,
  website_url text,
  profile_layout text not null default 'standard',
  app_language text not null default 'en',
  content_language text not null default 'en',
  timezone text not null default 'Africa/Blantyre',
  categories text[] not null default '{}',
  interests text[] not null default '{}',
  username_changed_at timestamptz,
  username_change_count integer not null default 0,
  username_change_cooldown_until timestamptz,
  identity_verification_status text not null default 'none',
  identity_verification_date timestamptz,
  is_verified boolean not null default false,
  created_at timestamptz not null default now()
);
-- Safe, repeatable migration for projects where profiles already exists.
alter table public.profiles
  add column if not exists pronouns text,
  add column if not exists cover_url text,
  add column if not exists country text,
  add column if not exists region text,
  add column if not exists city text,
  add column if not exists location_visible boolean not null default true,
  add column if not exists account_type text not null default 'personal',
  add column if not exists profile_theme text not null default 'default',
  add column if not exists background_url text,
  add column if not exists accent_color text,
  add column if not exists profile_music_url text,
  add column if not exists profile_music_title text,
  add column if not exists featured_post_id uuid,
  add column if not exists online_status_visible boolean not null default true,
  add column if not exists activity_visible boolean not null default true,
  add column if not exists email_verified boolean not null default false,
  add column if not exists phone_verified boolean not null default false,
  add column if not exists creator_verified boolean not null default false,
  add column if not exists platform_verified boolean not null default false,
  add column if not exists verification_status text not null default 'none',
  add column if not exists verification_date timestamptz,
  add column if not exists creator_mode boolean not null default false,
  add column if not exists featured_content_enabled boolean not null default true,
  add column if not exists joined_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists date_of_birth date,
  add column if not exists date_of_birth_visible boolean not null default false,
  add column if not exists gender text,
  add column if not exists gender_visible boolean not null default false,
  add column if not exists custom_location text,
  add column if not exists website_url text,
  add column if not exists profile_layout text not null default 'standard',
  add column if not exists app_language text not null default 'en',
  add column if not exists content_language text not null default 'en',
  add column if not exists timezone text not null default 'Africa/Blantyre',
  add column if not exists categories text[] not null default '{}',
  add column if not exists interests text[] not null default '{}',
  add column if not exists username_changed_at timestamptz,
  add column if not exists username_change_count integer not null default 0,
  add column if not exists username_change_cooldown_until timestamptz,
  add column if not exists identity_verification_status text not null default 'none',
  add column if not exists identity_verification_date timestamptz;

create table if not exists public.videos (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, caption text not null default '', video_url text not null, thumbnail_url text, visibility text not null default 'public' check (visibility in ('public','followers','private')), likes_count integer not null default 0, comments_count integer not null default 0, shares_count integer not null default 0, created_at timestamptz not null default now());
create table if not exists public.likes (video_id uuid not null references public.videos(id) on delete cascade, user_id uuid not null references public.profiles(id) on delete cascade, created_at timestamptz not null default now(), primary key(video_id,user_id));
create table if not exists public.comments (id uuid primary key default gen_random_uuid(), video_id uuid not null references public.videos(id) on delete cascade, user_id uuid not null references public.profiles(id) on delete cascade, body text not null check (char_length(body) between 1 and 2000), parent_id uuid references public.comments(id) on delete cascade, created_at timestamptz not null default now());
create table if not exists public.follows (follower_id uuid not null references public.profiles(id) on delete cascade, following_id uuid not null references public.profiles(id) on delete cascade, created_at timestamptz not null default now(), primary key(follower_id,following_id), check(follower_id <> following_id));
create table if not exists public.bookmarks (user_id uuid not null references public.profiles(id) on delete cascade, video_id uuid not null references public.videos(id) on delete cascade, created_at timestamptz not null default now(), primary key(user_id,video_id));
create table if not exists public.notifications (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, actor_id uuid references public.profiles(id) on delete set null, video_id uuid references public.videos(id) on delete cascade, kind text not null check (kind in ('like','comment','follow','mention')), read_at timestamptz, created_at timestamptz not null default now());
-- A profile may feature one of its own videos; delete safely clears the featured reference.
do $
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_featured_post_id_fkey') then
    alter table public.profiles add constraint profiles_featured_post_id_fkey
      foreign key (featured_post_id) references public.videos(id) on delete set null;
  end if;
end $;
create index if not exists profiles_country_region_city_idx on public.profiles(country, region, city);
create index if not exists profiles_categories_gin_idx on public.profiles using gin(categories);
create index if not exists profiles_interests_gin_idx on public.profiles using gin(interests);
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
-- Verification state is managed by trusted server/admin operations, not profile clients.
create or replace function public.protect_profile_verification_fields()
returns trigger language plpgsql security definer set search_path = '' as $
begin
  if coalesce(auth.role(), '') <> 'service_role' and auth.uid() = old.id then
    new.is_verified := old.is_verified;
    new.email_verified := old.email_verified;
    new.phone_verified := old.phone_verified;
    new.creator_verified := old.creator_verified;
    new.platform_verified := old.platform_verified;
    new.verification_status := old.verification_status;
    new.verification_date := old.verification_date;
    new.identity_verification_status := old.identity_verification_status;
    new.identity_verification_date := old.identity_verification_date;
  end if;
  new.updated_at := now();
  return new;
end;
$;
drop trigger if exists protect_profile_verification_fields on public.profiles;
create trigger protect_profile_verification_fields
before update on public.profiles
for each row execute function public.protect_profile_verification_fields();
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
