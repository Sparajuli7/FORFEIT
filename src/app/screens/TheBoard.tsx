import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { Bell, MessageCircle } from 'lucide-react'
import { NotificationPanel } from '../components/NotificationPanel'
import { PushPermissionBanner } from '../components/PushPermissionBanner'
import { useGroupStore, useBetStore, useAuthStore, useNotificationStore, useChatStore } from '@/stores'
import { useCountdown } from '@/lib/hooks/useCountdown'
import { useRealtime } from '@/lib/hooks/useRealtime'
import { getProfilesByIds } from '@/lib/api/profiles'
import { formatMoney } from '@/lib/utils/formatters'
import { formatOdds } from '@/lib/utils/formatters'
import { BET_CATEGORIES } from '@/lib/utils/constants'
import { CircleGrid } from '../components/CircleGrid'
import type { CircleGridItem } from '../components/CircleGrid'
import type { BetWithSides } from '@/stores/betStore'

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop'

function formatStake(bet: BetWithSides): string {
  if (bet.stake_money) return formatMoney(bet.stake_money)
  if (bet.stake_custom_punishment) return bet.stake_custom_punishment
  if (bet.stake_punishment_id) return '🔥 Punishment'
  return '—'
}

// ---------------------------------------------------------------------------
// Priority engine
// ---------------------------------------------------------------------------

interface BetPriority {
  /** Lower = shown first */
  level: number
  label: string
  labelColor: string
  /** Rings the card border */
  urgent: boolean
}

/**
 * Priority order:
 * 0  Proof needs your vote        (you're a doubter, status = proof_submitted)
 * 1  Proof submitted – you posted (claimant waiting for verdict)
 * 2  H2H contract needs acceptance (you're the named opponent, status = pending)
 * 3  Disputed – needs attention
 * 4  Expiring in < 6 h
 * 5  Expiring in 6–24 h
 * 6  You're the doubter (active)
 * 7  You're the claimant (active)
 * 8  You're a rider (active)
 * 9  Everything else (not joined)
 */
function getBetPriority(bet: BetWithSides, userId: string | undefined): BetPriority {
  const sides = bet.bet_sides ?? []
  const mySide = sides.find((s) => s.user_id === userId)?.side ?? null
  const isClaimant = bet.claimant_id === userId
  const hoursLeft = (new Date(bet.deadline).getTime() - Date.now()) / (1000 * 60 * 60)

  // Claimant submitted the proof — they can't vote, they wait
  if (bet.status === 'proof_submitted' && isClaimant)
    return { level: 1, label: '👀 Proof out', labelColor: 'text-amber-400', urgent: true }

  // Any other participant (rider OR doubter) needs to vote
  if (bet.status === 'proof_submitted' && mySide !== null)
    return { level: 0, label: '🗳️ Vote now', labelColor: 'text-amber-400', urgent: true }

  if (bet.status === 'pending' && bet.bet_type === 'h2h' && bet.h2h_opponent_id === userId)
    return { level: 2, label: '✍️ Accept', labelColor: 'text-accent-green', urgent: true }

  if (bet.status === 'disputed')
    return { level: 3, label: '⚡ Disputed', labelColor: 'text-destructive', urgent: true }

  if (bet.status === 'active' && hoursLeft > 0 && hoursLeft < 6)
    return { level: 4, label: '🔥 < 6h left', labelColor: 'text-amber-400', urgent: true }

  if (bet.status === 'active' && hoursLeft >= 6 && hoursLeft < 24)
    return { level: 5, label: '⏰ Today', labelColor: 'text-amber-300', urgent: false }

  if (mySide === 'doubter')
    return { level: 6, label: '👎 Doubter', labelColor: 'text-accent-coral', urgent: false }

  if (isClaimant)
    return { level: 7, label: '🙋 Your bet', labelColor: 'text-text-muted', urgent: false }

  if (mySide === 'rider')
    return { level: 8, label: '🤝 Riding', labelColor: 'text-text-muted', urgent: false }

  return { level: 9, label: '', labelColor: '', urgent: false }
}

// ---------------------------------------------------------------------------
// Compact card with priority badge
// ---------------------------------------------------------------------------

