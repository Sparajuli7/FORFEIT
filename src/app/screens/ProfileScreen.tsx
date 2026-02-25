import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { MessageCircle, Loader2, Archive, Camera } from 'lucide-react'
import { useAuthStore, useChatStore } from '@/stores'
import { getMyBets, getUserBetStats } from '@/lib/api/bets'
import type { UserBetStats } from '@/lib/api/bets'
import { getProfilesByIds, getProfile as fetchProfile } from '@/lib/api/profiles'
import { formatRecord } from '@/lib/utils/formatters'
import { BET_CATEGORIES } from '@/lib/utils/constants'
import { CircleGrid } from '@/app/components/CircleGrid'
import type { BetWithSides } from '@/stores/betStore'
import type { Profile } from '@/lib/database.types'

// ---------------------------------------------------------------------------
// Circular proof-rate ring frame around the avatar
// ---------------------------------------------------------------------------

function ProofRingAvatar({
  src,
  alt,
  pct,
  onEdit,
}: {
  src: string | null
  alt: string
  /** Completion % (0–100) — drives the green arc */
  pct: number
  onEdit?: () => void
}) {
  const strokeWidth = 3
  const imageSize = 80
  const gap = 3
  const dim = imageSize + (strokeWidth + gap) * 2
  const center = dim / 2
  const radius = center - strokeWidth / 2 - 1
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - Math.min(pct, 100) / 100)

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: dim, height: dim }}>
        {/* Avatar image */}
        <div
          className="absolute rounded-full overflow-hidden bg-bg-elevated"
          style={{ top: strokeWidth + gap, left: strokeWidth + gap, width: imageSize, height: imageSize }}
        >
          {src ? (
            <img src={src} alt={alt} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-accent-green/50 via-gold/50 to-purple/50" />
          )}
        </div>

        {/* SVG progress ring */}
        <svg
          className="absolute inset-0 -rotate-90 pointer-events-none"
          width={dim}
          height={dim}
        >
          {/* Track */}
          <circle
            cx={center} cy={center} r={radius}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Arc */}
          <circle
            cx={center} cy={center} r={radius}
            stroke="var(--accent-green)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
          />
        </svg>

        {/* Tap-to-edit overlay (own profile only) */}
        {onEdit && (
          <button
            onClick={onEdit}
            className="absolute rounded-full flex items-center justify-center group"
            style={{ top: strokeWidth + gap, left: strokeWidth + gap, width: imageSize, height: imageSize }}
            aria-label="Change profile photo"
          >
            <div className="w-full h-full rounded-full flex items-center justify-center bg-black/0 group-hover:bg-black/35 transition-colors">
              <Camera className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>
        )}
      </div>

      {/* Percentage label below ring */}
      <span className="text-[11px] font-bold text-accent-green tabular-nums">{pct}% proof rate</span>
    </div>
  )
}

function formatCompletionRate(completed: number, taken: number): string {
  if (taken === 0) return '—'
  return `${Math.round((completed / taken) * 100)}%`
}

