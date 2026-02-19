import { useEffect, useState, useMemo } from 'react'
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
import type { BetCategory, BetType } from '@/lib/database.types'

const FILTER_CHIPS: { id: string; label: string; category?: BetCategory; type?: BetType }[] = [
  { id: 'all', label: 'All' },
  { id: 'fitness', label: '🏋️ Fitness', category: 'fitness' },
  { id: 'money', label: '💰 Money', category: 'money' },
  { id: 'social', label: '🎭 Social', category: 'social' },
  { id: 'h2h', label: '⚔️ H2H', type: 'h2h' },
  { id: 'compete', label: '🏆 Compete', type: 'competition' },
  { id: 'wildcard', label: 'Wildcard 🎲', category: 'wildcard' },
]

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
}: {
  bet: BetWithSides
  groupName: string
  claimantName: string
  claimantAvatar: string
  onNavigate: (betId: string) => void
}) {
  const countdown = useCountdown(bet.deadline)
  const sides = bet.bet_sides ?? []
  const riderCount = sides.filter((s) => s.side === 'rider').length
  const doubterCount = sides.filter((s) => s.side === 'doubter').length
  const { riderPct, doubterPct } = formatOdds(riderCount, doubterCount)

  const status = bet.status === 'proof_submitted' ? 'proof' : bet.status === 'active' ? 'active' : 'completed'
  const showProofBadge = bet.status === 'proof_submitted'

  return (
    <BetCard
      groupName={groupName}
      category={BET_CATEGORIES[bet.category]?.label ?? bet.category.toUpperCase()}
      countdown={showProofBadge ? '' : countdown.formatted}
      claimText={bet.title}
      claimantName={claimantName}
      claimantAvatar={claimantAvatar}
      ridersPercent={riderPct}
      doubtersPercent={doubterPct}
      ridersCount={riderCount}
      doubtersCount={doubterCount}
      stake={formatStake(bet)}
      status={status}
      urgent={countdown.isUrgent && !countdown.isExpired}
      onClick={() => onNavigate(bet.id)}
    />
  )
}

