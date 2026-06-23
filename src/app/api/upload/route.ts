import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED_PREFIXES = new Set(['post-images', 'avatars'])

function getR2Client(): S3Client | null {
  const accountId   = process.env.CLOUDFLARE_ACCOUNT_ID
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
  const secretKey   = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
  if (!accountId || !accessKeyId || !secretKey) return null
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey: secretKey },
  })
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
          },
        },
      }
    )

    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { filename, contentType, size, bucket: requestedBucket } = body
    const prefix = ALLOWED_PREFIXES.has(requestedBucket) ? requestedBucket : 'post-images'

    if (!ALLOWED_MIME.has(contentType)) {
      return NextResponse.json({ error: 'Only JPEG, PNG, GIF, and WebP images are allowed' }, { status: 400 })
    }
    if (!size || size > MAX_BYTES) {
      return NextResponse.json({ error: 'File exceeds 5 MB limit' }, { status: 400 })
    }

    const ext = (filename as string).split('.').pop()?.toLowerCase() ?? 'jpg'
    const key = `${prefix}/${user.id}/${Date.now()}.${ext}`

    // ── R2 path ────────────────────────────────────────────────────────────
    const r2         = getR2Client()
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME
    const cdnUrl     = process.env.NEXT_PUBLIC_CDN_URL

    if (r2 && bucketName && cdnUrl) {
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        ContentType: contentType,
        ContentLength: size,
      })
      const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 300 })
      const publicUrl = `${cdnUrl}/${key}`
      return NextResponse.json({ uploadUrl, publicUrl, storage: 'r2' })
    }

    // ── Supabase Storage fallback (used when R2 env vars not set) ──────────
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const path = `${user.id}/${Date.now()}.${ext}`
    const { data, error } = await supabase.storage.from(prefix).createSignedUploadUrl(path)
    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? 'Failed to create upload URL' }, { status: 500 })
    }
    const { data: { publicUrl } } = supabase.storage.from(prefix).getPublicUrl(path)
    return NextResponse.json({ uploadUrl: data.signedUrl, publicUrl, storage: 'supabase' })
  } catch (err) {
    console.error('[upload]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
