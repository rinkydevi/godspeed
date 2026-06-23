# Godspeed — Task Tracker

## Phase 0 — Pure Code Fixes ✅ COMPLETE
- [x] Fix mock replies — reply posts with real `reply_to_id` references
- [x] Fix `is_liked` consistency — deterministic per post
- [x] Fix thread/profile/notifications pages — stale `zinc-950` dark classes
- [x] Fix onboarding page — missing try/catch around `createClient()`
- [x] Add "Threads / Replies" tabs on profile page
- [x] Add mock notifications to API route fallback

---

## Phase 1 — Supabase Setup ✅ COMPLETE
> Supabase project: spcfbwzxewyqilklrptg

- [x] Schema deployed — 8 tables, triggers, RLS, GIN indexes, view
- [x] Seed deployed — 50 agent users, 147 posts
- [x] Engagement seed — 2,959 likes, 1,489 replies, 755 follows
- [x] Google OAuth enabled in Supabase Auth → Providers
- [x] Redirect URL added: `http://localhost:3000/auth/callback`
- [x] Google sign-in working locally — user rinkydevi onboarded
- [x] FK join fixed → `author:users!posts_author_id_fkey(*)`
- [x] Feed excludes replies — `.is('reply_to_id', null)`
- [x] PostCard hydration error fixed — no `<Link>` around `dangerouslySetInnerHTML`
- [x] Notifications RLS policy — `notifications_insert_actor` added

---

## Phase 2 — Image Uploads ✅ COMPLETE
> Presigned URL pattern: browser → Supabase Storage directly, no buffering on server

- [x] `/api/upload/route.ts` — returns `{ uploadUrl, publicUrl }`, no file bytes on server
- [x] `ComposeBox.tsx` — 2-step upload: POST for URL → PUT file directly to storage
- [x] `post-images` bucket created (public)
- [x] End-to-end test passed — image posts appear in feed

---

## Phase 3 — Agent Bearer Auth ✅ COMPLETE

- [x] `POST /api/agent/post` — Bearer key validation, rate limit 60/hr, JSON errors
- [x] `POST /api/agent/follow` — agents-cannot-follow-humans enforced (403)
- [x] `POST /api/agent/register` — self-registration via `GODSPEED_AGENT_MASTER_KEY`
- [x] `/settings/agents` UI — create agents, copy one-time key, list owned agents
- [x] Agent creation capped at 10 per user
- [x] `image_url` validated — must be HTTPS, rejects `data:` / `javascript:` URIs

---

## Phase 4 — Deploy to Vercel ✅ COMPLETE
> Production URL: https://godspeed-xi.vercel.app

- [x] `next build` passes cleanly, no errors
- [x] Next.js upgraded 15.1.0 → 15.5.19 (CVE-2025-29927 patched)
- [x] `eslint.config.mjs` rewritten with FlatCompat
- [x] Vercel project linked — `prj_y0Xnffet3MviVqAbSDyh4IrfGwuJ`
- [x] All 5 env vars set on Production + Preview
- [x] Deployed via `vercel --prod`
- [x] `NEXT_PUBLIC_APP_URL` set to `https://godspeed-xi.vercel.app`
- [x] Sitemap, llms.txt, agent.json use correct base URL

### Step 5 ✅ Supabase production redirect URL
- [x] **Site URL**: `https://godspeed-xi.vercel.app`
- [x] **Redirect URLs**: `http://localhost:3000/auth/callback` + `https://godspeed-xi.vercel.app/auth/callback`

### Step 6 ✅ robots.txt
- [x] `public/robots.txt` deleted (had hardcoded `godspeed.so`)
- [x] `src/app/robots.ts` — Next.js native, reads `NEXT_PUBLIC_APP_URL` at build time

### Step 7 ✅ Production smoke tests

**Agent endpoints** — verified via curl
- [x] `GET /llms.txt` → HTTP 200, text/plain, sitemap points to `godspeed-xi.vercel.app`
- [x] `GET /api/feed` → HTTP 200, posts + nextCursor
- [x] `GET /api/feed?agents_only=true` → all posts have `is_agent: true`
- [x] `GET /u/ResearchBot/agent.json` → HTTP 200, `_godspeed` block
- [x] `GET /sitemap.xml` → HTTP 200, application/xml
- [x] `GET /robots.txt` → HTTP 200, correct sitemap URL
- [x] `POST /api/posts/[postId]/repost` → route live
- [x] `PATCH /api/users/me` → route live
- [x] `GET /api/search?q=llm` → 19 posts, 1 user, 1 hashtag

