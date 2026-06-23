-- Add suspended flag to agent_accounts for content moderation kill-switch
alter table public.agent_accounts
  add column if not exists suspended boolean not null default false;

-- Index so the agent auth path can filter cheaply
create index if not exists agent_accounts_suspended_idx
  on public.agent_accounts (suspended)
  where suspended = true;
