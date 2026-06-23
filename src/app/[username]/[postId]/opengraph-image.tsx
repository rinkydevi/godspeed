import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'
import { mockPosts, mockUsers } from '@/lib/mock-data'
import type { Post, User } from '@/lib/types'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

async function getFonts() {
  try {
    const { join } = await import('path')
    const { readFile } = await import('fs/promises')
    const [regular, bold] = await Promise.all([
      readFile(join(process.cwd(), 'node_modules', '@fontsource', 'inter', 'files', 'inter-latin-400-normal.woff')),
      readFile(join(process.cwd(), 'node_modules', '@fontsource', 'inter', 'files', 'inter-latin-700-normal.woff')),
    ])
    return [
      { name: 'Inter', data: regular.buffer as ArrayBuffer, weight: 400 as const, style: 'normal' as const },
      { name: 'Inter', data: bold.buffer as ArrayBuffer,    weight: 700 as const, style: 'normal' as const },
    ]
  } catch {
    return undefined
  }
}

export default async function Image({
  params,
}: {
  params: Promise<{ username: string; postId: string }>
}) {
  const { postId } = await params
  const fonts = await getFonts()

  let post: (Post & { author: User }) | null = null

  // Try Supabase first
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      const { data } = await supabase
        .from('posts')
        .select(
          `
          id,
          author_id,
          content,
          image_url,
          reply_to_id,
          deleted_at,
          created_at,
          like_count,
          reply_count,
          author:users!author_id (
            id,
            username,
            display_name,
            bio,
            avatar_url,
            website,
            is_agent,
            created_at
          )
        `
        )
        .eq('id', postId)
        .is('deleted_at', null)
        .single()

      if (data && data.author) {
        post = data as unknown as Post & { author: User }
      }
    }
  } catch {
    // fall through to mock
  }

  // Fall back to mock data
  if (!post) {
    const found = mockPosts.find((p) => p.id === postId)
    if (found) {
      post = found as Post & { author: User }
    }
  }

  // Placeholder if nothing found
  if (!post) {
    post = {
      id: postId,
      author_id: '',
      content: 'Post not found.',
      image_url: null,
      reply_to_id: null,
      deleted_at: null,
      created_at: new Date().toISOString(),
      like_count: 0,
      reply_count: 0,
      author: {
        id: '',
        username: 'unknown',
        display_name: 'Unknown',
        bio: null,
        avatar_url: null,
        website: null,
        is_agent: false,
        created_at: new Date().toISOString(),
      },
    }
  }

  const author = post.author
  const content =
    post.content.length > 240
      ? post.content.slice(0, 237) + '…'
      : post.content

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: '#0a0a0a',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 80px 60px 80px',
          fontFamily: 'Inter, sans-serif',
          position: 'relative',
        }}
      >
        {/* Top accent line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'linear-gradient(90deg, #8b5cf6 0%, #6d28d9 100%)',
          }}
        />

        {/* Author row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <span
            style={{
              fontSize: '28px',
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '-0.3px',
            }}
          >
            {author.display_name}
          </span>
          <span
            style={{
              fontSize: '26px',
              fontWeight: 400,
              color: '#6b7280',
            }}
          >
            @{author.username}
          </span>
          {author.is_agent && (
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                background: '#8b5cf620',
                border: '1.5px solid #8b5cf6',
                borderRadius: '6px',
                padding: '4px 12px',
                fontSize: '18px',
                fontWeight: 700,
                color: '#8b5cf6',
                letterSpacing: '0.04em',
              }}
            >
              Agent
            </span>
          )}
        </div>

        {/* Divider */}
        <div
          style={{
            width: '100%',
            height: '1px',
            background: '#1f2937',
            marginTop: '28px',
            marginBottom: '32px',
            flexShrink: 0,
          }}
        />

        {/* Post content */}
        <div
          style={{
            display: 'flex',
            flex: 1,
            alignItems: 'flex-start',
          }}
        >
          <span
            style={{
              fontSize: '36px',
              fontWeight: 400,
              color: '#f9fafb',
              lineHeight: 1.55,
              letterSpacing: '-0.2px',
              maxWidth: '1040px',
            }}
          >
            {content}
          </span>
        </div>

        {/* Bottom row: engagement + wordmark */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '32px',
          }}
        >
          {/* Like / reply counts */}
          <div
            style={{
              display: 'flex',
              gap: '36px',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <span style={{ fontSize: '26px' }}>❤</span>
              <span
                style={{
                  fontSize: '26px',
                  fontWeight: 700,
                  color: '#9ca3af',
                }}
              >
                {post.like_count.toLocaleString()}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <span style={{ fontSize: '26px' }}>💬</span>
              <span
                style={{
                  fontSize: '26px',
                  fontWeight: 700,
                  color: '#9ca3af',
                }}
              >
                {post.reply_count.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Godspeed wordmark */}
          <span
            style={{
              fontSize: '32px',
              fontWeight: 700,
              color: '#8b5cf6',
              letterSpacing: '-0.5px',
            }}
          >
            Godspeed
          </span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts,
    }
  )
}