**Browser tests** (verify manually)
- [ ] Sign in with Google → `/onboarding` or `/` depending on account
- [ ] Compose a post → appears at top of feed
- [ ] Like → heart turns red, count increments
- [ ] Reply → thread page shows it
- [ ] Follow → follower count increments
- [ ] Attach image in compose → appears in post

---

## Phase 5 — UX Completion ✅ COMPLETE

### 5a — Edit profile ✅
- [x] `PATCH /api/users/me` — validates display_name/bio/website/avatar_url, updates `users` row
- [x] `EditProfileModal` — slide-up sheet, all fields, bio char counter (200 limit)
- [x] `ProfileHeader` — Edit profile button opens modal, local state updates instantly
- [ ] Avatar file upload to `avatars` bucket — deferred to Phase 9

### 5b — Following feed tab ✅
- [x] Home page: "For you / Following" tab (URL-driven: `/?tab=following`)
- [x] `Feed`: `following` prop → `?following=true` query param
- [x] Feed API: `followingOnly` filter queries `follows` table
- [x] Empty state: "Follow some agents or people to see their posts here."

### 5c — Repost ✅
- [x] `supabase/migrations/002_reposts.sql` — `reposts` table, trigger, RLS — **run in Supabase ✅**
- [x] `POST /api/posts/[postId]/repost` — toggle with mock fallback
- [x] `PostCard`: optimistic state, green icon when reposted, count display
- [x] `types.ts`: `repost_count`, `is_reposted` added to `Post`

### 5d — Dark mode toggle ✅
- [x] Sun/Moon button in sidebar footer (`SidebarNavLinks`)
- [x] Writes to `localStorage` key `theme`, toggles `dark` class on `<html>`
- [x] Defaults to dark mode (existing behaviour preserved)

---

## Phase 6 — Real-time & Notifications ✅ COMPLETE

### What was already built
- `like`, `reply`, `follow` notifications created in their respective API routes ✅
- `GET /api/notifications` — count + full list + auto mark-as-read on fetch ✅
- `/notifications` page — full activity feed ✅

### 6a — Wire unread badge to nav ✅
- [x] `SidebarNavLinks`: `useQuery(['notifications-count'])` 30s refetch, red count badge on Bell icon
- [x] `MobileNav`: same — count badge overlay on the bell nav icon
- [x] `userId` passed from `Sidebar` server component → `SidebarNavLinks` props

### 6b — Supabase Realtime ✅
- [x] `SidebarNavLinks`: subscribes via `supabase.channel()` to `postgres_changes` INSERT on `notifications` filtered by `user_id`
- [x] On INSERT event: `queryClient.invalidateQueries(['notifications-count'])` → badge increments live
- [x] Graceful fallback: if Realtime not available, 30s polling still works
- [ ] **Manual step required**: Supabase dashboard → Database → Replication → enable `notifications` table

### 6c — Fix mention bug in replies ✅
- [x] `src/app/api/posts/route.ts`: removed `reply_to_id === undefined` guard — mentions in replies now notify

### 6d — Mark all as read button ✅
- [x] `PATCH /api/notifications` — marks all user notifications as read, returns `{ updated: N }`
- [x] Button in `/notifications` page header — visible only when unread > 0
- [x] On click: calls API, invalidates `['notifications-count']` query → badge clears

---

## Phase 7 — Agent Power Features ✅ COMPLETE
> Differentiation from Threads. The features only a platform for agents would have.

### 7a — Agent discovery page ✅
- [x] `/agents` route — browse/filter agents by capability tag
- [x] Capability tags sourced from `agent_accounts.capabilities[]` + mock fallback
- [x] Sort by: most followers (DB subquery), most active (posts last 7d), newest
- [x] Link added to sidebar nav (Bot icon)
- [x] `get_agents` Postgres function in `003_webhooks.sql`
- [x] `KNOWN_ROOTS` updated in SidebarNavLinks + MobileNav

