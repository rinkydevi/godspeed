import type { NextConfig } from 'next'

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : '*.supabase.co'

// R2 CDN hostname — only set when Cloudflare is configured.
// Used to pin remotePatterns and img-src instead of the open wildcard.
const cdnHost = process.env.NEXT_PUBLIC_CDN_URL
  ? new URL(process.env.NEXT_PUBLIC_CDN_URL).hostname
  : null

// 'unsafe-inline' required for the theme-init inline script in layout.tsx.
// 'unsafe-eval' scoped to non-production so Vercel Live works in preview.
const scriptSrc = process.env.VERCEL_ENV === 'production'
  ? `script-src 'self' 'unsafe-inline' https://*.vercel.app`
  : `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://*.vercel.app`

const imgSrc = [
  `img-src 'self' blob: data:`,
  `https://api.dicebear.com`,
  `https://${supabaseHost}`,
  `https://lh3.googleusercontent.com`,
  `https://fonts.gstatic.com`,
  cdnHost ? `https://${cdnHost}` : '',
].filter(Boolean).join(' ')

const csp = [
  `default-src 'self'`,
  scriptSrc,
  `style-src 'self' 'unsafe-inline'`,
  imgSrc,
  `font-src 'self' https://fonts.gstatic.com`,
  `connect-src 'self' https://${supabaseHost} wss://${supabaseHost} https://vitals.vercel-insights.com https://*.upstash.io`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `frame-ancestors 'none'`,
  `upgrade-insecure-requests`,
].join('; ')

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'api.dicebear.com',          pathname: '/**' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com', pathname: '/**' },
      // Supabase Storage — kept for images uploaded before R2 migration
      { protocol: 'https', hostname: '**.supabase.co', pathname: '/storage/v1/object/public/**' },
      // R2 CDN — replaces the open wildcard once NEXT_PUBLIC_CDN_URL is set
      ...(cdnHost
        ? [{ protocol: 'https' as const, hostname: cdnHost, pathname: '/**' }]
        : [{ protocol: 'https' as const, hostname: '**' }] // fallback until CDN is configured
      ),
    ],
  },
  async redirects() {
    return [
      {
        source: '/u/:username',
        destination: '/:username',
        permanent: true,
      },
    ]
  },

  async headers() {
    return [
      {
        source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
        headers: [
          { key: 'Content-Security-Policy',   value: csp },
          { key: 'X-Frame-Options',           value: 'DENY' },
          { key: 'X-Content-Type-Options',    value: 'nosniff' },
          { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin',  value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, PATCH, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
      {
        source: '/llms.txt',
        headers: [
          { key: 'Content-Type',                value: 'text/plain; charset=utf-8' },
          { key: 'Cache-Control',               value: 'public, max-age=3600, s-maxage=3600' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
      {
        source: '/u/:path*/agent.json',
        headers: [
          { key: 'Content-Type',                value: 'application/json' },
          { key: 'Cache-Control',               value: 'public, max-age=300, s-maxage=300' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
    ]
  },
}

export default nextConfig
