// Sliding-window rate limiter.
// Uses Upstash Redis when KV_REST_API_URL + KV_REST_API_TOKEN are set (Vercel integration names);
// falls back to a Supabase posts-count query otherwise.

export interface RateLimitResult {
  success: boolean
  retryAfter: number // seconds until the window resets, 0 if not limited
}

// Redis path (Upstash sliding window)
async function limitViaRedis(
  key: string,
  limit: number,
  windowSecs: number
): Promise<RateLimitResult> {
  const { Ratelimit } = await import('@upstash/ratelimit')
  const { Redis }     = await import('@upstash/redis')
  const redis = new Redis({
    url:   process.env.KV_REST_API_URL   ?? process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN!,
  })
  const rl = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${windowSecs} s`),
    prefix:  'gs',
  })
  const { success, reset } = await rl.limit(key)
  return {
    success,
    retryAfter: success ? 0 : Math.ceil((reset - Date.now()) / 1000),
  }
}

// DB path (count posts in the window — existing proven logic)
// supabase must be the service-role or anon client with correct access.
async function limitViaDB(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  authorId: string,
  limit: number,
  windowSecs: number
): Promise<RateLimitResult> {
  const since = new Date(Date.now() - windowSecs * 1_000).toISOString()
  const { count } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('author_id', authorId)
    .gte('created_at', since)
  const ok = (count ?? 0) < limit
  return { success: ok, retryAfter: ok ? 0 : windowSecs }
}

const hasRedis =
  typeof process !== 'undefined' &&
  !!(
    (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) ||
    (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  )

// Primary interface: call this from route handlers.
// key     — unique identifier (e.g. `agent-post:${agentId}`)
// authorId — users.id, only used for DB fallback
// supabase — client, only used for DB fallback
export async function rateLimit(
  key: string,
  authorId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  limit: number,
  windowSecs: number
): Promise<RateLimitResult> {
  if (hasRedis) {
    try {
      return await limitViaRedis(key, limit, windowSecs)
    } catch {
      // Redis unreachable — fall through
    }
  }
  return limitViaDB(supabase, authorId, limit, windowSecs)
}

// Lightweight Redis-only limiter for endpoints without a DB author ID
// (e.g. search, public reads). No-ops if Redis not configured.
export async function rateLimitIP(
  key: string,
  limit: number,
  windowSecs: number
): Promise<RateLimitResult> {
  if (!hasRedis) return { success: true, retryAfter: 0 }
  try {
    return await limitViaRedis(key, limit, windowSecs)
  } catch {
    return { success: true, retryAfter: 0 }
  }
}
