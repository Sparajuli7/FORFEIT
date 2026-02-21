import { supabase } from '@/lib/supabase'
import { getOutcome } from '@/lib/api/outcomes'
import type { BetWithSides } from '@/lib/api/bets'
import type { Outcome, BetSideEntry } from '@/lib/database.types'
import type { OutcomeResult } from '@/lib/database.types'

const BET_SELECT = '*, bet_sides(*)' as const

export type UserBetResult = 'won' | 'lost' | 'void'

export interface CompletedBetRow {
  bet: BetWithSides
  outcome: Outcome
  userResult: UserBetResult
  stakeMoney: number
  hadPunishmentStake: boolean
  punishmentLabel: string | null
}

export interface BetStatsTotals {
  wins: number
  losses: number
  voids: number
  moneyWon: number
  moneyLost: number
  punishmentsLost: number
}

export interface BetStatsForUser {
  completedBets: CompletedBetRow[]
  totals: BetStatsTotals
}

function userResultForBet(
  outcome: Outcome,
  userId: string,
  sides: BetSideEntry[],
  claimantId: string,
): UserBetResult {
  const result = outcome.result as OutcomeResult
  if (result === 'voided') return 'void'

  const isClaimant = claimantId === userId
  const userSide = sides.find((s) => s.user_id === userId)?.side ?? (isClaimant ? 'rider' : null)
  const isRider = userSide === 'rider' || isClaimant

  if (result === 'claimant_succeeded') return isRider ? 'won' : 'lost'
  return isRider ? 'lost' : 'won'
}

export async function getBetStatsForUser(userId: string): Promise<BetStatsForUser> {
  const { data: sideRows } = await supabase
    .from('bet_sides')
    .select('bet_id')
    .eq('user_id', userId)
  const betIdsFromSides = new Set((sideRows ?? []).map((r) => r.bet_id))

  const { data: claimantBets } = await supabase
    .from('bets')
    .select('id')
    .eq('claimant_id', userId)
    .in('status', ['completed', 'voided'])
  const betIdsFromClaimant = new Set((claimantBets ?? []).map((r) => r.id))

  const allBetIds = [...new Set([...betIdsFromSides, ...betIdsFromClaimant])]
  if (allBetIds.length === 0) {
    return {
      completedBets: [],
      totals: { wins: 0, losses: 0, voids: 0, moneyWon: 0, moneyLost: 0, punishmentsLost: 0 },
    }
  }

  const { data: betsData, error: betsError } = await supabase
    .from('bets')
    .select(BET_SELECT)
    .in('id', allBetIds)
    .in('status', ['completed', 'voided'])
    .order('created_at', { ascending: false })

  if (betsError || !betsData?.length) {
    return {
      completedBets: [],
      totals: { wins: 0, losses: 0, voids: 0, moneyWon: 0, moneyLost: 0, punishmentsLost: 0 },
    }
  }

  const bets = betsData as BetWithSides[]
  const outcomes = await Promise.all(bets.map((b) => getOutcome(b.id)))

  const completedBets: CompletedBetRow[] = []
  const totals: BetStatsTotals = {
    wins: 0,
    losses: 0,
    voids: 0,
    moneyWon: 0,
    moneyLost: 0,
    punishmentsLost: 0,
  }

  for (let i = 0; i < bets.length; i++) {
    const bet = bets[i]
    const outcome = outcomes[i]
    if (!outcome) continue

    const sides = bet.bet_sides ?? []
    const userResult = userResultForBet(outcome, userId, sides, bet.claimant_id)

    const stakeMoney = bet.stake_money ?? 0
    const hadPunishmentStake =
      bet.stake_type === 'punishment' ||
      bet.stake_type === 'both' ||
      !!bet.stake_punishment_id ||
      !!bet.stake_custom_punishment
    const punishmentLabel = bet.stake_custom_punishment ?? (hadPunishmentStake ? 'Punishment' : null)

    completedBets.push({
      bet,
      outcome,
      userResult,
      stakeMoney,
      hadPunishmentStake,
      punishmentLabel,
    })

    if (userResult === 'won') {
      totals.wins++
      totals.moneyWon += stakeMoney
    } else if (userResult === 'lost') {
      totals.losses++
      totals.moneyLost += stakeMoney
      if (hadPunishmentStake) totals.punishmentsLost++
    } else {
      totals.voids++
    }
  }

  return { completedBets, totals }
}
