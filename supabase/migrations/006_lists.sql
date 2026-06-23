create table if not exists lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references users(id) on delete cascade not null,
  name text not null check (char_length(name) between 1 and 50),
  description text check (char_length(description) <= 200),
  is_public boolean default true not null,
  created_at timestamptz default now() not null
);

create table if not exists list_members (
  list_id uuid references lists(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  added_at timestamptz default now() not null,
  primary key (list_id, user_id)
);

alter table lists enable row level security;
alter table list_members enable row level security;

create policy "Public lists visible to all"
  on lists for select using (is_public = true or owner_id = auth.uid());

create policy "Owners manage their lists"
  on lists for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "List members visible if list is public"
  on list_members for select
  using (exists (select 1 from lists where lists.id = list_id and (lists.is_public = true or lists.owner_id = auth.uid())));

create policy "Owners manage list members"
  on list_members for all
  using (exists (select 1 from lists where lists.id = list_id and lists.owner_id = auth.uid()))
  with check (exists (select 1 from lists where lists.id = list_id and lists.owner_id = auth.uid()));

create index lists_owner_idx on lists(owner_id, created_at desc);
create index list_members_list_idx on list_members(list_id, added_at desc);
