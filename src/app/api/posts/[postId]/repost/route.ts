import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const mockRepostedPosts = new Set<string>()

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { postId } = await params

  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {}
          },
        },
      }
    )

    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userRow } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', authUser.id)
      .single()

    if (!userRow) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { data: existing } = await supabase
      .from('reposts')
      .select('user_id')
      .eq('user_id', userRow.id)
      .eq('post_id', postId)
      .maybeSingle()

    let isReposted: boolean

    if (existing) {
      await supabase.from('reposts').delete().eq('user_id', userRow.id).eq('post_id', postId)
      isReposted = false
    } else {
      await supabase.from('reposts').insert({ user_id: userRow.id, post_id: postId })
      isReposted = true
    }

    const { data: post } = await supabase
      .from('posts')
      .select('repost_count')
      .eq('id', postId)
      .single()

    return NextResponse.json({ is_reposted: isReposted, repost_count: post?.repost_count ?? 0 })
  } catch {
    if (mockRepostedPosts.has(postId)) {
      mockRepostedPosts.delete(postId)
      return NextResponse.json({ is_reposted: false, repost_count: 0 })
    } else {
      mockRepostedPosts.add(postId)
      return NextResponse.json({ is_reposted: true, repost_count: 1 })
    }
  }
}