function ProfileContent({
  profile,
  recentBets,
  isOwnProfile,
  stats,
}: {
  profile: Profile
  recentBets: BetWithSides[]
  isOwnProfile: boolean
  stats: UserBetStats
}) {
  const navigate = useNavigate()
  const [openingDM, setOpeningDM] = useState(false)
  const pendingPunishments = Math.max(0, profile.punishments_taken - profile.punishments_completed)
  const completionRate = formatCompletionRate(
    profile.punishments_completed,
    profile.punishments_taken,
  )

  const winRateDisplay = stats.wins + stats.losses > 0
    ? `${stats.winPct}%`
    : '—'
  const winRateFraction = stats.wins + stats.losses > 0
    ? stats.wins / (stats.wins + stats.losses)
    : 0

  // Recent bets as CircleGrid items (limited to 3)
  const recentBetItems = recentBets.slice(0, 3).map((bet) => {
    const category = BET_CATEGORIES[bet.category]
    return {
      id: bet.id,
      icon: category?.emoji ?? '🎯',
      label: bet.title,
      sublabel:
        bet.status === 'active'
          ? '🟢 Live'
          : bet.status === 'completed'
            ? '✅ Done'
            : bet.status.replace(/_/g, ' '),
    }
  })

  const proofPct =
    profile.punishments_taken > 0
      ? Math.round((profile.punishments_completed / profile.punishments_taken) * 100)
      : 100

  return (
    <div className="h-full bg-bg-primary overflow-y-auto pb-6">
      {/* Header */}
      <div className="px-6 pt-12 pb-8 text-center">
        <div className="flex justify-center mb-3">
          <ProofRingAvatar
            src={profile.avatar_url}
            alt={profile.display_name}
            pct={proofPct}
            onEdit={isOwnProfile ? () => navigate('/profile/edit') : undefined}
          />
        </div>
        <h2 className="text-2xl font-bold text-text-primary mb-1">{profile.display_name}</h2>
        <p className="text-text-muted">@{profile.username}</p>
        <p className="text-sm text-text-muted mt-2">
          {formatRecord(stats.wins, stats.losses, stats.voids)}
        </p>
      </div>

      {/* Win rate hero stat */}
      <div className="px-6 mb-6">
        <div className="glass-card rounded-2xl p-6 text-center">
          <p className="text-text-muted text-xs uppercase tracking-wider mb-2">Win Rate</p>
          <div className="flex items-center justify-center gap-2">
            <div className="relative w-20 h-20">
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  stroke="var(--bg-elevated)"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  stroke="var(--accent-green)"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={2 * Math.PI * 34}
                  strokeDashoffset={2 * Math.PI * 34 * (1 - winRateFraction)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-accent-green">{winRateDisplay}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="px-6 mb-8">
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-card rounded-2xl p-4 text-center">
            <p className="text-text-muted text-xs uppercase tracking-wider mb-1">Total Bets</p>
            <p className="text-3xl font-black text-text-primary">{profile.total_bets}</p>
          </div>
          <div className="glass-card rounded-2xl p-4 text-center">
            <p className="text-text-muted text-xs uppercase tracking-wider mb-1">Active Streak</p>
            <p className="text-3xl font-black text-text-primary">
              {profile.current_streak > 0 ? `+${profile.current_streak}` : profile.current_streak}
            </p>
          </div>
          <div className="glass-card rounded-2xl p-4 text-center">
            <p className="text-text-muted text-xs uppercase tracking-wider mb-1">Punishments Owed</p>
            <p className="text-3xl font-black text-text-primary">{profile.punishments_taken}</p>
            {pendingPunishments > 0 && (
              <p className="text-[11px] text-amber-400 mt-1 font-semibold">
                {pendingPunishments} pending proof
              </p>
            )}
            {pendingPunishments === 0 && profile.punishments_taken > 0 && (
              <p className="text-[11px] text-accent-green mt-1 font-semibold">
                all proved
              </p>
            )}
          </div>
          <div className="glass-card rounded-2xl p-4 text-center">
            <p className="text-text-muted text-xs uppercase tracking-wider mb-1">Proof Rate</p>
            <p className="text-3xl font-black text-text-primary">{completionRate}</p>
            <p className="text-[10px] text-text-muted mt-1">
              {profile.punishments_completed}/{profile.punishments_taken} proved
            </p>
          </div>
        </div>
      </div>

      {/* Recent Bets — circle layout, limited to 3 */}
      <div className="px-6">
        <h3 className="text-lg font-bold text-white mb-4">Recent Bets</h3>
        {recentBets.length === 0 ? (
          <p className="text-text-muted text-sm">No bets yet.</p>
        ) : (
          <CircleGrid
            items={recentBetItems}
            onItemClick={(id) => navigate(`/bet/${id}`)}
            labelLines={2}
          />
        )}
      </div>

      {isOwnProfile && pendingPunishments > 0 && (
        <div className="px-6 mb-2 mt-6">
          <div
            className="rounded-2xl border p-4"
            style={{ background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.35)' }}
          >
            <p className="text-sm font-black text-amber-400 mb-0.5">
              {pendingPunishments} punishment{pendingPunishments > 1 ? 's' : ''} awaiting proof
            </p>
            <p className="text-xs text-text-muted mb-3">
              Submit proof to officially close {pendingPunishments > 1 ? 'them' : 'it'} and earn +10 REP each.
              Until then, {pendingPunishments > 1 ? 'they don\'t' : 'it doesn\'t'} count as complete on your card.
            </p>
            <button
              onClick={() => navigate('/journal')}
              className="text-xs font-bold text-amber-400 underline underline-offset-2"
            >
              Find the bet in Journal →
            </button>
          </div>
        </div>
      )}

      {isOwnProfile ? (
        <div className="px-6 mt-8 pb-8 space-y-3">
          <button
            onClick={() => navigate('/profile/card')}
            className="w-full py-3 rounded-xl font-bold text-sm border flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            style={{
              background: 'linear-gradient(135deg, #1a1200 0%, #0d0d0d 100%)',
              borderColor: 'rgba(255,215,0,0.4)',
              color: '#FFD700',
            }}
          >
            My Player Card
          </button>
          <button
            onClick={() => navigate('/journal')}
            className="w-full py-3 rounded-xl bg-accent-green/20 text-accent-green font-bold text-sm border border-accent-green/40"
          >
            Journal — groups &amp; bet history
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/profile/edit')}
              className="flex-1 py-3 rounded-xl bg-bg-elevated text-text-primary font-bold text-sm border border-border-subtle"
            >
              Edit Profile
            </button>
            <button
              onClick={() => navigate('/archive')}
              className="py-3 px-4 rounded-xl bg-bg-elevated text-text-muted font-bold text-sm border border-border-subtle flex items-center gap-2 hover:text-text-primary transition-colors"
              aria-label="Archive"
            >
              <Archive className="w-4 h-4" />
              Archive
            </button>
          </div>
          <button
            onClick={() => navigate('/settings')}
            className="w-full py-3 rounded-xl bg-bg-elevated text-text-primary font-bold text-sm border border-border-subtle"
          >
            Settings
          </button>
        </div>
      ) : (
        <div className="px-6 mt-8 pb-8 space-y-3">
          <button
            onClick={() => navigate('/compete/create', { state: { opponentId: profile.id } })}
            className="w-full py-3 rounded-xl bg-accent-green text-white font-bold text-sm"
          >
            Challenge
          </button>
          <button
            disabled={openingDM}
            onClick={async () => {
              if (openingDM) return
              setOpeningDM(true)
              try {
                const convId = await useChatStore.getState().getOrCreateDM(profile.id)
                navigate(`/chat/${convId}`)
              } catch (e) {
                console.error('Failed to open DM:', e)
              } finally {
                setOpeningDM(false)
              }
            }}
            className="w-full py-3 rounded-xl bg-bg-elevated text-text-primary font-bold text-sm border border-border-subtle flex items-center justify-center gap-2"
          >
            {openingDM ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <MessageCircle className="w-4 h-4" />
            )}
            {openingDM ? 'Opening...' : 'Message'}
          </button>
        </div>
      )}
    </div>
  )
}

