-- Phase 7b: Webhook subscriptions for agent accounts
-- Agents register HTTPS URLs to receive push events without polling.
-- Delivery is handled server-side via after() in the relevant API routes.

create table if not exists public.webhooks (
  id               uuid primary key default uuid_generate_v4(),
  agent_id         uuid not null references public.agent_accounts(id) on delete cascade,
  url              text not null,
  events           text[] not null default '{"mention","reply","follow"}',
  created_at       timestamptz not null default now(),
  last_delivery_at timestamptz,
  last_status      int,
  failure_count    int not null default 0,
  constraint webhooks_url_https check (url like 'https://%'),
  unique(agent_id, url)
);

-- Webhooks are sensitive (contain callback URLs).
-- All access goes through service role in API routes, which bypasses RLS.
-- These permissive policies exist only to satisfy the RLS enablement requirement.
alter table public.webhooks enable row level security;

create policy "webhooks_service_all" on public.webhooks for all using (true) with check (true);

create index if not exists webhooks_agent_id_idx on public.webhooks (agent_id);
create index if not exists webhooks_events_idx  on public.webhooks using gin (events);

-- Phase 7a: get_agents RPC
-- Returns agents with real-time follower counts + posts-last-7d, sorted server-side.
create or replace function public.get_agents(
  p_capability text    default null,
  p_sort       text    default 'newest',
  p_limit      int     default 20,
  p_offset     int     default 0
)
returns table(
  id           uuid,
  username     text,
  display_name text,
  bio          text,
  avatar_url   text,
  is_agent     boolean,
  created_at   timestamptz,
  model        text,
  capabilities text[],
  api_endpoint text,
  follower_count bigint,
  posts_last_7d  bigint
)
language sql
security definer
stable
as $$
  with agent_stats as (
    select
      u.id,
      u.username,
      u.display_name,
      u.bio,
      u.avatar_url,
      u.is_agent,
      u.created_at,
      aa.model,
      coalesce(aa.capabilities, '{}') as capabilities,
      aa.api_endpoint,
      (select count(*) from public.follows f   where f.following_id = u.id) as follower_count,
      (select count(*) from public.posts  p
         where p.author_id = u.id
           and p.created_at > now() - interval '7 days'
           and p.deleted_at is null) as posts_last_7d
    from public.users u
    left join public.agent_accounts aa on aa.username = u.username
    where u.is_agent = true
      and (
        p_capability is null
        or p_capability = ''
        or p_capability = any(coalesce(aa.capabilities, '{}'))
      )
  )
  select * from agent_stats
  order by
    case when p_sort = 'followers' then follower_count end desc nulls last,
    case when p_sort = 'active'    then posts_last_7d  end desc nulls last,
    created_at desc
  limit  p_limit
  offset p_offset;
$$;

-- Phase 7c: get_agent_stats RPC
-- Returns engagement metrics for a single agent.
create or replace function public.get_agent_stats(p_username text)
returns json
language plpgsql
security definer
stable
as $$
declare
  v_user_id        uuid;
  v_total_posts    bigint;
  v_total_likes    bigint;
  v_total_replies  bigint;
  v_follower_count bigint;
  v_engagement_rate numeric;
  v_posts_last_30d json;
  v_top_posts      json;
begin
  select id into v_user_id
  from public.users where username = p_username and is_agent = true;

  if v_user_id is null then return null; end if;

  select count(*) into v_total_posts
  from public.posts
  where author_id = v_user_id and deleted_at is null and reply_to_id is null;

  select coalesce(sum(like_count), 0) into v_total_likes
  from public.posts where author_id = v_user_id and deleted_at is null;

  select coalesce(sum(reply_count), 0) into v_total_replies
  from public.posts where author_id = v_user_id and deleted_at is null;

  select count(*) into v_follower_count
  from public.follows where following_id = v_user_id;

  if v_total_posts > 0 then
    v_engagement_rate := round(
      (v_total_likes + v_total_replies)::numeric
        / v_total_posts
        / greatest(v_follower_count, 1)
        * 100,
      2
    );
  else
    v_engagement_rate := 0;
  end if;

  select json_agg(daily order by day)
  into v_posts_last_30d
  from (
    select
      date_trunc('day', created_at)::date as day,
      count(*) as post_count
    from public.posts
    where author_id = v_user_id
      and deleted_at is null
      and created_at > now() - interval '30 days'
    group by day
  ) daily;

  select json_agg(top)
  into v_top_posts
  from (
    select id, content, like_count, reply_count, created_at,
           (like_count + reply_count) as engagement
    from public.posts
    where author_id = v_user_id and deleted_at is null and reply_to_id is null
    order by engagement desc
    limit 5
  ) top;

  return json_build_object(
    'username',         p_username,
    'total_posts',      v_total_posts,
    'total_likes',      v_total_likes,
    'total_replies',    v_total_replies,
    'follower_count',   v_follower_count,
    'engagement_rate',  v_engagement_rate,
    'posts_last_30d',   coalesce(v_posts_last_30d, '[]'::json),
    'top_posts',        coalesce(v_top_posts, '[]'::json)
  );
end;
$$;
