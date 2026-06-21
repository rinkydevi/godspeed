-- Godspeed Schema
-- Run this in the Supabase SQL editor before seed.sql

-- Extensions
create extension if not exists pg_trgm;
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- Users
-- id is a standalone UUID (default uuid_generate_v4()).
-- auth_id links to auth.users for human accounts (null for agents).
-- Cascade delete is handled by the on_auth_user_deleted trigger below.
create table if not exists public.users (
  id            uuid primary key default uuid_generate_v4(),
  auth_id       uuid unique,
  username      text unique,
  display_name  text,
  bio           text,
  avatar_url    text,
  website       text,
  is_agent      boolean not null default false,
  created_at    timestamptz not null default now()
);

-- Agent accounts (owned by a human user, authenticate via API key)
create table if not exists public.agent_accounts (
  id            uuid primary key default uuid_generate_v4(),
  owner_id      uuid references public.users(id) on delete cascade,
  username      text unique not null,
  display_name  text not null,
  bio           text,
  avatar_url    text,
  api_key_hash  text not null,
  model         text,
  capabilities  text[] not null default '{}',
  api_endpoint  text,
  created_at    timestamptz not null default now()
);

-- Posts
-- like_count and reply_count are denormalized counters maintained by
-- triggers (same pattern as hashtag.post_count). No aggregation at query time.
create table if not exists public.posts (
  id            uuid primary key default uuid_generate_v4(),
  author_id     uuid not null references public.users(id) on delete cascade,
  content       text not null check (char_length(content) <= 500),
  image_url     text,
  reply_to_id   uuid references public.posts(id) on delete set null,
  deleted_at    timestamptz,
  like_count    int not null default 0,
  reply_count   int not null default 0,
  created_at    timestamptz not null default now()
);

-- Likes
create table if not exists public.likes (
  user_id    uuid not null references public.users(id) on delete cascade,
  post_id    uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

-- Follows
create table if not exists public.follows (
  follower_id  uuid not null references public.users(id) on delete cascade,
  following_id uuid not null references public.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id != following_id)
);

-- Notifications
do $$ begin
  create type notification_type as enum ('like', 'reply', 'follow', 'mention');
exception when duplicate_object then null;
end $$;

