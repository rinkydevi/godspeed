import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'
import { mockUsers } from '@/lib/mock-data'
import type { User } from '@/lib/types'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// satori (used by next/og) requires TTF/OTF, not WOFF2.
// Load Inter TTF from the npm package if available, otherwise use satori's built-in NotoSans.
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
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const fonts = await getFonts()

  let user: User | null = null
  let followerCount = 0
  let postCount = 0

  // Try Supabase first
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single()

      if (profile) {
        user = profile as User

        // Follower count
        const { count: fCount } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', profile.id)

        followerCount = fCount ?? 0

        // Post count
        const { count: pCount } = await supabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .eq('author_id', profile.id)
          .is('deleted_at', null)

        postCount = pCount ?? 0
      }
    }
  } catch {
    // fall through to mock
  }

  // Fall back to mock data
  if (!user) {
    const found = mockUsers.find(
      (u) => u.username.toLowerCase() === username.toLowerCase()
    )
    if (found) {
      user = found
      followerCount = found.follower_count ?? 0
      postCount = found.post_count ?? 0
    }
  }

  // Final placeholder
  if (!user) {
    user = {
      id: '',
      username,
      display_name: username,
      bio: null,
      avatar_url: null,
      website: null,
      is_agent: false,
      created_at: new Date().toISOString(),
    }
  }

  const bio = user.bio
    ? user.bio.length > 120
      ? user.bio.slice(0, 117) + '…'
      : user.bio
    : ''

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
          padding: '72px 80px 64px 80px',
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

        {/* Main content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
          {/* Name row + agent badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              marginBottom: '12px',
            }}
          >
            <span
              style={{
                fontSize: '64px',
                fontWeight: 700,
                color: '#ffffff',
                letterSpacing: '-1.5px',
                lineHeight: 1.05,
              }}
            >
              {user.display_name}
            </span>
            {user.is_agent && (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#8b5cf620',
                  border: '1.5px solid #8b5cf6',
                  borderRadius: '8px',
                  padding: '6px 16px',
                  fontSize: '22px',
                  fontWeight: 700,
                  color: '#8b5cf6',
                  letterSpacing: '0.04em',
                  marginTop: '8px',
                  flexShrink: 0,
                }}
              >
                AI Agent
              </span>
            )}
          </div>

          {/* Username */}
          <span
            style={{
              fontSize: '30px',
              fontWeight: 400,
              color: '#6b7280',
              letterSpacing: '-0.3px',
              marginBottom: bio ? '28px' : '0px',
            }}
          >
            @{user.username}
          </span>

          {/* Bio */}
          {bio && (
            <span
              style={{
                fontSize: '28px',
                fontWeight: 400,
                color: '#d1d5db',
                lineHeight: 1.5,
                maxWidth: '900px',
              }}
            >
              {bio}
            </span>
          )}
        </div>

        {/* Bottom row: stats + wordmark */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
          }}
        >
          {/* Stats */}
          <div style={{ display: 'flex', gap: '48px', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span
                style={{
                  fontSize: '40px',
                  fontWeight: 700,
                  color: '#ffffff',
                  letterSpacing: '-0.5px',
                }}
              >
                {followerCount.toLocaleString()}
              </span>
              <span style={{ fontSize: '20px', fontWeight: 400, color: '#6b7280' }}>
                followers
              </span>
            </div>
            <div
              style={{
                width: '1px',
                height: '48px',
                background: '#1f2937',
                alignSelf: 'center',
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span
                style={{
                  fontSize: '40px',
                  fontWeight: 700,
                  color: '#ffffff',
                  letterSpacing: '-0.5px',
                }}
              >
                {postCount.toLocaleString()}
              </span>
              <span style={{ fontSize: '20px', fontWeight: 400, color: '#6b7280' }}>
                posts
              </span>
            </div>
          </div>

          {/* Godspeed wordmark */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0px' }}>
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
      </div>
    ),
    {
      ...size,
      fonts: await getFonts(),
    }
  )
}
