import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { ArrowLeft, Trophy, XCircle, MinusCircle, DollarSign, Flame } from 'lucide-react'
import { useAuthStore } from '@/stores'
import { getBetStatsForUser } from '@/lib/api/stats'
import { formatMoney } from '@/lib/utils/formatters'
import { BET_CATEGORIES } from '@/lib/utils/constants'
import type { BetStatsForUser as BetStatsType, UserBetResult } from '@/lib/api/stats'

function ResultBadge({ result }: { result: UserBetResult }) {
  if (result === 'won')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-accent-green/20 text-accent-green">
        <Trophy className="w-3 h-3" /> W
      </span>
    )
  if (result === 'lost')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-accent-coral/20 text-accent-coral">
        <XCircle className="w-3 h-3" /> L
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-bg-elevated text-text-muted">
      <MinusCircle className="w-3 h-3" /> —
    </span>
  )
}

export function BetStatsScreen() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [stats, setStats] = useState<BetStatsType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    getBetStatsForUser(user.id)
      .then(setStats)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load stats'))
      .finally(() => setLoading(false))
  }, [user?.id])

  if (loading) {
    return (
      <div className="h-full bg-bg-primary flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent-green border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full bg-bg-primary flex flex-col items-center justify-center px-6">
        <p className="text-destructive text-center mb-4">{error}</p>
        <button onClick={() => navigate(-1)} className="text-accent-green font-bold">
          Go back
        </button>
      </div>
    )
  }

  const t = stats?.totals ?? {
    wins: 0,
    losses: 0,
    voids: 0,
    moneyWon: 0,
    moneyLost: 0,
    punishmentsLost: 0,
  }
  const completedBets = stats?.completedBets ?? []
  const totalSettled = t.wins + t.losses + t.voids
  const winRate = t.wins + t.losses > 0 ? Math.round((t.wins / (t.wins + t.losses)) * 100) : 0

  return (
    <div className="h-full bg-bg-primary overflow-y-auto pb-8">
      <div className="px-6 pt-12 pb-6 border-b border-border-subtle">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-text-primary font-bold mb-4"
        >
          <ArrowLeft className="w-5 h-5" /> Back
        </button>
        <h1 className="text-2xl font-black text-text-primary">Bet stats</h1>
        <p className="text-text-muted text-sm mt-1">Wins, losses, money & challenges</p>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-bg-card rounded-xl border border-border-subtle p-4 text-center">
            <p className="text-text-muted text-[11px] uppercase tracking-wider mb-1">Wins</p>
            <p className="text-2xl font-black text-accent-green">{t.wins}</p>
          </div>
          <div className="bg-bg-card rounded-xl border border-border-subtle p-4 text-center">
            <p className="text-text-muted text-[11px] uppercase tracking-wider mb-1">Losses</p>
            <p className="text-2xl font-black text-accent-coral">{t.losses}</p>
          </div>
          <div className="bg-bg-card rounded-xl border border-border-subtle p-4 text-center">
            <p className="text-text-muted text-[11px] uppercase tracking-wider mb-1">Voids</p>
            <p className="text-2xl font-black text-text-muted">{t.voids}</p>
          </div>
        </div>

        <div className="bg-bg-card rounded-xl border border-border-subtle p-4 text-center">
          <p className="text-text-muted text-[11px] uppercase tracking-wider mb-2">Win rate (settled)</p>
          <p className="text-3xl font-black text-text-primary">{winRate}%</p>
          <p className="text-xs text-text-muted mt-1">{t.wins + t.losses} bets decided</p>
        </div>

        {/* Money */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-accent-green/10 rounded-xl border border-accent-green/30 p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-accent-green" />
              <p className="text-[11px] font-bold uppercase tracking-wider text-accent-green">Money won</p>
            </div>
            <p className="text-xl font-black text-accent-green">{formatMoney(t.moneyWon)}</p>
          </div>
          <div className="bg-accent-coral/10 rounded-xl border border-accent-coral/30 p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-accent-coral" />
              <p className="text-[11px] font-bold uppercase tracking-wider text-accent-coral">Money lost</p>
            </div>
            <p className="text-xl font-black text-accent-coral">{formatMoney(t.moneyLost)}</p>
          </div>
        </div>

        {/* Punishments */}
        <div className="bg-bg-card rounded-xl border border-border-subtle p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-accent-coral" />
            <div>
              <p className="text-sm font-bold text-text-primary">Punishments taken</p>
              <p className="text-xs text-text-muted">Challenges you had to do after losing</p>
            </div>
          </div>
          <p className="text-2xl font-black text-accent-coral">{t.punishmentsLost}</p>
        </div>

        {/* Net */}
        <div className="bg-bg-elevated rounded-xl border border-border-subtle p-4 text-center">
          <p className="text-text-muted text-[11px] uppercase tracking-wider mb-1">Net (money)</p>
          <p
            className={`text-2xl font-black ${
              t.moneyWon - t.moneyLost >= 0 ? 'text-accent-green' : 'text-accent-coral'
            }`}
          >
            {t.moneyWon - t.moneyLost >= 0 ? '+' : ''}
            {formatMoney(t.moneyWon - t.moneyLost)}
          </p>
        </div>

        {/* List of completed bets */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-text-muted mb-3">
            All completed challenges ({totalSettled})
          </h2>
          {completedBets.length === 0 ? (
            <p className="text-text-muted text-sm py-4">No completed bets yet.</p>
          ) : (
            <div className="space-y-2">
              {completedBets.map((row) => {
                const { bet, userResult, stakeMoney, hadPunishmentStake, punishmentLabel } = row
                const category = BET_CATEGORIES[bet.category]
                return (
                  <button
                    key={bet.id}
                    onClick={() => navigate(`/bet/${bet.id}`)}
                    className="w-full bg-bg-card rounded-xl border border-border-subtle p-3 flex items-center gap-3 text-left hover:bg-bg-elevated transition-colors"
                  >
                    <ResultBadge result={userResult} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text-primary truncate">{bet.title}</p>
                      <p className="text-xs text-text-muted">
                        {category?.emoji} {category?.label ?? bet.category} ·{' '}
                        {new Date(bet.created_at).toLocaleDateString()}
                      </p>
                      {(stakeMoney > 0 || hadPunishmentStake) && (
                        <p className="text-[11px] text-text-muted mt-0.5">
                          {stakeMoney > 0 && formatMoney(stakeMoney)}
                          {stakeMoney > 0 && hadPunishmentStake && ' · '}
                          {hadPunishmentStake && (punishmentLabel ?? 'Punishment')}
                        </p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