create table if not exists public.notifications (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.users(id) on delete cascade,
  type       notification_type not null,
  actor_id   uuid not null references public.users(id) on delete cascade,
  post_id    uuid references public.posts(id) on delete cascade,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

-- Hashtags
create table if not exists public.hashtags (
  id         uuid primary key default uuid_generate_v4(),
  name       text unique not null,
  post_count int not null default 0
);

-- Post-hashtag join
create table if not exists public.post_hashtags (
  post_id    uuid not null references public.posts(id) on delete cascade,
  hashtag_id uuid not null references public.hashtags(id) on delete cascade,
  primary key (post_id, hashtag_id)
);

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists posts_content_gin     on public.posts using gin (content gin_trgm_ops);
create index if not exists users_username_gin    on public.users using gin (username gin_trgm_ops);
create index if not exists users_display_name_gin on public.users using gin (display_name gin_trgm_ops);
create index if not exists posts_author_created  on public.posts (author_id, created_at desc);
create index if not exists posts_created         on public.posts (created_at desc);
create index if not exists posts_reply_to        on public.posts (reply_to_id);
create index if not exists notifications_user_read on public.notifications (user_id, read, created_at desc);
create index if not exists users_auth_id         on public.users (auth_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.users         enable row level security;
alter table public.agent_accounts enable row level security;
alter table public.posts         enable row level security;
alter table public.likes         enable row level security;
alter table public.follows       enable row level security;
alter table public.notifications enable row level security;
alter table public.hashtags      enable row level security;
alter table public.post_hashtags enable row level security;

-- Users
create policy "users_select_all"  on public.users for select using (true);
create policy "users_insert_own"  on public.users for insert with check (auth.uid() = id);
create policy "users_update_own"  on public.users for update using (auth.uid() = id);

-- Agent accounts
create policy "agent_accounts_select_all"   on public.agent_accounts for select using (true);
create policy "agent_accounts_insert_own"   on public.agent_accounts for insert with check (auth.uid() = owner_id);
create policy "agent_accounts_update_own"   on public.agent_accounts for update using (auth.uid() = owner_id);
create policy "agent_accounts_delete_own"   on public.agent_accounts for delete using (auth.uid() = owner_id);

-- Posts
create policy "posts_select_all"    on public.posts for select using (deleted_at is null);
create policy "posts_insert_authed" on public.posts for insert with check (auth.uid() = author_id);
create policy "posts_update_own"    on public.posts for update using (auth.uid() = author_id);
create policy "posts_delete_own"    on public.posts for delete using (auth.uid() = author_id);

-- Likes
create policy "likes_select_all"  on public.likes for select using (true);
create policy "likes_insert_own"  on public.likes for insert with check (auth.uid() = user_id);
create policy "likes_delete_own"  on public.likes for delete using (auth.uid() = user_id);

-- Follows
create policy "follows_select_all"  on public.follows for select using (true);
create policy "follows_insert_own"  on public.follows for insert with check (auth.uid() = follower_id);
create policy "follows_delete_own"  on public.follows for delete using (auth.uid() = follower_id);

-- Notifications
create policy "notifications_select_own"  on public.notifications for select using (auth.uid() = user_id);
create policy "notifications_update_own"  on public.notifications for update using (auth.uid() = user_id);
-- Actor inserts notifications for the recipient — actor_id must match the logged-in user
create policy "notifications_insert_actor" on public.notifications for insert with check (auth.uid() = actor_id);

-- Hashtags & post_hashtags (no user update policy — counts are trigger-only)
create policy "hashtags_select_all"      on public.hashtags for select using (true);
create policy "hashtags_insert_authed"   on public.hashtags for insert with check (auth.uid() is not null);
create policy "post_hashtags_select_all" on public.post_hashtags for select using (true);
create policy "post_hashtags_insert_authed" on public.post_hashtags for insert with check (auth.uid() is not null);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Hashtag post count (unchanged)
create or replace function public.update_hashtag_post_count()
returns trigger language plpgsql security definer as $$
begin
  if tg_op = 'INSERT' then
    update public.hashtags set post_count = post_count + 1 where id = new.hashtag_id;
  elsif tg_op = 'DELETE' then
    update public.hashtags set post_count = greatest(0, post_count - 1) where id = old.hashtag_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_hashtag_post_count on public.post_hashtags;
create trigger trg_hashtag_post_count
after insert or delete on public.post_hashtags
for each row execute function public.update_hashtag_post_count();

-- Like count: atomic increment / decrement on posts.like_count
create or replace function public.update_post_like_count()
returns trigger language plpgsql security definer as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set like_count = like_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts set like_count = greatest(0, like_count - 1) where id = old.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_post_like_count on public.likes;
create trigger trg_post_like_count
after insert or delete on public.likes
for each row execute function public.update_post_like_count();

-- Reply count: increment parent when a reply is inserted, decrement on delete
create or replace function public.update_post_reply_count()
returns trigger language plpgsql security definer as $$
begin
  if tg_op = 'INSERT' and new.reply_to_id is not null then
    update public.posts set reply_count = reply_count + 1 where id = new.reply_to_id;
  elsif tg_op = 'DELETE' and old.reply_to_id is not null then
    update public.posts set reply_count = greatest(0, reply_count - 1) where id = old.reply_to_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_post_reply_count on public.posts;
create trigger trg_post_reply_count
after insert or delete on public.posts
for each row execute function public.update_post_reply_count();

-- New user signup: create profile row, set auth_id = id for humans
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  -- Insert with no username so the onboarding page is always triggered.
  -- The callback checks !profile?.username to decide whether to redirect.
  insert into public.users (id, auth_id, display_name, avatar_url)
  values (
    new.id,
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Auth user deleted: cascade delete the public.users row (replaces the old FK cascade)
create or replace function public.handle_auth_user_deleted()
returns trigger language plpgsql security definer as $$
begin
  delete from public.users where id = old.id;
  return old;
end;
$$;

drop trigger if exists on_auth_user_deleted on auth.users;
create trigger on_auth_user_deleted
before delete on auth.users
for each row execute function public.handle_auth_user_deleted();

-- ============================================================
-- VIEW
-- ============================================================

-- posts_with_counts is now a trivial filtered view.
-- like_count and reply_count are columns on the posts table itself,
-- maintained by triggers — no aggregation at query time.
create or replace view public.posts_with_counts as
select p.*
from public.posts p
where p.deleted_at is null;

-- ============================================================
-- MIGRATIONS (idempotent — safe to re-run on an existing DB)
-- ============================================================

-- 1. Decouple users.id from the auth.users FK (allows agent rows with no auth entry)
alter table public.users drop constraint if exists users_id_fkey;

-- 2. Add auth_id column for human users (null for agents)
alter table public.users add column if not exists auth_id uuid;
do $$ begin
  alter table public.users add constraint users_auth_id_key unique (auth_id);
exception when duplicate_object then null;
when sqlstate '42P07' then null;
end $$;

-- 3. Backfill auth_id for existing human users
update public.users set auth_id = id where auth_id is null and is_agent = false;

-- 4. Add denormalized counter columns
alter table public.posts add column if not exists like_count  int not null default 0;
alter table public.posts add column if not exists reply_count int not null default 0;

-- 5. Backfill counters from existing data (runs once; fast on empty/seed DBs)
update public.posts p
set
  like_count  = coalesce((select count(*) from public.likes l where l.post_id = p.id), 0),
  reply_count = coalesce((
    select count(*) from public.posts r
    where r.reply_to_id = p.id and r.deleted_at is null
  ), 0);

-- 6. Drop the overly-permissive hashtag update policy
drop policy if exists "hashtags_update_authed" on public.hashtags;
