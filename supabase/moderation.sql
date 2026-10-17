-- Basic Suit user blocking and content reporting.
-- Run after schema.sql and social_interactions.sql in Supabase SQL Editor.
create table if not exists public.blocked_users (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid references public.profiles(id) on delete set null,
  video_id uuid references public.videos(id) on delete set null,
  reason text not null check (reason in ('spam','harassment','hate','nudity','violence','misinformation','copyright','other')),
  details text check (details is null or char_length(details) <= 2000),
  status text not null default 'pending' check (status in ('pending','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now(),
  check (reported_user_id is not null or video_id is not null)
);
create index if not exists content_reports_status_created_idx on public.content_reports(status, created_at desc);
alter table public.blocked_users enable row level security;
alter table public.content_reports enable row level security;
drop policy if exists "Users view their own blocks" on public.blocked_users;
create policy "Users view their own blocks" on public.blocked_users for select to authenticated using (blocker_id = auth.uid());
drop policy if exists "Users block others as themselves" on public.blocked_users;
create policy "Users block others as themselves" on public.blocked_users for insert to authenticated with check (blocker_id = auth.uid());
drop policy if exists "Users unblock as themselves" on public.blocked_users;
create policy "Users unblock as themselves" on public.blocked_users for delete to authenticated using (blocker_id = auth.uid());
drop policy if exists "Users submit their own reports" on public.content_reports;
create policy "Users submit their own reports" on public.content_reports for insert to authenticated with check (reporter_id = auth.uid());
drop policy if exists "Users view their own reports" on public.content_reports;
create policy "Users view their own reports" on public.content_reports for select to authenticated using (reporter_id = auth.uid());
