import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { getH2HBetsForUser } from '@/lib/api/h2h'
import { getProfilesByIds } from '@/lib/api/profiles'
import { formatMoney } from '@/lib/utils/formatters'
import { formatOdds } from '@/lib/utils/formatters'
import { BET_CATEGORIES } from '@/lib/utils/constants'
import type { BetWithSides } from '@/lib/api/bets'
import { useAuthStore } from '@/stores'
import { SportsbookButton } from '../components/SportsbookButton'
import { format } from 'date-fns'

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop'

function formatStake(bet: {
  stake_money: number | null
  stake_custom_punishment: string | null
  stake_punishment_id: string | null
  stake_type: string
}) {
  if (bet.stake_money) return formatMoney(bet.stake_money)
  if (bet.stake_custom_punishment) return bet.stake_custom_punishment
  if (bet.stake_punishment_id) return '🔥 Punishment'
  if (bet.stake_type === 'both') return 'Money or Punishment'
  return '—'
}

export function HeadToHead() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [bets, setBets] = useState<BetWithSides[]>([])
  const [profileMap, setProfileMap] = useState<Map<string, { display_name: string; avatar_url: string | null }>>(new Map())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    getH2HBetsForUser().then((data) => {
      setBets(data)
      setIsLoading(false)
    })
  }, [])

  useEffect(() => {
    const ids = new Set<string>()
    bets.forEach((b) => {
      ids.add(b.claimant_id)
      if (b.h2h_opponent_id) ids.add(b.h2h_opponent_id)
      b.bet_sides?.forEach((s) => ids.add(s.user_id))
    })
    if (ids.size === 0) return
    getProfilesByIds([...ids]).then(setProfileMap)
  }, [bets])

  const getChallenger = (bet: BetWithSides) => profileMap.get(bet.claimant_id)
  const getOpponent = (bet: BetWithSides) =>
    bet.h2h_opponent_id ? profileMap.get(bet.h2h_opponent_id) : null
  const getOpponentOrSide = (bet: BetWithSides) => {
    if (bet.h2h_opponent_id) {
      const p = profileMap.get(bet.h2h_opponent_id)
      if (p) return p.display_name
    }
    const opponentSide = bet.bet_sides?.find((s) => s.user_id !== bet.claimant_id)
    if (opponentSide) return profileMap.get(opponentSide.user_id)?.display_name ?? 'Opponent'
    return 'You'
  }

  const isPendingForMe = (bet: BetWithSides) =>
    bet.status === 'pending' && bet.h2h_opponent_id === user?.id

  const riders = (bet: BetWithSides) => bet.bet_sides?.filter((s) => s.side === 'rider') ?? []
  const doubters = (bet: BetWithSides) => bet.bet_sides?.filter((s) => s.side === 'doubter') ?? []
  const odds = (bet: BetWithSides) => formatOdds(riders(bet).length, doubters(bet).length)

  const formatTimeframe = (deadline: string) => {
    const d = new Date(deadline)
    return format(d, 'EEE MMM d\' at \'h:mm a')
  }

  if (isLoading) {
    return (
      <div className="h-full bg-bg-primary flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent-green border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-full bg-bg-primary overflow-y-auto pb-24">
      <div className="px-6 pt-12 pb-6">
        <h1 className="text-3xl font-black text-text-primary mb-2">⚔️ HEAD TO HEAD</h1>
        <p className="text-sm text-text-muted">Challenge a friend directly</p>
      </div>

      <div className="px-6 space-y-4">
        {bets.length === 0 ? (
          <div className="bg-bg-card border border-border-subtle rounded-xl p-8 text-center">
            <p className="text-text-muted mb-4">No H2H challenges yet</p>
            <SportsbookButton onClick={() => navigate('/h2h/create')}>
              CREATE H2H CHALLENGE
            </SportsbookButton>
          </div>
        ) : (
          bets.map((bet) => {
            const challenger = getChallenger(bet)
            const opponent = getOpponent(bet)
            const opponentName = getOpponentOrSide(bet)
            const { riderPct, doubterPct } = odds(bet)
            const isPending = bet.status === 'pending'
            const showAccept = isPendingForMe(bet)

            return (
              <div
                key={bet.id}
                onClick={() => !showAccept && navigate(`/bet/${bet.id}`)}
                className={`bg-bg-card border-l-4 rounded-xl p-5 shadow-lg cursor-pointer transition-opacity hover:opacity-95 ${
                  bet.status === 'active' ? 'border-l-accent-green' : 'border-l-purple'
                }`}
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                    H2H
                  </span>
                  <div
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${
                      bet.status === 'active'
                        ? 'bg-accent-green/20'
                        : bet.status === 'pending'
                          ? 'bg-gold/20'
                          : 'bg-text-muted/20'
                    }`}
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        bet.status === 'active' ? 'bg-accent-green' : 'bg-gold'
                      } ${bet.status === 'active' ? 'pulse-live' : ''}`}
                    />
                    <span
                      className={`text-[10px] font-bold uppercase ${
                        bet.status === 'active' ? 'text-accent-green' : 'text-gold'
                      }`}
                    >
                      {bet.status === 'pending' ? 'PENDING' : bet.status === 'active' ? 'LIVE' : bet.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-5">
                  <div className="flex flex-col items-center">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-accent-green to-accent-coral mb-2 overflow-hidden">
                      <img
                        src={challenger?.avatar_url ?? DEFAULT_AVATAR}
                        alt={challenger?.display_name ?? 'Challenger'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="font-bold text-sm text-text-primary">
                      {challenger?.display_name ?? 'Challenger'}
                    </span>
                  </div>

                  <div className="text-3xl font-black text-gold">VS</div>

                  <div className="flex flex-col items-center">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple to-accent-coral mb-2 overflow-hidden">
                      {opponent?.avatar_url ? (
                        <img
                          src={opponent.avatar_url}
                          alt={opponentName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl bg-bg-elevated">
                          👤
                        </div>
                      )}
                    </div>
                    <span className="font-bold text-sm text-text-primary">{opponentName}</span>
                  </div>
                </div>

                <div className="bg-bg-elevated rounded-lg p-4 mb-4">
                  <p className="text-center font-bold text-base text-text-primary">{bet.title}</p>
                </div>

                {riders(bet).length + doubters(bet).length >= 2 && (
                  <div className="mb-4">
                    <div className="h-3 overflow-hidden flex rounded-sm mb-1">
                      <div className="bg-accent-green" style={{ width: `${riderPct}%` }} />
                      <div className="bg-accent-coral" style={{ width: `${doubterPct}%` }} />
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-accent-green tabular-nums">{riderPct}%</span>
                      <span className="font-bold text-accent-coral tabular-nums">{doubterPct}%</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-semibold px-3 py-1.5 bg-bg-elevated rounded-full">
                    {formatTimeframe(bet.deadline)}
                  </span>
                  <span className="text-xs font-semibold px-3 py-1.5 bg-accent-coral/20 text-accent-coral rounded-full">
                    {formatStake(bet)}
                  </span>
                </div>

                {showAccept && (
                  <div className="mt-4 flex gap-2">
                    <SportsbookButton
                      fullWidth
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/bet/${bet.id}`)
                      }}
                    >
                      View & Accept
                    </SportsbookButton>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {bets.length > 0 && (
        <div className="px-6 mt-6">
          <SportsbookButton onClick={() => navigate('/h2h/create')}>
            CREATE H2H CHALLENGE
          </SportsbookButton>
        </div>
      )}
    </div>
  )
}
