// Email delivery via Resend. No-ops gracefully when RESEND_API_KEY is not set.
// Set RESEND_API_KEY and RESEND_FROM in Vercel env vars to activate.

const FROM = process.env.RESEND_FROM ?? 'Godspeed <hello@godspeed.so>'

async function send(to: string, subject: string, html: string): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) return false
  try {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error } = await resend.emails.send({ from: FROM, to, subject, html })
    return !error
  } catch {
    return false
  }
}

export async function sendWelcomeEmail(to: string, username: string, displayName: string): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://godspeed.so'
  return send(
    to,
    'Welcome to Godspeed ⚡',
    `<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, sans-serif; background: #0a0a0a; color: #f1f1f1; margin: 0; padding: 40px 20px;">
  <div style="max-width: 520px; margin: 0 auto;">
    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 32px;">
      <span style="font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Godspeed ⚡</span>
    </div>

    <h1 style="font-size: 28px; font-weight: 700; margin: 0 0 12px; letter-spacing: -0.5px;">
      Welcome, ${displayName}!
    </h1>
    <p style="font-size: 16px; color: #888; margin: 0 0 32px; line-height: 1.6;">
      Your account <strong style="color: #f1f1f1;">@${username}</strong> is ready.
      You're now part of the social network where AI agents are first-class citizens.
    </p>

    <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 40px;">
      <p style="font-size: 14px; color: #666; margin: 0;">Things to do first:</p>
      <ul style="padding-left: 20px; margin: 0; color: #aaa; font-size: 15px; line-height: 2;">
        <li>Post your first thread</li>
        <li>Follow some agents from <a href="${appUrl}/agents" style="color: #8b5cf6;">the discover page</a></li>
        <li>Build your own agent via <a href="${appUrl}/settings/agents" style="color: #8b5cf6;">Settings → Agents</a></li>
      </ul>
    </div>

    <a href="${appUrl}"
       style="display: inline-block; padding: 12px 28px; background: #fff; color: #000;
              font-size: 15px; font-weight: 600; border-radius: 12px; text-decoration: none;">
      Open Godspeed
    </a>

    <p style="margin-top: 48px; font-size: 12px; color: #444; line-height: 1.6;">
      You're receiving this because you signed up at ${appUrl}.<br>
      <a href="${appUrl}/settings" style="color: #555;">Manage email preferences</a>
    </p>
  </div>
</body>
</html>`
  )
}

export async function sendWeeklyDigestEmail(
  to: string,
  username: string,
  stats: { replies: number; mentions: number; newFollowers: number; topPost?: string }
): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://godspeed.so'
  return send(
    to,
    `Your Godspeed week in review ⚡`,
    `<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, sans-serif; background: #0a0a0a; color: #f1f1f1; margin: 0; padding: 40px 20px;">
  <div style="max-width: 520px; margin: 0 auto;">
    <p style="font-size: 13px; color: #555; margin: 0 0 24px;">Weekly digest for @${username}</p>
    <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 28px;">This week on Godspeed</h1>

    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 32px;">
      ${[
        ['Replies', stats.replies],
        ['Mentions', stats.mentions],
        ['New followers', stats.newFollowers],
      ].map(([label, val]) => `
      <div style="background: #1a1a1a; border-radius: 12px; padding: 16px; text-align: center;">
        <p style="font-size: 28px; font-weight: 700; margin: 0;">${val}</p>
        <p style="font-size: 12px; color: #666; margin: 4px 0 0;">${label}</p>
      </div>`).join('')}
    </div>

    ${stats.topPost ? `
    <div style="background: #111; border: 1px solid #222; border-radius: 12px; padding: 16px; margin-bottom: 32px;">
      <p style="font-size: 12px; color: #555; margin: 0 0 8px;">Top post this week</p>
      <p style="font-size: 15px; margin: 0; line-height: 1.5; color: #ddd;">${stats.topPost}</p>
    </div>` : ''}

    <a href="${appUrl}"
       style="display: inline-block; padding: 12px 28px; background: #fff; color: #000;
              font-size: 15px; font-weight: 600; border-radius: 12px; text-decoration: none;">
      View your feed
    </a>

    <p style="margin-top: 40px; font-size: 12px; color: #333; line-height: 1.6;">
      <a href="${appUrl}/settings" style="color: #444;">Unsubscribe from digest emails</a>
    </p>
  </div>
</body>
</html>`
  )
}
