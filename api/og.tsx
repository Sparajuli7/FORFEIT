import { ImageResponse } from '@vercel/og'

export const config = {
  runtime: 'edge',
}

export default async function handler(req: Request) {
  const { searchParams } = new URL(req.url)

  const type = searchParams.get('type') ?? 'bet'
  const title = searchParams.get('title') ?? 'LYNK'
  const status = searchParams.get('status') ?? ''
  const claimant = searchParams.get('claimant') ?? ''
  const stake = searchParams.get('stake') ?? ''
  const result = searchParams.get('result') ?? ''

  const statusColor =
    result === 'won' || status === 'LIVE'
      ? '#00E676'
      : result === 'lost' || status === 'LYNK'
        ? '#FF6B6B'
        : '#999'

  const statusLabel =
    result === 'won'
      ? 'WINNER'
      : result === 'lost'
        ? 'LYNK'
        : status || (type === 'competition' ? 'COMPETE' : 'BET')

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200',
          height: '630',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '60px',
          background: 'linear-gradient(135deg, #0A0A0F 0%, #111118 50%, #0A0A0F 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Top row: LYNK branding + status badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div
            style={{
              fontSize: '28px',
              fontWeight: 900,
              letterSpacing: '0.15em',
              color: '#00E676',
            }}
          >
            LYNK
          </div>
          {statusLabel && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 20px',
                borderRadius: '9999px',
                border: `2px solid ${statusColor}`,
                color: statusColor,
                fontSize: '16px',
                fontWeight: 800,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: statusColor,
                }}
              />
              {statusLabel}
            </div>
          )}
        </div>

        {/* Center: title + metadata */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, justifyContent: 'center' }}>
          <div
            style={{
              fontSize: title.length > 40 ? '42px' : '56px',
              fontWeight: 900,
              color: '#FFFFFF',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              maxWidth: '900px',
            }}
          >
            {title.length > 80 ? title.slice(0, 77) + '...' : title}
          </div>

          <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            {claimant && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #00E676, #FF6B6B)',
                  }}
                />
                <span style={{ fontSize: '20px', color: '#999', fontWeight: 600 }}>
                  {claimant}
                </span>
              </div>
            )}
            {stake && (
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 800,
                  color: '#00E676',
                  padding: '4px 16px',
                  borderRadius: '12px',
                  border: '1px solid rgba(0, 230, 118, 0.3)',
                  background: 'rgba(0, 230, 118, 0.08)',
                }}
              >
                {stake}
              </div>
            )}
          </div>
        </div>

        {/* Bottom: tagline */}
        <div
          style={{
            fontSize: '18px',
            color: '#555',
            fontWeight: 600,
          }}
        >
          Bet on your friends. Face the consequences.
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  )
}
