-- Basic Suit direct messaging.
-- Run this migration in Supabase SQL Editor after schema.sql.
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  primary key (conversation_id, user_id)
);
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  read_at timestamptz
);
create index if not exists conversation_members_user_idx on public.conversation_members(user_id);
create index if not exists messages_conversation_created_idx on public.messages(conversation_id, created_at desc);
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

-- Explicit API privileges for authenticated messaging clients.
grant select, insert, delete on public.conversations to authenticated;
grant select, insert, update on public.conversation_members to authenticated;
grant select, insert, update on public.messages to authenticated;
create or replace function public.is_conversation_member(target_conversation_id uuid, target_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = target_conversation_id and cm.user_id = target_user_id
  );
$$;
revoke all on function public.is_conversation_member(uuid, uuid) from public;
grant execute on function public.is_conversation_member(uuid, uuid) to authenticated;

drop policy if exists "Members can view their conversations" on public.conversations;
create policy "Members and creators can view their conversations" on public.conversations for select to authenticated using (created_by = auth.uid() or public.is_conversation_member(id, auth.uid()));
drop policy if exists "Users create conversations" on public.conversations;
create policy "Users create conversations" on public.conversations for insert to authenticated with check (created_by = auth.uid());
drop policy if exists "Creators can remove empty conversations" on public.conversations;
create policy "Creators can remove empty conversations" on public.conversations for delete to authenticated using (created_by = auth.uid());

drop policy if exists "Members can view conversation members" on public.conversation_members;
create policy "Members can view conversation members" on public.conversation_members for select to authenticated using (public.is_conversation_member(conversation_id, auth.uid()));
drop policy if exists "Conversation creator adds participants" on public.conversation_members;
create policy "Conversation creator adds participants" on public.conversation_members for insert to authenticated with check (exists (select 1 from public.conversations c where c.id = conversation_id and c.created_by = auth.uid()));
drop policy if exists "Members update their read marker" on public.conversation_members;
create policy "Members update their read marker" on public.conversation_members for update to authenticated using (user_id = auth.uid() and public.is_conversation_member(conversation_id, auth.uid())) with check (user_id = auth.uid());

drop policy if exists "Members read messages" on public.messages;
create policy "Members read messages" on public.messages for select to authenticated using (public.is_conversation_member(conversation_id, auth.uid()));
drop policy if exists "Members send as themselves" on public.messages;
create policy "Members send as themselves" on public.messages for insert to authenticated with check (sender_id = auth.uid() and public.is_conversation_member(conversation_id, auth.uid()));
drop policy if exists "Senders edit own messages" on public.messages;
create policy "Senders edit own messages" on public.messages for update to authenticated using (sender_id = auth.uid() and public.is_conversation_member(conversation_id, auth.uid())) with check (sender_id = auth.uid() and public.is_conversation_member(conversation_id, auth.uid()));

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
exception when undefined_object then
  null;
end;
$$;
create or replace function public.touch_conversation_on_message()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.conversations set updated_at = now() where id = new.conversation_id;
  return new;
end;
$$;
drop trigger if exists touch_conversation_on_message on public.messages;
create trigger touch_conversation_on_message after insert on public.messages for each row execute function public.touch_conversation_on_message();
