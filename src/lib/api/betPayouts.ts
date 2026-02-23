import type { OutcomeResult } from '@/lib/database.types'

export interface UserPayout {
  userId: string
  /** Amount in cents. For winners: what they receive. For losers: what they owe. */
  amount: number
}

export interface BetPayouts {
  winnerIds: string[]
  loserIds: string[]
  /** How much each winner receives (cents). Empty array when no money stake. */
  winnerPayouts: UserPayout[]
  /** How much each loser owes (cents). Empty array when no money stake. */
  loserPayouts: UserPayout[]
  /** Loser user ids who must complete the punishment. */
  punishmentOwers: string[]
}

/**
 * Compute money payouts and punishment assignments for a resolved bet.
 *
 * stake_money is the total pot in cents.
 * Winners split the pot equally; each loser's share = pot / numLosers.
 * claimant is always treated as a rider.
 */
export function computeBetPayouts(
  result: OutcomeResult,
  claimantId: string,
  betSides: { user_id: string; side: 'rider' | 'doubter' }[],
  stakeMoney: number | null,
  stakeType: string | null,
  stakeCustomPunishment: string | null,
  stakePunishmentId: string | null,
): BetPayouts {
  if (result === 'voided') {
    return { winnerIds: [], loserIds: [], winnerPayouts: [], loserPayouts: [], punishmentOwers: [] }
  }

  // Claimant is always on the rider side
  const riderIds = [
    claimantId,
    ...betSides.filter((s) => s.side === 'rider').map((s) => s.user_id),
  ].filter((id, idx, arr) => arr.indexOf(id) === idx) // deduplicate

  const doubterIds = betSides
    .filter((s) => s.side === 'doubter')
    .map((s) => s.user_id)

  const winnerIds = result === 'claimant_succeeded' ? riderIds : doubterIds
  const loserIds = result === 'claimant_succeeded' ? doubterIds : riderIds

  const hasMoney = !!stakeMoney && stakeMoney > 0
  const hasPunishment =
    stakeType === 'punishment' ||
    stakeType === 'both' ||
    !!stakePunishmentId ||
    !!stakeCustomPunishment

  const totalPot = hasMoney ? stakeMoney! : 0

  const winnerPayouts: UserPayout[] = hasMoney
    ? winnerIds.map((userId) => ({
        userId,
        amount: winnerIds.length > 0 ? Math.round(totalPot / winnerIds.length) : 0,
      }))
    : []

  const loserPayouts: UserPayout[] = hasMoney
    ? loserIds.map((userId) => ({
        userId,
        amount: loserIds.length > 0 ? Math.round(totalPot / loserIds.length) : 0,
      }))
    : []

  return {
    winnerIds,
    loserIds,
    winnerPayouts,
    loserPayouts,
    punishmentOwers: hasPunishment ? loserIds : [],
  }
}
