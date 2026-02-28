/**
 * Vercel Edge Middleware: serves dynamic OG meta tags to social media crawlers.
 * Normal users get the SPA as usual.
 */

const BOT_USER_AGENTS = [
  'facebookexternalhit',
  'Facebot',
  'Twitterbot',
  'LinkedInBot',
  'WhatsApp',
  'Slackbot',
  'Discordbot',
  'TelegramBot',
  'Googlebot',
  'bingbot',
  'Applebot',
]

function isBot(ua: string): boolean {
  const lower = ua.toLowerCase()
  return BOT_USER_AGENTS.some((bot) => lower.includes(bot.toLowerCase()))
}

interface RouteMatch {
  type: 'bet' | 'competition' | 'profile'
  id: string
}

function matchRoute(pathname: string): RouteMatch | null {
  let m = pathname.match(/^\/bet\/([a-f0-9-]+)/)
  if (m) return { type: 'bet', id: m[1] }

  m = pathname.match(/^\/compete\/([a-f0-9-]+)/)
  if (m) return { type: 'competition', id: m[1] }

  m = pathname.match(/^\/profile\/([a-f0-9-]+)/)
  if (m) return { type: 'profile', id: m[1] }

  return null
}

function buildOGImageUrl(origin: string, params: Record<string, string>): string {
  const url = new URL('/api/og', origin)
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v)
  }
  return url.toString()
}

function ogHtml(opts: {
  url: string
  title: string
  description: string
  imageUrl: string
}): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${opts.title}</title>
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${opts.url}" />
  <meta property="og:title" content="${opts.title}" />
  <meta property="og:description" content="${opts.description}" />
  <meta property="og:image" content="${opts.imageUrl}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:site_name" content="LYNK" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${opts.title}" />
  <meta name="twitter:description" content="${opts.description}" />
  <meta name="twitter:image" content="${opts.imageUrl}" />
  <meta http-equiv="refresh" content="0;url=${opts.url}" />
</head>
<body>
  <p>Redirecting to <a href="${opts.url}">${opts.title}</a></p>
</body>
</html>`
}

export default function middleware(request: Request): Response | undefined {
  const ua = request.headers.get('user-agent') ?? ''
  if (!isBot(ua)) return undefined // passthrough to SPA

  const url = new URL(request.url)
  const route = matchRoute(url.pathname)
  if (!route) return undefined // passthrough — no dynamic OG needed

  const origin = url.origin
  const fullUrl = url.toString()
  const description = 'Make claims. Bet on friends. Face the consequences.'

  if (route.type === 'bet') {
    const title = url.searchParams.get('t') || 'Bet on LYNK'
    const imageUrl = buildOGImageUrl(origin, {
      type: 'bet',
      title,
    })
    return new Response(ogHtml({ url: fullUrl, title, description, imageUrl }), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  if (route.type === 'competition') {
    const title = url.searchParams.get('t') || 'Competition on LYNK'
    const imageUrl = buildOGImageUrl(origin, {
      type: 'competition',
      title,
    })
    return new Response(ogHtml({ url: fullUrl, title, description, imageUrl }), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  if (route.type === 'profile') {
    const title = url.searchParams.get('t') || 'Player on LYNK'
    const imageUrl = buildOGImageUrl(origin, {
      type: 'profile',
      title,
    })
    return new Response(ogHtml({ url: fullUrl, title, description, imageUrl }), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  return undefined
}

export const config = {
  matcher: ['/bet/:path*', '/compete/:path*', '/profile/:path*'],
}