export function TheBoard() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)

  const groups = useGroupStore((s) => s.groups)
  const activeGroup = useGroupStore((s) => s.activeGroup)
  const fetchGroups = useGroupStore((s) => s.fetchGroups)
  const setActiveGroup = useGroupStore((s) => s.setActiveGroup)

  const bets = useBetStore((s) => s.bets)
  const fetchBets = useBetStore((s) => s.fetchBets)
  const setFilters = useBetStore((s) => s.setFilters)
  const filters = useBetStore((s) => s.filters)
  const isLoading = useBetStore((s) => s.isLoading)

  const unreadCount = useNotificationStore((s) => s.unreadCount)

  const [activeTab, setActiveTab] = useState<'my' | 'group'>('group')
  const [activeFilterId, setActiveFilterId] = useState('all')
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [claimantMap, setClaimantMap] = useState<Map<string, { display_name: string; avatar_url: string | null }>>(new Map())

  const effectiveGroup = activeGroup ?? groups[0] ?? null

  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  useEffect(() => {
    if (groups.length > 0 && !activeGroup) {
      setActiveGroup(groups[0])
    }
  }, [groups, activeGroup, setActiveGroup])

  useEffect(() => {
    if (effectiveGroup) {
      fetchBets(effectiveGroup.id)
    }
  }, [effectiveGroup?.id, fetchBets, filters])


  useEffect(() => {
    const ids = [...new Set(bets.map((b) => b.claimant_id))]
    if (ids.length === 0) return
    getProfilesByIds(ids).then(setClaimantMap)
  }, [bets])

  useRealtime(
    'bets',
    () => {
      if (effectiveGroup) fetchBets(effectiveGroup.id)
    },
    { filter: effectiveGroup ? `group_id=eq.${effectiveGroup.id}` : undefined },
  )

  useRealtime('bet_sides', () => {
    if (effectiveGroup) fetchBets(effectiveGroup.id)
  })

  const filteredBets = useMemo(() => {
    let list = bets
    if (activeTab === 'my' && user) {
      list = list.filter((b) => (b.bet_sides ?? []).some((s) => s.user_id === user.id))
    }
    return list
  }, [bets, activeTab, user])

  const activeBetCount = useMemo(
    () => bets.filter((b) => b.status === 'active').length,
    [bets],
  )

  const handleFilterClick = (chip: (typeof FILTER_CHIPS)[number]) => {
    setActiveFilterId(chip.id)
    setFilters({
      category: chip.category ?? null,
      type: chip.type ?? null,
    })
  }

  const [now, setNow] = useState(() =>
    new Date().toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }),
  )
  useEffect(() => {
    const id = setInterval(
      () =>
        setNow(
          new Date().toLocaleString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          }),
        ),
      60_000,
    )
    return () => clearInterval(id)
  }, [])

  if (groups.length === 0 && !isLoading) {
    return (
      <div className="h-full bg-bg-primary grain-texture flex flex-col items-center justify-center px-6 pb-24">
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
      {/* Header */}
        <div className="px-6 pt-12 pb-4">
        {/* Create / Join group — always visible when user has groups */}
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => navigate('/group/create')}
            className="px-3 py-1.5 rounded-full text-xs font-bold bg-accent-green/20 text-accent-green border border-accent-green/40"
          >
            + Create group
          </button>
          <button
            onClick={() => navigate('/group/join')}
            className="px-3 py-1.5 rounded-full text-xs font-bold bg-bg-elevated text-text-muted border border-border-subtle"
          >
            Join with code
          </button>
        </div>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted mb-1">
              THE BOARD
            </h1>
            <p className="text-xs text-text-muted tabular-nums">{now}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/settings')}
              className="p-2 rounded-lg hover:bg-bg-elevated transition-colors"
              aria-label="Settings"
            >
              <span className="text-lg">⚙️</span>
            </button>
            <button
              onClick={() => setNotificationOpen(true)}
              className="relative"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5 text-text-primary" />
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-live-indicator rounded-full text-[9px] font-black text-white flex items-center justify-center">
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
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-accent-green/50 via-gold/50 to-purple/50" />
              )}
            </button>
          </div>
        </div>

        {/* Live indicator */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-live-indicator/10 border border-live-indicator/30 rounded-full">
            <div className="w-2 h-2 rounded-full bg-live-indicator pulse-live" />
            <span className="text-xs font-bold text-live-indicator uppercase tracking-wide">
              LIVE · {activeBetCount} active
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('my')}
            className={`px-5 py-2 rounded-full font-bold text-sm ${
              activeTab === 'my'
                ? 'bg-accent-green text-white'
                : 'bg-bg-elevated text-text-muted'
            }`}
          >
            My Bets
          </button>
          <button
            onClick={() => setActiveTab('group')}
            className={`px-5 py-2 rounded-full font-bold text-sm ${
              activeTab === 'group'
                ? 'bg-accent-green text-white'
                : 'bg-bg-elevated text-text-muted'
            }`}
          >
            Group Feed
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {FILTER_CHIPS.map((chip) => (
            <button
              key={chip.id}
              onClick={() => handleFilterClick(chip)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${
                activeFilterId === chip.id
                  ? 'bg-accent-green/20 text-accent-green border border-accent-green/40'
                  : 'bg-bg-elevated text-text-muted'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bet Cards */}
      <div className="px-6 space-y-3 mb-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-accent-green border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredBets.length === 0 ? (
          <div className="text-center py-12 text-text-muted text-sm">
            No bets yet. Create one to get started!
          </div>
        ) : (
          filteredBets.map((bet) => {
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
              />
            )
          })
        )}
      </div>

      <NotificationPanel open={notificationOpen} onOpenChange={setNotificationOpen} />

      {/* FAB with Quick Bet label */}
      <div className="fixed bottom-28 left-1/2 -translate-x-1/2 flex items-center gap-3 z-10">
        <span className="text-xs font-bold text-text-muted uppercase tracking-wide bg-bg-elevated px-3 py-1.5 rounded-full border border-border-subtle">
          Quick Bet
        </span>
        <button
          onClick={() => navigate('/bet/create')}
          className="w-14 h-14 rounded-full bg-accent-green text-white flex items-center justify-center text-2xl font-bold glow-green btn-pressed shadow-xl"
        >
          +
        </button>
      </div>
    </div>
  )
}
