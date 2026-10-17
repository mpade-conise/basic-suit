-- Basic Suit social interaction migration.
-- Run this file once in Supabase SQL Editor after the base schema.
-- Safe to rerun: triggers are replaced and functions are created idempotently.

create or replace function public.sync_video_like_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.videos set likes_count = likes_count + 1 where id = new.video_id;
    return new;
  end if;
  update public.videos set likes_count = greatest(0, likes_count - 1) where id = old.video_id;
  return old;
end;
$$;

drop trigger if exists sync_video_like_count on public.likes;
create trigger sync_video_like_count
after insert or delete on public.likes
for each row execute function public.sync_video_like_count();

create or replace function public.sync_video_comment_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.videos set comments_count = comments_count + 1 where id = new.video_id;
    return new;
  end if;
  update public.videos set comments_count = greatest(0, comments_count - 1) where id = old.video_id;
  return old;
end;
$$;

drop trigger if exists sync_video_comment_count on public.comments;
create trigger sync_video_comment_count
after insert or delete on public.comments
for each row execute function public.sync_video_comment_count();

create or replace function public.create_social_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient_id uuid;
  actor_id uuid;
  video_ref uuid := null;
  notification_kind text;
begin
  if tg_table_name = 'follows' then
    recipient_id := new.following_id;
    actor_id := new.follower_id;
    notification_kind := 'follow';
  elsif tg_table_name = 'likes' then
    video_ref := new.video_id;
    actor_id := new.user_id;
    notification_kind := 'like';
    select user_id into recipient_id from public.videos where id = video_ref;
  elsif tg_table_name = 'comments' then
    video_ref := new.video_id;
    actor_id := new.user_id;
    notification_kind := 'comment';
    select user_id into recipient_id from public.videos where id = video_ref;
  else
    return new;
  end if;

  if recipient_id is not null and actor_id is not null and recipient_id <> actor_id then
    insert into public.notifications (user_id, actor_id, video_id, kind)
    values (recipient_id, actor_id, video_ref, notification_kind);
  end if;
  return new;
end;
$$;

drop trigger if exists notify_new_follow on public.follows;
create trigger notify_new_follow
after insert on public.follows
for each row execute function public.create_social_notification();

drop trigger if exists notify_new_like on public.likes;
create trigger notify_new_like
after insert on public.likes
for each row execute function public.create_social_notification();

drop trigger if exists notify_new_comment on public.comments;
create trigger notify_new_comment
after insert on public.comments
for each row execute function public.create_social_notification();
