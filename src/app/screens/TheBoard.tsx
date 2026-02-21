import { useEffect, useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router'
import { Bell } from 'lucide-react'
import { BetCard } from '../components/BetCard'
import { NotificationPanel } from '../components/NotificationPanel'
import { useGroupStore, useBetStore, useAuthStore, useNotificationStore } from '@/stores'
import { useCountdown } from '@/lib/hooks/useCountdown'
import { useRealtime } from '@/lib/hooks/useRealtime'
import { getProfilesByIds } from '@/lib/api/profiles'
import { formatMoney } from '@/lib/utils/formatters'
import { formatOdds } from '@/lib/utils/formatters'
import { BET_CATEGORIES } from '@/lib/utils/constants'
import type { BetWithSides } from '@/stores/betStore'

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop'

function formatStake(bet: BetWithSides): string {
  if (bet.stake_money) return formatMoney(bet.stake_money)
  if (bet.stake_custom_punishment) return bet.stake_custom_punishment
  if (bet.stake_punishment_id) return '🔥 Punishment'
  return '—'
}

function BoardBetCard({
  bet,
  groupName,
  claimantName,
  claimantAvatar,
  onNavigate,
  compact = false,
}: {
  bet: BetWithSides
  groupName: string
  claimantName: string
  claimantAvatar: string
  onNavigate: (betId: string) => void
  compact?: boolean
}) {
  const countdown = useCountdown(bet.deadline)
  const sides = bet.bet_sides ?? []
  const riderCount = sides.filter((s) => s.side === 'rider').length
  const doubterCount = sides.filter((s) => s.side === 'doubter').length
  const { riderPct, doubterPct } = formatOdds(riderCount, doubterCount)

  const status = bet.status === 'proof_submitted' ? 'proof' : bet.status === 'active' ? 'active' : 'completed'

  return (
    <BetCard
      groupName={groupName}
      category={BET_CATEGORIES[bet.category]?.label ?? bet.category.toUpperCase()}
      countdown={status === 'proof' ? '' : countdown.formatted}
      claimText={bet.title}
      claimantName={claimantName}
      claimantAvatar={claimantAvatar}
      ridersPercent={riderPct}
      doubtersPercent={doubterPct}
      ridersCount={riderCount}
      doubtersCount={doubterCount}
      stake={formatStake(bet)}
      status={status}
      compact={compact}
      onClick={() => onNavigate(bet.id)}
    />
  )
}

export function TheBoard() {
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)

  const groups = useGroupStore((s) => s.groups)
  const fetchGroups = useGroupStore((s) => s.fetchGroups)

  const bets = useBetStore((s) => s.bets)
  const fetchBetsForGroupIds = useBetStore((s) => s.fetchBetsForGroupIds)
  const isLoading = useBetStore((s) => s.isLoading)

  const unreadCount = useNotificationStore((s) => s.unreadCount)

  const [notificationOpen, setNotificationOpen] = useState(false)
  const [claimantMap, setClaimantMap] = useState<Map<string, { display_name: string; avatar_url: string | null }>>(new Map())

  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  const groupIds = useMemo(() => groups.map((g) => g.id), [groups])
  useEffect(() => {
    if (groupIds.length > 0) {
      fetchBetsForGroupIds(groupIds)
    }
  }, [groupIds, fetchBetsForGroupIds])


  useEffect(() => {
    const ids = [...new Set(bets.map((b) => b.claimant_id))]
    if (ids.length === 0) return
    getProfilesByIds(ids).then(setClaimantMap)
  }, [bets])

  useRealtime('bets', () => {
    if (groups.length > 0) fetchBetsForGroupIds(groups.map((g) => g.id))
  })

  useRealtime('bet_sides', () => {
    if (groups.length > 0) fetchBetsForGroupIds(groups.map((g) => g.id))
  })

  /** Bets to show in horizontal strip: active + proof_submitted (yet to accept or currently in) */
  const stripBets = useMemo(() => {
    return bets.filter((b) => b.status === 'active' || b.status === 'proof_submitted')
  }, [bets])

  function formatGroupDate(iso: string) {
    const d = new Date(iso)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (24 * 60 * 60 * 1000))
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return d.toLocaleDateString('en-US', { weekday: 'short' })
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (groups.length === 0 && !isLoading) {
    return (
      <div className="h-full bg-bg-primary grain-texture flex flex-col items-center justify-center px-6 pb-6">
        <div className="text-center">
          <div className="text-5xl mb-4">👥</div>
          <h2 className="text-xl font-black text-text-primary mb-2">
            Create or join a group to start betting
          </h2>
          <p className="text-text-muted text-sm mb-6">
            Groups are where the action happens. Create one or join with an invite code.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate('/group/create')}
              className="w-full h-12 rounded-xl bg-accent-green text-white font-bold"
            >
              Create Group
            </button>
            <button
              onClick={() => navigate('/group/join')}
              className="w-full h-12 rounded-xl bg-bg-elevated border border-border-subtle text-text-primary font-bold"
            >
              Join with Code
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-bg-primary grain-texture overflow-y-auto pb-24">
      {/* Top utility bar: settings, notifications, profile */}
      <div className="flex items-center justify-end gap-2 px-4 py-3 border-b border-border-subtle">
        <button
          onClick={() => navigate('/settings')}
          className="p-2 rounded-lg hover:bg-bg-elevated transition-colors"
          aria-label="Settings"
        >
          <span className="text-lg">⚙️</span>
        </button>
        <button
          onClick={() => setNotificationOpen(true)}
          className="relative p-2 rounded-lg hover:bg-bg-elevated transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5 text-text-primary" />
          {unreadCount > 0 && (
            <div className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-text-muted text-bg-primary text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </div>
          )}
        </button>
        <button
          onClick={() => navigate('/profile')}
          className="w-9 h-9 rounded-full overflow-hidden bg-bg-elevated border border-border-subtle"
          aria-label="Profile"
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.display_name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-bg-elevated" />
          )}
        </button>
      </div>

      {/* Horizontal scroll: bets (yet to accept + currently in) — compact cards */}
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted mb-3">My Bets</h2>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 w-full">
              <div className="w-8 h-8 border-2 border-accent-green border-t-transparent rounded-full animate-spin" />
            </div>
          ) : stripBets.length === 0 ? (
            <div className="py-6 text-text-muted text-sm">No bets yet. Create one to get started!</div>
          ) : (
            stripBets.map((bet) => {
              const claimant = claimantMap.get(bet.claimant_id)
              const group = groups.find((g) => g.id === bet.group_id)
              const groupName = group ? `${group.name} ${group.avatar_emoji}` : 'Group'
              return (
                <BoardBetCard
                  key={bet.id}
                  bet={bet}
                  groupName={groupName}
                  claimantName={claimant?.display_name ?? 'Anonymous'}
                  claimantAvatar={claimant?.avatar_url ?? DEFAULT_AVATAR}
                  onNavigate={(id) => navigate(`/bet/${id}`)}
                  compact
                />
              )
            })
          )}
        </div>
      </div>

      {/* Create group / Join with code */}
      <div className="px-6 py-4 flex flex-col gap-3">
        <button
          onClick={() => navigate('/group/create')}
          className="w-full h-12 rounded-xl bg-accent-green text-bg-primary font-bold flex items-center justify-center gap-2"
        >
          <span className="text-lg">+</span> Create group
        </button>
        <button
          onClick={() => navigate('/group/join')}
          className="w-full h-12 rounded-xl bg-bg-elevated border border-border-subtle text-text-primary font-bold"
        >
          Join with code
        </button>
      </div>

      {/* Gmail-style list of groups */}
      <div className="px-4 border-t border-border-subtle">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted pt-4 pb-2 px-2">
          Groups
        </h2>
        <div className="divide-y divide-border-subtle">
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => navigate(`/group/${g.id}`)}
              className="w-full flex items-center gap-3 py-3 px-2 text-left hover:bg-bg-elevated/50 active:bg-bg-elevated transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-text-primary truncate">
                  {g.avatar_emoji} {g.name}
                </div>
                <div className="text-xs text-text-muted truncate">
                  Invite: {g.invite_code}
                </div>
              </div>
              <span className="text-xs text-text-muted shrink-0 tabular-nums">
                {formatGroupDate(g.created_at)}
              </span>
            </button>
          ))}
        </div>
      </div>

      <NotificationPanel open={notificationOpen} onOpenChange={setNotificationOpen} />

      {/* Quick Bet — static, no glow */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 z-10">
        <span className="text-xs font-bold text-text-muted uppercase tracking-wide bg-bg-elevated px-3 py-1.5 rounded-full border border-border-subtle">
          Quick Bet
        </span>
        <button
          onClick={() => navigate('/bet/create')}
          className="w-14 h-14 rounded-full bg-accent-green text-bg-primary flex items-center justify-center text-2xl font-bold btn-pressed shadow-lg border border-accent-green/20"
        >
          +
        </button>
      </div>
    </div>
  )
}