function BoardBetCard({
  bet,
  groupName,
  claimantName,
  claimantAvatar,
  userId,
  onNavigate,
}: {
  bet: BetWithSides
  groupName: string
  claimantName: string
  claimantAvatar: string
  userId: string | undefined
  onNavigate: (betId: string) => void
}) {
  const countdown = useCountdown(bet.deadline)
  const sides = bet.bet_sides ?? []
  const riderCount = sides.filter((s) => s.side === 'rider').length
  const doubterCount = sides.filter((s) => s.side === 'doubter').length
  const { riderPct, doubterPct } = formatOdds(riderCount, doubterCount)
  const priority = getBetPriority(bet, userId)

  const borderColor =
    bet.status === 'proof_submitted' ? 'border-status-proof'
    : bet.status === 'disputed'      ? 'border-status-disputed'
    : 'border-status-active'

  const ringClass = priority.urgent
    ? 'ring-1 ring-amber-400/50'
    : ''

  // For level 0-6 show the priority label instead of the countdown; for 7+ show countdown
  const rightSlot =
    priority.level <= 6 && priority.label ? (
      <span className={`text-[10px] font-black shrink-0 ${priority.labelColor}`}>
        {priority.label}
      </span>
    ) : (
      <span className="text-xs font-bold tabular-nums text-text-primary shrink-0">
        {bet.status === 'proof_submitted' ? '👀' : countdown.formatted || '—'}
      </span>
    )

  return (
    <button
      onClick={() => onNavigate(bet.id)}
      className={`shrink-0 w-[280px] text-left bg-bg-card rounded-xl border-l-status ${borderColor} border border-border-subtle ${ringClass} p-3 transition-all hover:shadow-md`}
    >
      {/* Top row: group chip + priority/countdown */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[10px] font-bold px-2 py-0.5 bg-bg-elevated rounded-full uppercase tracking-wide truncate">
          {groupName}
        </span>
        {rightSlot}
      </div>

      {/* Claim */}
      <h3 className="text-sm font-bold text-text-primary line-clamp-2 leading-snug mb-2">
        {bet.title}
      </h3>

      {/* Claimant */}
      <div className="flex items-center gap-1.5 mb-2">
        <div className="w-4 h-4 rounded-full bg-bg-elevated overflow-hidden">
          <img src={claimantAvatar} alt={claimantName} className="w-full h-full object-cover" />
        </div>
        <span className="text-[11px] text-text-muted truncate">{claimantName}</span>
      </div>

      {/* Odds bar */}
      <div className="h-1.5 overflow-hidden flex rounded-full mb-1.5">
        <div className="bg-accent-green" style={{ width: `${riderPct}%` }} />
        <div className="bg-accent-coral" style={{ width: `${doubterPct}%` }} />
      </div>

      {/* Bottom: stake + CTA */}
      <div className="flex items-center justify-between mt-1">
        <span className="text-[10px] font-bold bg-bg-elevated px-2 py-0.5 rounded-full">
          {formatStake(bet)}
        </span>
        <span className={`text-[10px] font-bold uppercase tracking-wider ${priority.urgent ? priority.labelColor : 'text-accent-green'}`}>
          {priority.level === 0 ? 'VOTE →'
            : priority.level === 1 ? 'VIEW →'
            : priority.level === 2 ? 'ACCEPT →'
            : 'VIEW →'}
        </span>
      </div>
    </button>
  )
}

// ---------------------------------------------------------------------------
// TheBoard
// ---------------------------------------------------------------------------

export function TheBoard() {
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)

  const groups = useGroupStore((s) => s.groups)
  const fetchGroups = useGroupStore((s) => s.fetchGroups)

  const bets = useBetStore((s) => s.bets)
  const fetchBetsForGroupIds = useBetStore((s) => s.fetchBetsForGroupIds)
  const isLoading = useBetStore((s) => s.isLoading)

  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const chatUnreadCount = useChatStore((s) => s.totalUnreadCount)

  const [notificationOpen, setNotificationOpen] = useState(false)
  const [claimantMap, setClaimantMap] = useState<Map<string, { display_name: string; avatar_url: string | null }>>(new Map())

  useEffect(() => { fetchGroups() }, [fetchGroups])

  const groupIds = useMemo(() => groups.map((g) => g.id), [groups])
  useEffect(() => {
    if (groupIds.length > 0) fetchBetsForGroupIds(groupIds)
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

  /**
   * Strip bets — include active, proof_submitted, pending (h2h awaiting), disputed.
   * Sorted by priority level (ascending = highest priority first).
   * Within the same priority level, original server order (newest first) is preserved.
   */
  const userId = profile?.id
  const stripBets = useMemo(() => {
    const VISIBLE_STATUSES = new Set(['active', 'proof_submitted', 'pending', 'disputed'])
    const filtered = bets.filter((b) => VISIBLE_STATUSES.has(b.status))
    return [...filtered].sort((a, b) => {
      const pa = getBetPriority(a, userId).level
      const pb = getBetPriority(b, userId).level
      return pa - pb
    })
  }, [bets, userId])

  /** Count of bets that need immediate action from this user */
  const actionCount = useMemo(
    () => stripBets.filter((b) => getBetPriority(b, userId).level <= 3).length,
    [stripBets, userId],
  )

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
    <div className="relative h-full bg-bg-primary grain-texture flex flex-col overflow-hidden">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-24">
      {/* Top utility bar */}
      <div className="flex items-center justify-end gap-2 px-4 py-3 border-b border-border-subtle">
        <button
          onClick={() => navigate('/settings')}
          className="p-2 rounded-lg hover:bg-bg-elevated transition-colors"
          aria-label="Settings"
        >
          <span className="text-lg">⚙️</span>
        </button>
        <button
          onClick={() => navigate('/chat')}
          className="relative p-2 rounded-lg hover:bg-bg-elevated transition-colors"
          aria-label="Messages"
        >
          <MessageCircle className="w-5 h-5 text-text-primary" />
          {chatUnreadCount > 0 && (
            <div className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-accent-green text-bg-primary text-[10px] font-bold flex items-center justify-center">
              {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
            </div>
          )}
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

      {/* Push notification prompt */}
      <PushPermissionBanner />

      {/* ── My Bets strip ── */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex flex-col items-center mb-3">
          <h2 className="text-base font-bold text-white">My Bets</h2>
          {actionCount > 0 && (
            <span className="text-[10px] font-black text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 rounded-full animate-pulse mt-1">
              {actionCount} need{actionCount === 1 ? 's' : ''} action
            </span>
          )}
        </div>

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
                  userId={userId}
                  onNavigate={(id) => navigate(`/bet/${id}`)}
                />
              )
            })
          )}
        </div>
      </div>

      {/* Groups grid */}
      <div className="px-4 border-t border-border-subtle">
        <h2 className="text-base font-bold text-white text-center pt-4 pb-3">
          Groups
        </h2>
        {/* Create group / Join with code */}
        <div className="flex gap-3 pb-4">
          <button
            onClick={() => navigate('/group/create')}
            className="flex-1 h-12 rounded-xl bg-accent-green text-bg-primary font-bold flex items-center justify-center gap-2"
          >
            <span className="text-lg">+</span> Create group
          </button>
          <button
            onClick={() => navigate('/group/join')}
            className="flex-1 h-12 rounded-xl bg-bg-elevated border border-border-subtle text-text-primary font-bold"
          >
            Join with code
          </button>
        </div>
        <CircleGrid
          items={groups.map((g) => ({
            id: g.id,
            icon: g.avatar_emoji,
            label: g.name,
          }))}
          onItemClick={(id) => navigate(`/group/${id}`)}
        />
      </div>

      <NotificationPanel open={notificationOpen} onOpenChange={setNotificationOpen} />
      </div>{/* end scrollable content */}

      {/* Quick Bet FAB — absolute inside phone frame, bottom-right */}
      <div className="absolute bottom-[70px] right-4 z-20 flex flex-col items-end gap-2 pointer-events-none">
        <span className="pointer-events-auto text-[10px] font-bold text-text-muted uppercase tracking-wider bg-bg-card px-2.5 py-1 rounded-full border border-border-subtle shadow-sm">
          Quick Bet
        </span>
        <button
          onClick={() => navigate('/bet/create')}
          className="pointer-events-auto w-14 h-14 rounded-full bg-accent-green text-bg-primary flex items-center justify-center text-2xl font-black shadow-[0_4px_20px_rgba(0,230,118,0.5)] active:scale-95 transition-transform"
          aria-label="Create bet"
        >
          +
        </button>
      </div>
    </div>
  )
}