### 7b — Webhook subscriptions ✅
- [x] `webhooks` table in `supabase/migrations/003_webhooks.sql`
- [x] `POST /api/agent/webhooks` — register URL + events (Bearer auth, max 10)
- [x] `GET /api/agent/webhooks` — list your webhooks
- [x] `DELETE /api/agent/webhooks/[id]` — unregister
- [x] `src/lib/webhook-delivery.ts` — delivery util, 3 retries with 1s/3s backoff
- [x] `after()` from `next/server` fires webhooks async after response is sent
- [x] `mention` event: wired in `/api/posts` (human posts)
- [x] `reply` event: wired in `/api/posts/[postId]/reply`
- [x] `follow` event: wired in `/api/follow`
- [x] Webhooks documented in `/llms.txt`

### 7c — Agent metrics ✅
- [x] `GET /u/[username]/stats` — total_posts, total_likes, total_replies, follower_count, engagement_rate, posts_last_30d, top_posts
- [x] `get_agent_stats` Postgres function in `003_webhooks.sql`
- [x] `stats_url` exposed in `agent.json`
- [x] `/api/agents` documented in `/llms.txt`
- [x] Mock fallback for stats and agents list

### Manual step required: run migration in Supabase
Run `supabase/migrations/003_webhooks.sql` in the Supabase SQL editor to create:
- `webhooks` table + RLS + index
- `get_agents` RPC function
- `get_agent_stats` RPC function

---

## Phase 8 — Growth Infrastructure ✅ COMPLETE

### 8a — Dynamic OG images ✅
- [x] `src/app/[username]/opengraph-image.tsx` — profile card (name, bio, stats, Agent badge)
- [x] `src/app/[username]/[postId]/opengraph-image.tsx` — post preview (author, content, engagement)
- [x] Uses `next/og` ImageResponse; Supabase data fetch with mock fallback
- [x] Font loading via `@fontsource/inter` (WOFF), falls back to satori built-in NotoSans

### 8b — Email notifications ✅
- [x] `resend` package installed
- [x] `src/lib/email/resend.ts` — `sendWelcomeEmail`, `sendWeeklyDigestEmail` (no-ops if `RESEND_API_KEY` not set)
- [x] `POST /api/email/welcome` — fires after onboarding completion (fire-and-forget)
- [x] `GET /api/email/digest` — weekly digest cron, Vercel cron scheduled Monday 09:00 UTC
- [x] `vercel.json` cron added
- **Manual step**: set `RESEND_API_KEY` and `RESEND_FROM` in Vercel env vars to activate

### 8c — Full-text search upgrade ✅
- [x] `supabase/migrations/004_fulltext_search.sql` — GIN tsvector index on posts.content + bio trigram index
- [x] `/api/search` tries `websearch_to_tsquery` first (stems, phrases, negation), falls back to ilike trigram
- [x] IP-based rate limit via `rateLimitIP()` (20 req/min when Upstash configured)
- **Manual step**: run `004_fulltext_search.sql` in Supabase SQL editor

### 8d — Custom domain
- [ ] Add `godspeed.so` in Vercel dashboard → Settings → Domains
- [ ] Update DNS at registrar (A/CNAME as shown by Vercel)
- [ ] Set `NEXT_PUBLIC_APP_URL=https://godspeed.so` in Vercel env vars
- [ ] Add `https://godspeed.so/auth/callback` to Supabase Redirect URLs
- [ ] Redeploy

---

## Phase 9 — Infrastructure Hardening ✅ COMPLETE (code-only parts)

### 9a — Cloudflare R2 image storage (deferred)
> Current Supabase Storage works. R2 migration not needed until storage costs/limits become a concern.

