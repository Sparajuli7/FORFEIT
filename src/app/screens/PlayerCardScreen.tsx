import { useEffect, useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router'
import { ArrowLeft, Share2, Download } from 'lucide-react'
import { captureElementAsImage, shareImage, downloadImage } from '@/lib/utils/imageExport'
import { useAuthStore } from '@/stores'
import { getBetStatsForUser } from '@/lib/api/stats'
import { formatMoney } from '@/lib/utils/formatters'
import { BET_CATEGORIES } from '@/lib/utils/constants'
import type { BetStatsForUser } from '@/lib/api/stats'
import type { Profile } from '@/lib/database.types'
import { ShareSheet } from '@/app/components/ShareSheet'
import { shareWithNative } from '@/lib/share'

// ---------------------------------------------------------------------------
// Tier + title engine
// ---------------------------------------------------------------------------

type CardTier = 'legendary' | 'reliable' | 'sketchy'

function getTier(repScore: number): CardTier {
  if (repScore >= 90) return 'legendary'
  if (repScore >= 70) return 'reliable'
  return 'sketchy'
}

function getPlayerTitle(
  wins: number,
  losses: number,
  punishmentsTaken: number,
  currentStreak: number,
  moneyWon: number,
): string {
  const total = wins + losses
  const winRate = total > 0 ? wins / total : 0
  if (moneyWon >= 50000) return 'The Whale 🐋'
  if (currentStreak >= 7) return 'On Fire 🔥'
  if (winRate >= 0.85 && total >= 5) return 'The Untouchable 👑'
  if (winRate >= 0.70 && total >= 3) return 'The Closer 🎯'
  if (punishmentsTaken >= 5) return 'Punishment Magnet 💀'
  if (losses > wins && total >= 4) return 'Built Different 😅'
  if (total === 0) return 'The Rookie 🌱'
  return 'The Contender ⚔️'
}

function getFavoriteCategory(completedBets: BetStatsForUser['completedBets']): string {
  if (completedBets.length === 0) return '—'
  const counts: Record<string, number> = {}
  for (const { bet } of completedBets) {
    const cat = bet.category ?? 'wildcard'
    counts[cat] = (counts[cat] ?? 0) + 1
  }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  if (!top) return '—'
  const cat = BET_CATEGORIES[top[0] as keyof typeof BET_CATEGORIES]
  return cat ? `${cat.emoji} ${cat.label}` : top[0]
}

function getBiggestSingleWin(completedBets: BetStatsForUser['completedBets']): number {
  return completedBets
    .filter((r) => r.userResult === 'won')
    .reduce((max, r) => Math.max(max, r.stakeMoney), 0)
}

function getMostCreativePunishment(completedBets: BetStatsForUser['completedBets']): string | null {
  const withCustom = completedBets
    .filter((r) => r.userResult === 'lost' && r.punishmentLabel && r.punishmentLabel !== 'Punishment')
    .map((r) => r.punishmentLabel!)
    .filter(Boolean)
  // Return the longest (most creative) one
  if (withCustom.length === 0) return null
  return withCustom.sort((a, b) => b.length - a.length)[0]
}

// ---------------------------------------------------------------------------
// Tier visual config
// ---------------------------------------------------------------------------

const TIER = {
  legendary: {
    label: 'LEGENDARY',
    typeEmoji: '⚡',
    borderColors: ['#FFD700', '#FFA500', '#FF6B6B', '#C471ED', '#FFD700'],
    glowColor: 'rgba(255, 215, 0, 0.7)',
    glowColorFaint: 'rgba(255, 215, 0, 0.15)',
    hpColor: '#FFD700',
    badgeGradient: 'linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)',
    badgeText: '#1A0A00',
    cardBg: 'linear-gradient(145deg, #1a1200 0%, #0d0d0d 40%, #1a1000 100%)',
    accentBar: '#FFD700',
    shimmer1: 'rgba(255,215,0,0.18)',
    shimmer2: 'rgba(200,100,230,0.12)',
    flavorText: 'Feared across every group chat. A force of nature.',
    number: '#C471ED',
  },
  reliable: {
    label: 'RELIABLE',
    typeEmoji: '🌿',
    borderColors: ['#00C853', '#00BCD4', '#0091EA', '#1B5E20', '#00C853'],
    glowColor: 'rgba(0, 200, 83, 0.6)',
    glowColorFaint: 'rgba(0, 200, 83, 0.12)',
    hpColor: '#00C853',
    badgeGradient: 'linear-gradient(135deg, #00C853 0%, #00BCD4 100%)',
    badgeText: '#001A08',
    cardBg: 'linear-gradient(145deg, #001a08 0%, #0d0d0d 40%, #001a10 100%)',
    accentBar: '#00C853',
    shimmer1: 'rgba(0,200,83,0.15)',
    shimmer2: 'rgba(0,188,212,0.10)',
    flavorText: 'Steady, consistent, and dangerous. A true competitor.',
    number: '#00BCD4',
  },
  sketchy: {
    label: 'SKETCHY',
    typeEmoji: '🔥',
    borderColors: ['#FF6B6B', '#FF8E53', '#FF6B9D', '#FF4444', '#FF6B6B'],
    glowColor: 'rgba(255, 107, 107, 0.65)',
    glowColorFaint: 'rgba(255, 107, 107, 0.12)',
    hpColor: '#FF6B6B',
    badgeGradient: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
    badgeText: '#1A0000',
    cardBg: 'linear-gradient(145deg, #1a0400 0%, #0d0d0d 40%, #1a0800 100%)',
    accentBar: '#FF6B6B',
    shimmer1: 'rgba(255,107,107,0.15)',
    shimmer2: 'rgba(255,142,83,0.10)',
    flavorText: 'Chaotic, unpredictable, and always in the mix.',
    number: '#FF8E53',
  },
} as const

// ---------------------------------------------------------------------------
// Stat bar
// ---------------------------------------------------------------------------

function StatBar({ label, value, max = 100, color }: { label: string; value: number; max?: number; color: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-black uppercase tracking-widest w-8 shrink-0" style={{ color }}>
        {label}
      </span>
      <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}cc, ${color})`,
          }}
        />
      </div>
      <span className="text-[10px] font-black tabular-nums w-7 text-right" style={{ color }}>
        {value}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// The card itself (extracted so it can be screenshot-targeted)
// ---------------------------------------------------------------------------

function TradingCard({
  profile,
  stats,
}: {
  profile: Profile
  stats: BetStatsForUser
}) {
  const tier = getTier(profile.rep_score)
  const cfg = TIER[tier]

  const t = stats.totals
  const completedBets = stats.completedBets
  const total = t.wins + t.losses
  const winRate = total > 0 ? Math.round((t.wins / total) * 100) : 0

  // Use the larger of stored punishments_taken or dynamically-computed punishmentsLost
  // so the card is always accurate regardless of when recordPunishmentTaken ran
  const punishmentsTaken = Math.max(profile.punishments_taken, t.punishmentsLost)
  const pendingPunishments = Math.max(0, punishmentsTaken - profile.punishments_completed)
  const completionRate =
    punishmentsTaken > 0
      ? Math.round((profile.punishments_completed / punishmentsTaken) * 100)
      : 100

  const playerTitle = getPlayerTitle(t.wins, t.losses, profile.punishments_taken, profile.current_streak, t.moneyWon)
  const favCategory = getFavoriteCategory(completedBets)
  const biggestSingle = getBiggestSingleWin(completedBets)
  const creativePunishment = getMostCreativePunishment(completedBets)

  const borderGradient = `linear-gradient(var(--holo-angle, 135deg), ${cfg.borderColors.join(', ')})`

  const cardNumber = `#${String(profile.total_bets || 1).padStart(3, '0')}`

  return (
    <>
      {/* Inject keyframe animations */}
      <style>{`
        @keyframes holo-rotate {
          0%   { --holo-angle: 135deg; }
          25%  { --holo-angle: 225deg; }
          50%  { --holo-angle: 315deg; }
          75%  { --holo-angle: 45deg; }
          100% { --holo-angle: 135deg; }
        }
        @keyframes shimmer-slide {
          0%   { transform: translateX(-120%) rotate(-30deg); opacity: 0; }
          15%  { opacity: 1; }
          85%  { opacity: 1; }
          100% { transform: translateX(320%) rotate(-30deg); opacity: 0; }
        }
        @keyframes shimmer-slide-2 {
          0%   { transform: translateX(-120%) rotate(-30deg) translateY(40px); opacity: 0; }
          20%  { opacity: 0.7; }
          80%  { opacity: 0.7; }
          100% { transform: translateX(320%) rotate(-30deg) translateY(40px); opacity: 0; }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px 4px ${cfg.glowColor}, 0 0 60px 12px ${cfg.glowColorFaint}; }
          50%       { box-shadow: 0 0 30px 8px ${cfg.glowColor}, 0 0 80px 20px ${cfg.glowColorFaint}; }
        }
        .holo-border {
          background: ${borderGradient};
          animation: holo-rotate 4s linear infinite;
          background-size: 300% 300%;
        }
        .card-glow {
          animation: pulse-glow 3s ease-in-out infinite;
        }
        .shimmer-1 {
          animation: shimmer-slide 3.5s ease-in-out infinite;
          animation-delay: 0.5s;
        }
        .shimmer-2 {
          animation: shimmer-slide-2 3.5s ease-in-out infinite;
          animation-delay: 1.2s;
        }
      `}</style>

      {/* Outer glow wrapper */}
      <div className="card-glow rounded-[20px]">
        {/* Gradient border shell */}
        <div
          className="holo-border rounded-[20px] p-[3px]"
          style={{ background: borderGradient }}
        >
          {/* Inner card */}
          <div
            className="relative rounded-[18px] overflow-hidden"
            style={{
              background: cfg.cardBg,
              width: '310px',
              minHeight: '480px',
            }}
          >
            {/* Diagonal texture overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: `repeating-linear-gradient(
                  45deg,
                  rgba(255,255,255,0.012) 0px,
                  rgba(255,255,255,0.012) 1px,
                  transparent 1px,
                  transparent 8px
                )`,
              }}
            />

            {/* Shimmer overlays */}
            <div
              className="shimmer-1 absolute inset-0 pointer-events-none"
              style={{
                background: `linear-gradient(90deg, transparent 0%, ${cfg.shimmer1} 45%, ${cfg.shimmer2} 55%, transparent 100%)`,
                width: '60%',
                top: 0,
                bottom: 0,
              }}
            />
            <div
              className="shimmer-2 absolute inset-0 pointer-events-none"
              style={{
                background: `linear-gradient(90deg, transparent 0%, ${cfg.shimmer1} 50%, transparent 100%)`,
                width: '40%',
                top: 0,
                bottom: 0,
                opacity: 0.6,
              }}
            />

            {/* ── CARD CONTENT ── */}
            <div className="relative z-10 p-4 flex flex-col gap-3">

              {/* Top row: tier badge + card number + HP */}
              <div className="flex items-center justify-between">
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black tracking-widest uppercase"
                  style={{ background: cfg.badgeGradient, color: cfg.badgeText }}
                >
                  <span>{cfg.typeEmoji}</span>
                  <span>{cfg.label}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-white/40 tabular-nums">{cardNumber}</span>
                  <span className="text-[11px] font-black tabular-nums" style={{ color: cfg.hpColor }}>
                    {profile.rep_score}
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: cfg.hpColor }}>
                    HP
                  </span>
                </div>
              </div>

              {/* Player name + title */}
              <div className="text-center">
                <h2 className="text-[22px] font-black text-white leading-tight tracking-tight">
                  {profile.display_name}
                </h2>
                <p className="text-[11px] font-bold tracking-wide mt-0.5" style={{ color: cfg.hpColor }}>
                  {playerTitle}
                </p>
              </div>

              {/* Avatar */}
              <div className="flex justify-center">
                <div className="relative">
                  {/* Outer glow ring */}
                  <div
                    className="absolute -inset-2 rounded-full blur-md"
                    style={{ background: cfg.glowColor, opacity: 0.6 }}
                  />
                  {/* Border ring */}
                  <div
                    className="relative rounded-full p-[2.5px]"
                    style={{ background: borderGradient }}
                  >
                    <div className="w-[88px] h-[88px] rounded-full overflow-hidden bg-black">
                      <img
                        src={profile.avatar_url ?? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop'}
                        alt={profile.display_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  {/* Win streak badge */}
                  {profile.current_streak > 0 && (
                    <div
                      className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-black"
                      style={{ background: cfg.accentBar, color: cfg.badgeText }}
                    >
                      +{profile.current_streak}
                    </div>
                  )}
                </div>
              </div>

              {/* Record pill */}
              <div
                className="flex justify-center gap-3 py-2 rounded-xl border"
                style={{ borderColor: `${cfg.hpColor}30`, background: `${cfg.hpColor}08` }}
              >
                <div className="text-center">
                  <div className="text-[18px] font-black text-accent-green leading-none">{t.wins}</div>
                  <div className="text-[9px] uppercase tracking-widest text-white/40 mt-0.5">Wins</div>
                </div>
                <div className="w-px bg-white/10" />
                <div className="text-center">
                  <div className="text-[18px] font-black text-accent-coral leading-none">{t.losses}</div>
                  <div className="text-[9px] uppercase tracking-widest text-white/40 mt-0.5">Losses</div>
                </div>
                <div className="w-px bg-white/10" />
                <div className="text-center">
                  <div className="text-[18px] font-black text-white/60 leading-none">{t.voids}</div>
                  <div className="text-[9px] uppercase tracking-widest text-white/40 mt-0.5">Voids</div>
                </div>
                <div className="w-px bg-white/10" />
                <div className="text-center">
                  <div className="text-[18px] font-black leading-none" style={{ color: cfg.hpColor }}>{winRate}%</div>
                  <div className="text-[9px] uppercase tracking-widest text-white/40 mt-0.5">Win%</div>
                </div>
              </div>

              {/* Base stats bars */}
              <div
                className="rounded-xl p-3 border space-y-2"
                style={{ borderColor: `${cfg.hpColor}20`, background: 'rgba(0,0,0,0.4)' }}
              >
                <div className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: cfg.hpColor }}>
                  Base Stats
                </div>
                <StatBar label="ATK" value={winRate} max={100} color={cfg.accentBar} />
                <StatBar label="DEF" value={completionRate} max={100} color={cfg.number} />
                <StatBar label="REP" value={profile.rep_score} max={100} color={cfg.hpColor} />
                <StatBar
                  label="STK"
                  value={Math.max(0, profile.current_streak)}
                  max={10}
                  color={cfg.accentBar}
                />
              </div>

              {/* Trophy stats */}
              <div
                className="rounded-xl p-3 border space-y-1.5"
                style={{ borderColor: `${cfg.hpColor}20`, background: 'rgba(0,0,0,0.4)' }}
              >
                <div className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: cfg.hpColor }}>
                  Hall of Records
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-white/50">💰 Bag secured</span>
                  <span className="text-[11px] font-black text-accent-green">{formatMoney(t.moneyWon)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-white/50">💸 Money lost</span>
                  <span className="text-[11px] font-black text-accent-coral">{formatMoney(t.moneyLost)}</span>
                </div>
                {(biggestSingle > 0 || (profile.biggest_win as number) > 0) && (
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-white/50">🏆 Biggest score</span>
                    <span className="text-[11px] font-black" style={{ color: cfg.hpColor }}>
                      {formatMoney(biggestSingle || (profile.biggest_win as number) || 0)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-white/50">💀 Punishments owed</span>
                  <span className="text-[11px] font-black text-accent-coral">{punishmentsTaken}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-white/50">✅ Proofs submitted</span>
                  <span className="text-[11px] font-black text-accent-green">{profile.punishments_completed}</span>
                </div>
                {pendingPunishments > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-amber-400/80">⏳ Awaiting proof</span>
                    <span className="text-[11px] font-black text-amber-400">{pendingPunishments}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-white/50">🎯 Signature style</span>
                  <span className="text-[11px] font-black text-white/80">{favCategory}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-white/50">📅 Total bets</span>
                  <span className="text-[11px] font-black text-white/80">{profile.total_bets}</span>
                </div>
                {creativePunishment && (
                  <div className="pt-1 border-t border-white/10">
                    <div className="text-[9px] text-white/40 uppercase tracking-widest mb-0.5">Most creative L</div>
                    <div className="text-[10px] font-bold text-accent-coral italic line-clamp-1">"{creativePunishment}"</div>
                  </div>
                )}
              </div>

              {/* Flavor text */}
              <div className="text-center px-2">
                <p className="text-[10px] italic text-white/35 leading-relaxed">
                  "{cfg.flavorText}"
                </p>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-1 border-t border-white/10">
                <span
                  className="text-[11px] font-black tracking-[0.2em] uppercase"
                  style={{ color: cfg.hpColor }}
                >
                  FORFEIT
                </span>
                <span className="text-[9px] text-white/25 tracking-wider">
                  @{profile.username}
                </span>
                <span className="text-[9px] text-white/25">
                  {new Date().getFullYear()} Edition
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Screen wrapper
// ---------------------------------------------------------------------------

export function PlayerCardScreen() {
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const user = useAuthStore((s) => s.user)

  const [stats, setStats] = useState<BetStatsForUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [shared, setShared] = useState(false)
  const [saving, setSaving] = useState(false)
  const [shareSheetOpen, setShareSheetOpen] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user?.id) { setLoading(false); return }
    getBetStatsForUser(user.id)
      .then(setStats)
      .finally(() => setLoading(false))
  }, [user?.id])

  const tier = profile ? getTier(profile.rep_score) : 'sketchy'
  const cfg = TIER[tier]

  const playerShareText = `My FORFEIT player card — ${profile?.wins}W · ${profile?.losses}L · rep ${profile?.rep_score}/100. Can you beat my record? 🎯`
  const playerShareUrl = typeof window !== 'undefined' ? `${window.location.origin}/profile/${profile?.username ?? ''}` : ''

  const handleShare = async () => {
    const usedNative = await shareWithNative({ title: 'My FORFEIT Card', text: playerShareText, url: playerShareUrl })
    if (!usedNative) {
      setShareSheetOpen(true)
    }
    setShared(true)
    setTimeout(() => setShared(false), 2000)
  }

  const handleSaveCard = async () => {
    if (!cardRef.current || saving) return
    setSaving(true)
    try {
      const blob = await captureElementAsImage(cardRef.current, { scale: 2 })
      const text = `My FORFEIT player card — ${profile?.wins}W · ${profile?.losses}L · rep ${profile?.rep_score}/100. Can you beat my record? 🎯`
      await shareImage(blob, 'forfeit-player-card.png', text)
    } catch {
      // If capture fails, fall back to text share
      handleShare()
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="h-full bg-bg-primary flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent-green border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!profile || !stats) {
    return (
      <div className="h-full bg-bg-primary flex items-center justify-center">
        <p className="text-text-muted">Nothing here yet.</p>
      </div>
    )
  }

  return (
    <div
      className="h-full overflow-y-auto pb-8 flex flex-col"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(0,0,0,0.8) 0%, #090909 100%)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-10 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/8 hover:bg-white/12 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white/70" />
        </button>
        <div className="text-center">
          <h1 className="text-sm font-black uppercase tracking-[0.2em]" style={{ color: cfg.hpColor }}>
            Player Card
          </h1>
          <p className="text-[10px] text-white/35 tracking-wider">Limited Edition</p>
        </div>
        <button
          onClick={handleShare}
          className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors"
          style={{ background: shared ? `${cfg.hpColor}30` : 'rgba(255,255,255,0.08)' }}
        >
          {shared
            ? <span className="text-sm">✓</span>
            : <Share2 className="w-4 h-4 text-white/70" />
          }
        </button>
      </div>

      {/* Card centered */}
      <div className="flex-1 flex flex-col items-center justify-start px-4 pb-6 gap-5">
        <div ref={cardRef}>
          <TradingCard profile={profile} stats={stats} />
        </div>

        {/* Pending punishment CTA — shown below the card, not captured in screenshot */}
        {(() => {
          const taken = Math.max(profile.punishments_taken, stats.totals.punishmentsLost)
          const pending = Math.max(0, taken - profile.punishments_completed)
          if (pending === 0) return null
          return (
            <div
              className="w-full max-w-[310px] rounded-2xl border p-4"
              style={{ background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.35)' }}
            >
              <p className="text-sm font-black text-amber-400 mb-1">
                ⏳ {pending} punishment{pending > 1 ? 's' : ''} awaiting proof
              </p>
              <p className="text-xs text-text-muted mb-3">
                Submit proof to officially close {pending > 1 ? 'them' : 'it'} and earn +10 REP each.
              </p>
              <button
                onClick={() => navigate('/journal')}
                className="text-xs font-bold text-amber-400 underline underline-offset-2"
              >
                Find the bet in Journal →
              </button>
            </div>
          )
        })()}

        {/* Action buttons */}
        <div className="w-full max-w-[310px] flex gap-3">
          <button
            onClick={handleShare}
            className="flex-1 py-3.5 rounded-2xl font-black text-sm tracking-wider uppercase flex items-center justify-center gap-2 transition-all active:scale-95"
            style={{
              background: cfg.badgeGradient,
              color: cfg.badgeText,
              boxShadow: `0 4px 24px ${cfg.glowColorFaint}`,
            }}
          >
            {shared ? (
              <>✓ Copied!</>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                Share
              </>
            )}
          </button>
          <button
            onClick={handleSaveCard}
            disabled={saving}
            className="py-3.5 px-5 rounded-2xl font-black text-sm tracking-wider uppercase flex items-center justify-center gap-2 transition-all active:scale-95 border-2"
            style={{
              borderColor: cfg.hpColor,
              color: cfg.hpColor,
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Download className="w-4 h-4" />
                Save
              </>
            )}
          </button>
        </div>

        <p className="text-[10px] text-white/25 text-center tracking-wide">
          Post it. Let your group know who runs the board.
        </p>
      </div>

      <ShareSheet
        open={shareSheetOpen}
        onOpenChange={setShareSheetOpen}
        title="Share player card"
        text={playerShareText}
        url={playerShareUrl}
      />
    </div>
  )
}
