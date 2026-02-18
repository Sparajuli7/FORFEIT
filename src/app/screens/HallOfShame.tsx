import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { AvatarWithRepBadge } from '@/app/components/RepBadge'
import { useGroupStore, useShameStore, useAuthStore } from '@/stores'
import { getReactionCounts, hasUserReacted } from '@/stores/shameStore'
import { getProfilesWithRepByIds } from '@/lib/api/profiles'
import { useRealtimeSubscription } from '@/lib/hooks/useRealtime'
import { REACTION_EMOJIS } from '@/lib/utils/constants'
import type { ShamePostEnriched } from '@/stores/shameStore'
import type { ProfileWithRep } from '@/lib/api/profiles'

interface HallOfShameProps {
  onNavigate?: (screen: string) => void
}

export function HallOfShame({ onNavigate }: HallOfShameProps) {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const activeGroup = useGroupStore((s) => s.activeGroup)
  const groups = useGroupStore((s) => s.groups)
  const effectiveGroup = activeGroup ?? groups[0] ?? null

  const shamePosts = useShameStore((s) => s.shamePosts)
  const punishmentLeaderboard = useShameStore((s) => s.punishmentLeaderboard)
  const weeklyStats = useShameStore((s) => s.weeklyStats)
  const groupStats = useShameStore((s) => s.groupStats)
  const fetchShameFeed = useShameStore((s) => s.fetchShameFeed)
  const fetchPunishmentLeaderboard = useShameStore((s) => s.fetchPunishmentLeaderboard)
  const fetchWeeklyStats = useShameStore((s) => s.fetchWeeklyStats)
  const fetchGroupStats = useShameStore((s) => s.fetchGroupStats)
  const reactToPost = useShameStore((s) => s.reactToPost)
  const isLoading = useShameStore((s) => s.isLoading)

  const [profileMap, setProfileMap] = useState<Map<string, ProfileWithRep>>(new Map())

  useEffect(() => {
    if (effectiveGroup) {
      fetchShameFeed(effectiveGroup.id)
      fetchPunishmentLeaderboard(effectiveGroup.id)
      fetchWeeklyStats(effectiveGroup.id)
      fetchGroupStats(effectiveGroup.id)
    }
  }, [effectiveGroup?.id, fetchShameFeed, fetchPunishmentLeaderboard, fetchWeeklyStats, fetchGroupStats])

  useEffect(() => {
    const ids = [...new Set(shamePosts.map((p) => p.submitted_by))]
    if (ids.length === 0) return
    getProfilesWithRepByIds(ids).then(setProfileMap)
  }, [shamePosts])

  useRealtimeSubscription('hall_of_shame', () => {
    if (effectiveGroup) fetchShameFeed(effectiveGroup.id)
  })

  const tickerText = weeklyStats
    ? `💀 ${weeklyStats.punishmentsThisWeek} punishments executed this week · ${weeklyStats.completionRate}% completion rate · ${weeklyStats.topGroupName ?? 'Your group'} leads all groups`
    : '💀 Loading stats...'

  if (!effectiveGroup) {
    return (
      <div className="h-full bg-bg-primary flex items-center justify-center px-6">
        <p className="text-text-muted text-center">Create or join a group to view the Hall of Shame.</p>
      </div>
    )
  }

  return (
    <div className="h-full bg-bg-primary grain-texture overflow-y-auto pb-24">
      {/* Header */}
      <div className="px-6 pt-12 pb-4">
        <h1 className="text-3xl font-black text-text-primary mb-3">
          💀 HALL OF SHAME
        </h1>

        {/* Stats ticker */}
        <div className="overflow-hidden bg-bg-elevated rounded-full py-2.5 px-4 border border-border-subtle mb-6">
          <div className="whitespace-nowrap">
            <span className="inline-block animate-marquee text-text-muted text-xs font-medium">
              {tickerText} · {tickerText}
            </span>
          </div>
        </div>
      </div>

      {/* Punishment Leaderboard */}
      <div className="px-6 mb-6">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted mb-3">
          PUNISHMENT LEADERBOARD
        </h2>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {punishmentLeaderboard.map((person) => (
            <div
              key={person.id}
              className="bg-bg-card border border-border-subtle rounded-xl p-4 min-w-[140px] flex flex-col items-center card-shadow-light"
            >
              <div className="relative mb-3">
                <AvatarWithRepBadge
                  src={person.avatar_url}
                  alt={person.display_name}
                  score={person.rep_score}
                  name={person.display_name}
                  size={56}
                />
              </div>
              <span className="font-bold text-sm text-text-primary mb-2">{person.display_name}</span>
              <span className="text-2xl font-black tabular-nums text-accent-coral mb-1 scoreboard-digit">
                {person.punishments_taken}
              </span>
              <span className="text-xs text-text-muted">punishments</span>
            </div>
          ))}
        </div>
      </div>

      {/* Shame Cards */}
      <div className="px-6 space-y-4">
        {isLoading && shamePosts.length === 0 ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-accent-green border-t-transparent rounded-full animate-spin" />
          </div>
        ) : shamePosts.length === 0 ? (
          <p className="text-text-muted text-sm py-8 text-center">No shame posts yet. Own your losses! 💀</p>
        ) : (
          shamePosts.map((post) => (
            <ShameCard
              key={post.id}
              post={post}
              profile={profileMap.get(post.submitted_by)}
              currentUserId={user?.id}
              onReact={(emoji) => reactToPost(post.id, emoji)}
              onShare={() => onNavigate?.('share')}
            />
          ))
        )}
      </div>

      {/* Group Stats Summary */}
      {groupStats && (
        <div className="px-6 mt-6 mb-6">
          <div className="bg-bg-card border border-border-subtle rounded-xl p-5 card-shadow-light">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted mb-4">
              YOUR GROUP STATS
            </h3>

            <div className="flex items-center justify-between mb-4">
              <div className="text-center flex-1">
                <p className="text-xs text-text-muted mb-1">Issued</p>
                <p className="text-3xl font-black tabular-nums text-text-primary scoreboard-digit">
                  {groupStats.totalIssued}
                </p>
              </div>
              <div className="text-center flex-1 border-l border-border-subtle">
                <p className="text-xs text-text-muted mb-1">Confirmed</p>
                <p className="text-3xl font-black tabular-nums text-accent-green scoreboard-digit">
                  {groupStats.totalConfirmed}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="h-2.5 rounded-full overflow-hidden flex">
                <div
                  className="bg-accent-green"
                  style={{ width: `${groupStats.confirmedPct}%` }}
                />
                <div
                  className="bg-accent-coral"
                  style={{ width: `${groupStats.disputedPct}%` }}
                />
                <div
                  className="bg-text-muted"
                  style={{ width: `${groupStats.pendingPct}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs font-bold tabular-nums">
                <span className="text-accent-green">{groupStats.confirmedPct}% Confirmed</span>
                <span className="text-accent-coral text-center">{groupStats.disputedPct}% Disputed</span>
                <span className="text-text-muted text-right">{groupStats.pendingPct}% Pending</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ShameCard({
  post,
  profile,
  currentUserId,
  onReact,
  onShare,
}: {
  post: ShamePostEnriched
  profile: ProfileWithRep | undefined
  currentUserId: string | undefined
  onReact: (emoji: string) => void
  onShare: () => void
}) {
  const confirmed = post._outcomeResult === 'claimant_failed'
  const reactionCounts = getReactionCounts(post.reactions)
  const verifiedCount = Object.values(reactionCounts).reduce((a, b) => a + b, 0)
  const taken = profile?.punishments_taken ?? 0
  const completed = profile?.punishments_completed ?? 0
  const completionRate = taken > 0 ? Math.round((completed / taken) * 100) : 0

  return (
    <div className="bg-bg-card border border-border-subtle rounded-xl overflow-hidden card-shadow-light">
      <div className="p-3 flex items-center justify-between bg-bg-elevated/50">
        {confirmed ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-accent-green/20 rounded-full">
            <span className="text-xs font-bold text-accent-green uppercase tracking-wide">
              ✓ CONFIRMED
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-accent-coral/20 rounded-full">
            <span className="text-xs font-bold text-accent-coral uppercase tracking-wide">
              ✗ DISPUTED
            </span>
          </div>
        )}
        <span className="text-xs font-bold text-text-primary tabular-nums">
          {completionRate}% rate
        </span>
      </div>

      {/* Photos */}
      <div className="flex">
        <div className="flex-1 aspect-[3/4] bg-bg-elevated overflow-hidden">
          {post.front_url ? (
            <img src={post.front_url} alt="Front" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl">📷</div>
          )}
        </div>
        <div className="flex-1 aspect-[3/4] bg-bg-elevated overflow-hidden">
          {post.back_url ? (
            <img src={post.back_url} alt="Back" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl">📷</div>
          )}
        </div>
      </div>

      <div className="p-4">
        <div className="mb-2">
          <p className="text-sm">
            <span className="font-bold text-text-primary">{profile?.display_name ?? 'Unknown'}</span>
            <span className="text-text-muted"> lost · </span>
            <span className="text-text-muted">{post._betTitle ?? 'Bet'}</span>
          </p>
        </div>

        <p className="text-accent-coral font-bold text-sm mb-3">
          {post.caption ?? 'Punishment completed'}
        </p>

        {verifiedCount > 0 && (
          <p className="text-xs text-accent-green font-bold mb-3 uppercase tracking-wide">
            VERIFIED BY {verifiedCount} PEOPLE
          </p>
        )}

        <p className="text-xs text-text-muted mb-3">
          {profile?.display_name ?? 'Unknown'} ·{' '}
          <span className="font-bold tabular-nums">{completionRate}% completion rate</span>{' '}
          {completionRate < 50 ? '😬' : ''}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex gap-4">
            {REACTION_EMOJIS.map((emoji) => {
              const count = reactionCounts[emoji] ?? 0
              const filled = currentUserId ? hasUserReacted(post.reactions, emoji, currentUserId) : false
              return (
                <button
                  key={emoji}
                  onClick={() => onReact(emoji)}
                  className={`flex items-center gap-1.5 transition-colors btn-pressed ${
                    filled ? 'text-accent-green' : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  <span className="text-lg">{emoji}</span>
                  <span className="text-sm font-bold tabular-nums">{count}</span>
                </button>
              )
            })}
          </div>
          <button onClick={onShare} className="text-text-muted hover:text-text-primary transition-colors">
            <span className="text-xl">↗️</span>
          </button>
        </div>
      </div>
    </div>
  )
}