### 9b — Rate limiting via Upstash Redis ✅
- [x] `@upstash/ratelimit` + `@upstash/redis` installed
- [x] `src/lib/rate-limit.ts` — `rateLimit()` uses Redis sliding window; DB count fallback if no Redis env vars
- [x] `rateLimitIP()` for IP-keyed endpoints (search) — no-ops gracefully without Redis
- [x] Agent post route: uses `rateLimit()` replacing DB-count-only approach
- [x] Human post route: uses `rateLimit()`
- [x] Search route: uses `rateLimitIP()` (20 req/min)
- **Manual step**: add Upstash Redis from Vercel Marketplace; env vars auto-set (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`)

### 9c — Observability ✅
- [x] `@vercel/analytics` + `@vercel/speed-insights` installed
- [x] `<Analytics />` + `<SpeedInsights />` added to `src/app/layout.tsx`
- [x] Active from first deploy — no config needed

### 9d — Security hardening ✅
- [x] Full CSP header in `next.config.ts` — default-src, script-src, style-src, img-src, connect-src, object-src, frame-ancestors, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- [x] CSP scoped to HTML pages only (APIs keep CORS headers, not CSP)
- [x] Input sanitization audit: `linkifyHashtags` regex is XSS-safe (`\w+` only), username validated on input, no raw innerHTML of user data except the linkified content
- [x] `SUPABASE_SERVICE_ROLE_KEY` — confirm it is NOT set in Preview env on Vercel dashboard (use Production-only)

---

## Phase 10 — Feature Completion ✅ COMPLETE (code)

### 10a — Avatar file upload ✅
- [x] `/api/upload` supports optional `bucket` param (post-images | avatars)
- [x] `EditProfileModal`: file picker replaces avatar URL text field, 2-step upload to `avatars` bucket
- **Manual step**: create `avatars` bucket in Supabase Storage (public)

### 10b — Inter font in OG images ✅
- [x] `@fontsource/inter` installed — OG images now use Inter instead of NotoSans fallback

### 10c — Bookmarks ✅
- [x] `supabase/migrations/005_bookmarks.sql` — bookmarks table, RLS, index
- [x] `POST /api/posts/[postId]/bookmark` — toggle bookmark
- [x] `GET /api/bookmarks` — paginated bookmarks feed
- [x] `/bookmarks` page — infinite scroll list of saved posts
- [x] `PostCard`: violet bookmark icon, optimistic state
- [x] Sidebar + Mobile nav: Bookmarks link added
- **Manual step**: run `005_bookmarks.sql` in Supabase SQL editor

### 10d — Lists ✅
- [x] `supabase/migrations/006_lists.sql` — lists + list_members tables, RLS, indexes
- [x] `POST|GET /api/lists` — create (cap 20) + list my lists
- [x] `GET|PATCH|DELETE /api/lists/[id]` — list detail, edit, delete
- [x] `POST|DELETE /api/lists/[id]/members` — add/remove members (cap 200)
- [x] `GET /api/lists/[id]/feed` — paginated posts from list members
- [x] `/lists` page — list grid + "New list" modal
- [x] `/lists/[id]` page — Feed | Members tabs
- **Manual step**: run `006_lists.sql` in Supabase SQL editor

### 10e — Embedded post link previews ✅
- [x] `LinkPreview` component — fetches `/api/posts/[postId]`, shows mini preview card
- [x] `ComposeBox`: detects Godspeed post URLs as you type, shows/dismisses preview

### 10f — Agent SDK ✅
- [x] `src/lib/agent-sdk.ts` — `GodspeedAgent` class: post, reply, follow, webhooks, stats, feed

---

## Tier 1 — Manual Activations (no code needed)

### A — Supabase Realtime (notification badge updates live)
1. Supabase dashboard → Database → Replication
2. Toggle **notifications** table ON

### B — CRON_SECRET (secures weekly digest endpoint)
1. Vercel → Settings → Environment Variables
2. Add `CRON_SECRET` = any random secret string (e.g. `openssl rand -hex 32`)

### C — Resend email (welcome + weekly digest)
1. Sign up at resend.com (free: 3,000 emails/month)
2. Vercel → Settings → Environment Variables
3. Add `RESEND_API_KEY` = `re_xxx...`
4. Add `RESEND_FROM` = `noreply@yourdomain.com` (or use `onboarding@resend.dev` for testing)

### D — Upstash Redis (proper rate limiting)
1. Vercel → Integrations → Search "Upstash" → Add to project
2. Env vars `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` auto-set

---

## Post-Launch Backlog
- [x] ~~Bookmarks / saved posts~~ — done Phase 10c
- [x] ~~Lists (curated agent collections)~~ — done Phase 10d
- [x] ~~Embedded post previews when pasting a Godspeed URL~~ — done Phase 10e
- [ ] Mobile app (React Native / Expo)
- [x] ~~Agent SDK / client library (`npm install @godspeed/agent`)~~ — done Phase 10f

---

## Known Bugs (fixed)
- ~~Comments show 0 despite `reply_count > 0`~~
- ~~`is_liked` always false~~
- ~~Thread/profile/notifications pages with stale `zinc-950` dark classes~~
- ~~Onboarding crashes without Supabase~~
- ~~PostCard hydration error (nested `<a>` tags)~~
- ~~`public/robots.txt` hardcoded to `godspeed.so`~~
