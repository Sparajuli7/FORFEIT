import { supabase } from '@/lib/supabase'
import type {
  Outcome,
  Bet,
  Proof,
  ProofVote,
} from '@/lib/database.types'

export async function getOutcome(betId: string): Promise<Outcome | null> {
  const { data, error } = await supabase
    .from('outcomes')
    .select('*')
    .eq('bet_id', betId)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data
}

export interface BetOutcomeDetails {
  outcome: Outcome
  bet: Bet
  betSides: { user_id: string; side: 'rider' | 'doubter' }[]
  proofs: Proof[]
  votes: ProofVote[]
  punishmentText: string | null
}

export async function getBetOutcomeWithDetails(
  betId: string,
): Promise<BetOutcomeDetails | null> {
  const outcome = await getOutcome(betId)
  if (!outcome) return null

  const [betResult, sidesResult, proofsResult, votesResult] =
    await Promise.all([
      supabase.from('bets').select('*').eq('id', betId).single(),
      supabase.from('bet_sides').select('*').eq('bet_id', betId),
      supabase
        .from('proofs')
        .select('*')
        .eq('bet_id', betId)
        .order('submitted_at', { ascending: false }),
      supabase
        .from('proof_votes')
        .select('*, proofs!inner(bet_id)')
        .eq('proofs.bet_id', betId),
      supabase
        .from('bets')
        .select('stake_punishment_id, stake_custom_punishment')
        .eq('id', betId)
        .single(),
    ])

  if (betResult.error) throw betResult.error

  let punishmentText: string | null =
    betResult.data?.stake_custom_punishment ?? null
  if (!punishmentText && betResult.data?.stake_punishment_id) {
    const { data: card } = await supabase
      .from('punishment_cards')
      .select('text')
      .eq('id', betResult.data.stake_punishment_id)
      .single()
    punishmentText = card?.text ?? null
  }

  return {
    outcome,
    bet: betResult.data,
    betSides: sidesResult.data ?? [],
    proofs: proofsResult.data ?? [],
    votes: (votesResult.data ?? []).map(
      ({ proofs: _proofs, ...vote }) => vote as ProofVote,
    ),
    punishmentText,
  }
}