interface ProfileScreenProps {
  activeScreen?: string
  userId?: string
}

export function ProfileScreen({ activeScreen, userId }: ProfileScreenProps) {
  const navigate = useNavigate()
  const currentUser = useAuthStore((s) => s.user)
  const currentProfile = useAuthStore((s) => s.profile)
  const authLoading = useAuthStore((s) => s.isLoading)

  const [profile, setProfile] = useState<Profile | null>(null)
  const [recentBets, setRecentBets] = useState<BetWithSides[]>([])
  const [stats, setStats] = useState<UserBetStats>({ wins: 0, losses: 0, voids: 0, totalCompleted: 0, winPct: 0 })
  const [loading, setLoading] = useState(true)

  const isOwnProfile = !userId || userId === currentUser?.id
  const targetUserId = userId ?? currentUser?.id

  useEffect(() => {
    if (!targetUserId) {
      setLoading(false)
      return
    }

    if (isOwnProfile) {
      if (!authLoading) {
        setProfile(currentProfile)
        setLoading(false)
      }
    } else {
      fetchProfile(targetUserId).then((p) => {
        setProfile(p)
        setLoading(false)
      })
    }
  }, [targetUserId, isOwnProfile, currentProfile, authLoading])

  useEffect(() => {
    if (!targetUserId) return

    // Fetch bets and compute real W/L/V stats in parallel
    Promise.all([
      getMyBets(targetUserId),
      getUserBetStats(targetUserId),
    ]).then(([bets, betStats]) => {
      const filtered = isOwnProfile
        ? bets
        : bets.filter((b) => {
            if (b.bet_type !== 'competition') return true
            if (b.is_public) return true
            return b.bet_sides?.some((s: { user_id: string }) => s.user_id === currentUser?.id)
          })
      setRecentBets(filtered)
      setStats(betStats)
    })
  }, [targetUserId, isOwnProfile, currentUser?.id])

  if (loading && !profile) {
    return (
      <div className="h-full bg-bg-primary flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-accent-green border-t-transparent rounded-full animate-spin" />
          <p className="text-text-muted text-sm">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="h-full bg-bg-primary flex items-center justify-center">
        <div className="text-center px-6">
          <p className="text-text-muted mb-4">Profile not found</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-xl bg-accent-green/20 text-accent-green text-sm font-bold"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <ProfileContent
      profile={profile}
      recentBets={recentBets}
      isOwnProfile={isOwnProfile}
      stats={stats}
    />
  )
}
