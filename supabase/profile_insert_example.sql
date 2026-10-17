-- Run in Supabase SQL Editor after the account exists in Authentication > Users.
-- This is safe to rerun for the same profile ID. It intentionally does not allow
-- this script to create an auth.users account or overwrite trusted verification flags.
do $$
declare
  target_user_id uuid := '120f0102-1950-4f2d-a199-487e33a8b2c9';
begin
  if not exists (select 1 from auth.users where id = target_user_id) then
    raise exception 'No auth.users account exists for %. Create/sign up the account first, then rerun this script.', target_user_id;
  end if;
end $$;

insert into public.profiles (
  id, username, display_name, bio, pronouns, avatar_url, cover_url,
  country, region, city, location_visible, account_type, profile_theme,
  background_url, accent_color, profile_music_url, profile_music_title,
  featured_post_id, online_status_visible, activity_visible, email_verified,
  phone_verified, creator_verified, platform_verified, verification_status,
  verification_date, creator_mode, featured_content_enabled, joined_at,
  updated_at, date_of_birth, date_of_birth_visible, gender, gender_visible,
  custom_location, website_url, profile_layout, app_language, content_language,
  timezone, categories, interests, username_changed_at, username_change_count,
  username_change_cooldown_until, identity_verification_status, identity_verification_date
)
select
  u.id, 'andrewgoomonda_120f01', 'andrewgoomonda', '', null, null, null,
  null, null, null, true, 'personal', 'default',
  null, null, null, null,
  null, true, true, false,
  false, false, false, 'none',
  null, false, true, '2026-10-17 14:02:39.386579+00',
  now(), null, false, null, false,
  null, null, 'standard', 'en', 'en',
  'Africa/Blantyre', array[]::text[], array[]::text[], null, 0,
  null, 'none', null
from auth.users u
where u.id = '120f0102-1950-4f2d-a199-487e33a8b2c9'
on conflict (id) do update set
  username = excluded.username,
  display_name = excluded.display_name,
  bio = excluded.bio,
  pronouns = excluded.pronouns,
  avatar_url = excluded.avatar_url,
  cover_url = excluded.cover_url,
  country = excluded.country,
  region = excluded.region,
  city = excluded.city,
  location_visible = excluded.location_visible,
  account_type = excluded.account_type,
  profile_theme = excluded.profile_theme,
  background_url = excluded.background_url,
  accent_color = excluded.accent_color,
  profile_music_url = excluded.profile_music_url,
  profile_music_title = excluded.profile_music_title,
  featured_post_id = excluded.featured_post_id,
  online_status_visible = excluded.online_status_visible,
  activity_visible = excluded.activity_visible,
  creator_mode = excluded.creator_mode,
  featured_content_enabled = excluded.featured_content_enabled,
  date_of_birth = excluded.date_of_birth,
  date_of_birth_visible = excluded.date_of_birth_visible,
  gender = excluded.gender,
  gender_visible = excluded.gender_visible,
  custom_location = excluded.custom_location,
  website_url = excluded.website_url,
  profile_layout = excluded.profile_layout,
  app_language = excluded.app_language,
  content_language = excluded.content_language,
  timezone = excluded.timezone,
  categories = excluded.categories,
  interests = excluded.interests,
  username_change_count = excluded.username_change_count,
  updated_at = now();
