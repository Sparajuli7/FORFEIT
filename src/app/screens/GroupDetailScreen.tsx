import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ChevronLeft, Copy, LogOut, MessageCircle, ChevronRight } from 'lucide-react'
import { useGroupStore, useBetStore, useAuthStore, useChatStore } from '@/stores'
import { getGroupBets } from '@/lib/api/bets'
import { getProfilesWithRepByIds } from '@/lib/api/profiles'
import { AvatarWithRepBadge } from '@/app/components/RepBadge'
import { BetCard } from '@/app/components/BetCard'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog'
import { useCountdown } from '@/lib/hooks/useCountdown'
import { formatMoney, formatOdds } from '@/lib/utils/formatters'
import { BET_CATEGORIES } from '@/lib/utils/constants'
import type { BetWithSides } from '@/stores/betStore'
import type { ProfileWithRep } from '@/lib/api/profiles'

const APP_URL = typeof window !== 'undefined' ? window.location.origin : ''
const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop'

function formatStake(bet: BetWithSides): string {
  if (bet.stake_money) return formatMoney(bet.stake_money)
  if (bet.stake_custom_punishment) return bet.stake_custom_punishment
  if (bet.stake_punishment_id) return '🔥 Punishment'
  return '—'
}

function GroupBetCard({
  bet,
  group,
  claimant,
  onNavigate,
}: {
  bet: BetWithSides
  group: { name: string; avatar_emoji: string }
  claimant: ProfileWithRep | undefined
  onNavigate: (betId: string) => void
}) {
  const countdown = useCountdown(bet.deadline)
  const sides = bet.bet_sides ?? []
  const riderCount = sides.filter((s) => s.side === 'rider').length
  const doubterCount = sides.filter((s) => s.side === 'doubter').length
  const { riderPct, doubterPct } = formatOdds(riderCount, doubterCount)
  const status =
    bet.status === 'proof_submitted'
      ? 'proof'
      : bet.status === 'active'
        ? 'active'
        : 'completed'
  const showProofBadge = bet.status === 'proof_submitted'

  return (
    <BetCard
      groupName={`${group.name} ${group.avatar_emoji}`}
      category={BET_CATEGORIES[bet.category]?.label ?? bet.category.toUpperCase()}
      countdown={showProofBadge ? '' : countdown.formatted}
      claimText={bet.title}
      claimantName={claimant?.display_name ?? 'Anonymous'}
      claimantAvatar={claimant?.avatar_url ?? DEFAULT_AVATAR}
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

export function GroupDetailScreen() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const user = useAuthStore((s) => s.user)
  const groups = useGroupStore((s) => s.groups)
  const members = useGroupStore((s) => s.members)
  const fetchGroups = useGroupStore((s) => s.fetchGroups)
  const fetchMembers = useGroupStore((s) => s.fetchMembers)
  const leaveGroup = useGroupStore((s) => s.leaveGroup)
  const setActiveGroup = useGroupStore((s) => s.setActiveGroup)

  const [bets, setBets] = useState<BetWithSides[]>([])
  const [profileMap, setProfileMap] = useState<Map<string, ProfileWithRep>>(new Map())
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [openingChat, setOpeningChat] = useState(false)

  const group = groups.find((g) => g.id === id)

  useEffect(() => {
    if (groups.length === 0) fetchGroups()
  }, [groups.length, fetchGroups])

  useEffect(() => {
    if (id) fetchMembers(id)
  }, [id, fetchMembers])

  useEffect(() => {
    if (!id) return
    getGroupBets(id).then(setBets)
  }, [id])

  useEffect(() => {
    const ids = members.map((m) => m.user_id)
    if (ids.length === 0) return
    getProfilesWithRepByIds(ids).then(setProfileMap)
  }, [members])

  const handleCopyInvite = () => {
    if (group?.invite_code) {
      navigator.clipboard.writeText(`${APP_URL}/group/join/${group.invite_code}`)
    }
  }

  const handleLeave = async () => {
    if (!id) return
    setLeaving(true)
    await leaveGroup(id)
    setLeaving(false)
    setShowLeaveConfirm(false)
    navigate('/home', { replace: true })
  }

  if (!group) {
    return (
      <div className="h-full bg-bg-primary flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-accent-green border-t-transparent rounded-full animate-spin" />
          <p className="text-text-muted text-sm">Loading group...</p>
        </div>
      </div>
    )
  }

  const inviteLink = `${APP_URL}/group/join/${group.invite_code}`

  return (
    <div className="h-full bg-bg-primary grain-texture overflow-y-auto pb-6">
      <button
        onClick={() => navigate(-1)}
        className="absolute top-6 left-6 p-2 -m-2 text-text-muted hover:text-text-primary transition-colors z-10"
        aria-label="Go back"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <div className="px-6 pt-12 pb-6">
        <div className="text-5xl mb-2 text-center">{group.avatar_emoji}</div>
        <h1 className="text-2xl font-black text-text-primary text-center mb-1">
          {group.name}
        </h1>
        <p className="text-text-muted text-sm text-center mb-6">
          {members.length} member{members.length === 1 ? '' : 's'}
        </p>

        {/* Members */}
        <div className="mb-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted mb-3">
            Members
          </h3>
          <div className="flex flex-wrap gap-3">
            {members.map((m) => {
              const profile = profileMap.get(m.user_id)
              return (
                <div
                  key={m.user_id}
                  className="flex items-center gap-2 bg-bg-card rounded-xl border border-border-subtle px-3 py-2"
                >
                  <div className="relative">
                    <AvatarWithRepBadge
                      src={profile?.avatar_url ?? null}
                      alt={profile?.display_name ?? 'Member'}
                      score={profile?.rep_score ?? 100}
                      name={profile?.display_name}
                      size={40}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">
                      {profile?.display_name ?? 'Unknown'}
                    </p>
                    <p className="text-xs text-text-muted">@{profile?.username ?? '—'}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Group Chat */}
        <button
          disabled={openingChat}
          onClick={async () => {
            if (!id || openingChat) return
            setOpeningChat(true)
            try {
              const convId = await useChatStore.getState().getOrCreateGroupChat(id)
              navigate(`/chat/${convId}`)
            } catch (e) {
              console.error('Failed to open group chat:', e)
            } finally {
              setOpeningChat(false)
            }
          }}
          className="w-full flex items-center gap-3 bg-bg-card border border-border-subtle rounded-xl p-4 mb-6 hover:bg-bg-elevated transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-accent-green/20 flex items-center justify-center">
            {openingChat ? (
              <div className="w-5 h-5 border-2 border-accent-green border-t-transparent rounded-full animate-spin" />
            ) : (
              <MessageCircle className="w-5 h-5 text-accent-green" />
            )}
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-bold text-text-primary">Group Chat</p>
            <p className="text-xs text-text-muted">Message your group</p>
          </div>
          <ChevronRight className="w-5 h-5 text-text-muted" />
        </button>

        {/* Invite link */}
        <div className="bg-bg-card border border-border-subtle rounded-xl p-4 mb-6">
          <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
            Invite link
          </p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={inviteLink}
              className="flex-1 text-xs text-text-primary bg-bg-elevated rounded-lg px-3 py-2 font-mono truncate"
            />
            <button
              onClick={handleCopyInvite}
              className="p-2 rounded-lg bg-accent-green/20 text-accent-green hover:bg-accent-green/30 transition-colors"
              aria-label="Copy link"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Recent bets */}
        <div className="mb-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted mb-3">
            Recent bets
          </h3>
          {bets.length === 0 ? (
            <p className="text-text-muted text-sm py-4">No bets yet in this group.</p>
          ) : (
            <div className="space-y-3">
              {bets.slice(0, 5).map((bet) => (
                <GroupBetCard
                  key={bet.id}
                  bet={bet}
                  group={group}
                  claimant={profileMap.get(bet.claimant_id)}
                  onNavigate={(betId) => navigate(`/bet/${betId}`)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Leave group */}
        <button
          onClick={() => setShowLeaveConfirm(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-accent-coral/50 text-accent-coral font-bold text-sm hover:bg-accent-coral/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Leave Group
        </button>
      </div>

      <AlertDialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave group?</AlertDialogTitle>
            <AlertDialogDescription>
              You will be removed from {group.name}. You can rejoin later with an invite link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeave}
              disabled={leaving}
              className="bg-accent-coral hover:bg-accent-coral/90"
            >
              {leaving ? 'Leaving...' : 'Leave'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
