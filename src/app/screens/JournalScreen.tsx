import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Plus, Archive, Trophy, XCircle, MinusCircle } from 'lucide-react'
import { useAuthStore, useGroupStore } from '@/stores'
import { getGroupBets } from '@/lib/api/bets'
import { BET_CATEGORIES } from '@/lib/utils/constants'
import { formatMoney } from '@/lib/utils/formatters'
import type { BetWithSides } from '@/stores/betStore'
import type { Group } from '@/lib/database.types'

function StatusPill({ status }: { status: string }) {
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent-green/20 text-accent-green">
        <Trophy className="w-3 h-3" /> Done
      </span>
    )
  }
  if (status === 'voided') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-bg-elevated text-text-muted">
        <MinusCircle className="w-3 h-3" /> Void
      </span>
    )
  }
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent-green/10 text-accent-green border border-accent-green/30">
        Live
      </span>
    )
  }
  if (status === 'proof_submitted') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/20 text-yellow-400">
        Proof
      </span>
    )
  }
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-bg-elevated text-text-muted">
      {status}
    </span>
  )
}

export function JournalScreen() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const groups = useGroupStore((s) => s.groups)
  const fetchGroups = useGroupStore((s) => s.fetchGroups)
  const groupsLoading = useGroupStore((s) => s.isLoading)

  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [groupBets, setGroupBets] = useState<BetWithSides[]>([])
  const [betsLoading, setBetsLoading] = useState(false)

  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  // Auto-select first group when groups load
  useEffect(() => {
    if (groups.length > 0 && !selectedGroup) {
      setSelectedGroup(groups[0])
    }
  }, [groups, selectedGroup])

  useEffect(() => {
    if (!selectedGroup) {
      setGroupBets([])
      return
    }
    setBetsLoading(true)
    getGroupBets(selectedGroup.id)
      .then(setGroupBets)
      .catch(() => setGroupBets([]))
      .finally(() => setBetsLoading(false))
  }, [selectedGroup?.id])

  return (
    <div className="h-full bg-bg-primary overflow-y-auto pb-6">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-border-subtle flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-text-primary">Journal</h1>
          <p className="text-text-muted text-sm mt-0.5">Your groups &amp; bet history</p>
        </div>
        <button
          onClick={() => navigate('/archive')}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-bg-elevated transition-colors"
          aria-label="Archive"
        >
          <Archive className="w-5 h-5 text-text-muted" />
        </button>
      </div>

      {/* Groups row */}
      <div className="px-6 pt-4 pb-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-3">
          My Groups
        </p>
        {groupsLoading && groups.length === 0 ? (
          <div className="flex gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="w-24 h-20 rounded-xl bg-bg-card border border-border-subtle animate-pulse" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="flex gap-3 items-center">
            <p className="text-text-muted text-sm">No groups yet.</p>
            <button
              onClick={() => navigate('/group/create')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-accent-green/20 text-accent-green text-xs font-bold border border-accent-green/40"
            >
              <Plus className="w-3 h-3" /> Create
            </button>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {groups.map((g) => {
              const isActive = selectedGroup?.id === g.id
              return (
                <button
                  key={g.id}
                  onClick={() => setSelectedGroup(g)}
                  className={`shrink-0 w-24 rounded-xl border p-3 flex flex-col items-center gap-1 transition-all ${
                    isActive
                      ? 'bg-accent-green/10 border-accent-green/50'
                      : 'bg-bg-card border-border-subtle hover:bg-bg-elevated'
                  }`}
                >
                  <span className="text-2xl">{g.avatar_emoji}</span>
                  <p className={`text-[11px] font-bold truncate w-full text-center ${isActive ? 'text-accent-green' : 'text-text-primary'}`}>
                    {g.name}
                  </p>
                </button>
              )
            })}
            <button
              onClick={() => navigate('/group/create')}
              className="shrink-0 w-24 rounded-xl border border-dashed border-border-subtle p-3 flex flex-col items-center gap-1 hover:bg-bg-elevated transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-bg-elevated flex items-center justify-center">
                <Plus className="w-4 h-4 text-text-muted" />
              </div>
              <p className="text-[11px] text-text-muted font-bold">New</p>
            </button>
          </div>
        )}
      </div>

      {/* Bet History */}
      <div className="px-6 pt-4">
        {selectedGroup ? (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                {selectedGroup.avatar_emoji} {selectedGroup.name} — History
              </p>
              <button
                onClick={() => navigate(`/group/${selectedGroup.id}`)}
                className="text-[11px] text-accent-green font-bold"
              >
                View Group →
              </button>
            </div>
            {betsLoading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-14 rounded-lg bg-bg-card border border-border-subtle animate-pulse" />
                ))}
              </div>
            ) : groupBets.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-text-muted text-sm mb-3">No bets in this group yet.</p>
                <button
                  onClick={() => navigate('/bet/create')}
                  className="px-4 py-2 rounded-xl bg-accent-green/20 text-accent-green text-sm font-bold border border-accent-green/40"
                >
                  Create a bet
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {groupBets.map((bet) => {
                  const category = BET_CATEGORIES[bet.category]
                  const participantCount = bet.bet_sides?.length ?? 0
                  return (
                    <button
                      key={bet.id}
                      onClick={() => navigate(`/bet/${bet.id}`)}
                      className="w-full bg-bg-card rounded-xl border border-border-subtle px-3 py-3 flex items-center gap-3 text-left hover:bg-bg-elevated transition-colors"
                    >
                      <span className="text-xl shrink-0">{category?.emoji ?? '🎯'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text-primary truncate">{bet.title}</p>
                        <p className="text-[11px] text-text-muted mt-0.5">
                          {new Date(bet.created_at).toLocaleDateString()} · {participantCount} player{participantCount !== 1 ? 's' : ''}
                          {bet.stake_money ? ` · ${formatMoney(bet.stake_money)}` : ''}
                        </p>
                      </div>
                      <StatusPill status={bet.status} />
                    </button>
                  )
                })}
              </div>
            )}
          </>
        ) : !groupsLoading && groups.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-4xl mb-3">📖</p>
            <p className="text-text-primary font-bold mb-1">No journal yet</p>
            <p className="text-text-muted text-sm mb-4">Create or join a group to start tracking bets.</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => navigate('/group/create')}
                className="px-4 py-2 rounded-xl bg-accent-green text-white text-sm font-bold"
              >
                Create Group
              </button>
              <button
                onClick={() => navigate('/group/join')}
                className="px-4 py-2 rounded-xl bg-bg-elevated text-text-primary text-sm font-bold border border-border-subtle"
              >
                Join Group
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
