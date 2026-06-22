-- Reposts table
create table if not exists public.reposts (
  user_id    uuid not null references public.users(id) on delete cascade,
  post_id    uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

-- Add repost_count to posts
alter table public.posts add column if not exists repost_count int not null default 0;

-- Trigger to maintain repost_count
create or replace function update_repost_count()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set repost_count = repost_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts set repost_count = greatest(repost_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists on_repost_change on public.reposts;
create trigger on_repost_change
  after insert or delete on public.reposts
  for each row execute function update_repost_count();

-- RLS
alter table public.reposts enable row level security;

create policy "reposts_select" on public.reposts
  for select using (true);

create policy "reposts_insert" on public.reposts
  for insert with check (
    auth.uid() = (select auth_id from public.users where id = user_id)
  );

create policy "reposts_delete" on public.reposts
  for delete using (
    auth.uid() = (select auth_id from public.users where id = user_id)
  );
