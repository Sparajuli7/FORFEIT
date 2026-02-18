import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuthStore, useBetStore } from '@/stores'
import { getMyBets } from '@/lib/api/bets'
import { getProfilesByIds } from '@/lib/api/profiles'
import { AvatarWithRepBadge } from '@/app/components/RepBadge'
import { formatRecord, formatMoney } from '@/lib/utils/formatters'
import type { BetWithSides } from '@/stores/betStore'
import type { Profile } from '@/lib/database.types'

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop'

function formatWinRate(wins: number, losses: number): string {
  const total = wins + losses
  if (total === 0) return '—'
  return `${Math.round((wins / total) * 100)}%`
}

function formatCompletionRate(completed: number, taken: number): string {
  if (taken === 0) return '—'
  return `${Math.round((completed / taken) * 100)}%`
}

function ProfileContent({
  profile,
  recentBets,
  claimantMap,
  isOwnProfile,
}: {
  profile: Profile
  recentBets: BetWithSides[]
  claimantMap: Map<string, { display_name: string; avatar_url: string | null }>
  isOwnProfile: boolean
}) {
  const navigate = useNavigate()
  const winRate = formatWinRate(profile.wins, profile.losses)
  const completionRate = formatCompletionRate(
    profile.punishments_completed,
    profile.punishments_taken,
  )
  const biggestWin = typeof profile.biggest_win === 'number'
    ? profile.biggest_win
    : parseInt(String(profile.biggest_win), 10) || 0
  const biggestLoss = typeof profile.biggest_loss === 'number'
    ? profile.biggest_loss
    : parseInt(String(profile.biggest_loss), 10) || 0

  return (
    <div className="h-full bg-bg-primary overflow-y-auto pb-24">
      {/* Header */}
      <div className="px-6 pt-12 pb-8 text-center">
        <div className="flex justify-center mb-4">
          <AvatarWithRepBadge
            src={profile.avatar_url}
            alt={profile.display_name}
            score={profile.rep_score}
            name={profile.display_name}
            size={80}
          />
        </div>
        <h2 className="text-2xl font-bold text-text-primary mb-1">{profile.display_name}</h2>
        <p className="text-text-muted">@{profile.username}</p>
        <p className="text-sm text-text-muted mt-2">
          {formatRecord(profile.wins, profile.losses, profile.voids)}
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
                  strokeDashoffset={
                    2 * Math.PI * 34 * (1 - (profile.wins + profile.losses > 0 ? profile.wins / (profile.wins + profile.losses) : 0))
                  }
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-accent-green">{winRate}</span>
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
            <p className="text-text-muted text-xs uppercase tracking-wider mb-1">Punishments Taken</p>
            <p className="text-3xl font-black text-text-primary">{profile.punishments_taken} 💀</p>
          </div>
          <div className="glass-card rounded-2xl p-4 text-center">
            <p className="text-text-muted text-xs uppercase tracking-wider mb-1">Completion Rate</p>
            <p className="text-3xl font-black text-text-primary">{completionRate}</p>
          </div>
          <div className="glass-card rounded-2xl p-4 text-center col-span-2">
            <p className="text-text-muted text-xs uppercase tracking-wider mb-1">Biggest Win / Loss</p>
            <p className="text-lg font-black text-accent-green">{formatMoney(biggestWin)}</p>
            <p className="text-lg font-black text-accent-coral">{formatMoney(biggestLoss)}</p>
          </div>
        </div>
      </div>

      {/* Recent Bets */}
      <div className="px-6">
        <h3 className="text-lg font-bold text-white mb-4">Recent Bets</h3>
        {recentBets.length === 0 ? (
          <p className="text-text-muted text-sm">No bets yet.</p>
        ) : (
          <div className="space-y-2">
            {recentBets.slice(0, 5).map((bet) => {
              const claimant = claimantMap.get(bet.claimant_id)
              const statusLabel =
                bet.status === 'completed'
                  ? 'Completed'
                  : bet.status === 'active'
                    ? 'Active'
                    : bet.status === 'proof_submitted'
                      ? 'Proof'
                      : bet.status
              return (
                <button
                  key={bet.id}
                  onClick={() => navigate(`/bet/${bet.id}`)}
                  className="w-full bg-bg-card rounded-xl border border-border-subtle p-3 flex items-center justify-between text-left hover:bg-bg-elevated transition-colors"
                >
                  <div>
                    <p className="text-white text-sm font-medium mb-1">{bet.title}</p>
                    <p className="text-text-muted text-xs">
                      {new Date(bet.created_at).toLocaleDateString()} · {claimant?.display_name ?? 'Unknown'}
                    </p>
                  </div>
                  <div
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      bet.status === 'completed'
                        ? 'bg-accent-green/20 text-accent-green'
                        : bet.status === 'active'
                          ? 'bg-accent-green/20 text-accent-green'
                          : 'bg-bg-elevated text-text-muted'
                    }`}
                  >
                    {statusLabel}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {isOwnProfile ? (
        <div className="px-6 mt-8 pb-8 space-y-3">
          <button
            onClick={() => navigate('/profile/edit')}
            className="w-full py-3 rounded-xl bg-accent-green/20 text-accent-green font-bold text-sm border border-accent-green/40"
          >
            Edit Profile
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="w-full py-3 rounded-xl bg-bg-elevated text-text-primary font-bold text-sm border border-border-subtle"
          >
            Settings
          </button>
        </div>
      ) : (
        <div className="px-6 mt-8 pb-8">
          <button
            onClick={() => navigate('/h2h/create', { state: { opponentId: profile.id } })}
            className="w-full py-3 rounded-xl bg-accent-green text-white font-bold text-sm"
          >
            Challenge
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
  const [claimantMap, setClaimantMap] = useState<Map<string, { display_name: string; avatar_url: string | null }>>(new Map())
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
      import('@/lib/api/profiles').then(({ getProfile }) =>
        getProfile(targetUserId).then((p) => {
          setProfile(p)
          setLoading(false)
        }),
      )
    }
  }, [targetUserId, isOwnProfile, currentProfile, authLoading])

  useEffect(() => {
    if (!targetUserId) return
    getMyBets(targetUserId).then((bets) => {
      setRecentBets(bets)
      const ids = [...new Set(bets.map((b) => b.claimant_id))]
      if (ids.length > 0) {
        getProfilesByIds(ids).then(setClaimantMap)
      }
    })
  }, [targetUserId])


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
      claimantMap={claimantMap}
      isOwnProfile={isOwnProfile}
    />
  )
}
