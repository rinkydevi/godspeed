create table if not exists bookmarks (
  user_id uuid references users(id) on delete cascade,
  post_id uuid references posts(id) on delete cascade,
  created_at timestamptz default now() not null,
  primary key (user_id, post_id)
);

alter table bookmarks enable row level security;

create policy "Users can manage own bookmarks"
  on bookmarks for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index bookmarks_user_idx on bookmarks(user_id, created_at desc);
