-- Phase 8c: Full-text search upgrade
-- Adds a tsvector functional GIN index for websearch_to_tsquery queries.
-- The existing gin_trgm_ops index (posts_content_gin) is kept for ilike/similarity.

create index if not exists posts_fts_idx
  on public.posts
  using gin(to_tsvector('english', content));

-- Ensure pg_trgm is enabled (already in schema.sql but idempotent)
create extension if not exists pg_trgm;

-- Users trigram index for display_name (in addition to username which already has one)
create index if not exists users_bio_gin
  on public.users
  using gin(bio gin_trgm_ops);
