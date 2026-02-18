import { supabase } from '@/lib/supabase'
import type { Bet, BetWithSides, BetInsert, BetSide } from '@/lib/database.types'

const BET_SELECT = '*, bet_sides(*)' as const

async function getCurrentUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

/** Fetch all H2H bets for the current user's groups */
export async function getH2HBetsForUser(): Promise<BetWithSides[]> {
  const userId = await getCurrentUserId()

  // Get user's group IDs
  const { data: memberships, error: memError } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId)

  if (memError) throw memError
  const groupIds = (memberships ?? []).map((m) => m.group_id)
  if (groupIds.length === 0) return []

  const { data, error } = await supabase
    .from('bets')
    .select(BET_SELECT)
    .eq('bet_type', 'h2h')
    .in('group_id', groupIds)
    .in('status', ['pending', 'active', 'proof_submitted', 'disputed', 'completed'])
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as BetWithSides[]
}

/** Create an H2H challenge. Bet starts as pending until opponent accepts. */
export async function createH2HBet(data: {
  group_id: string
  title: string
  category: BetInsert['category']
  deadline: string
  stake_type: BetInsert['stake_type']
  stake_money?: number | null
  stake_punishment_id?: string | null
  stake_custom_punishment?: string | null
  h2h_opponent_id: string
}): Promise<Bet> {
  const userId = await getCurrentUserId()

  const insert: BetInsert = {
    ...data,
    claimant_id: userId,
    bet_type: 'h2h',
    status: 'pending',
    h2h_opponent_id: data.h2h_opponent_id,
  }

  const { data: bet, error } = await supabase
    .from('bets')
    .insert(insert)
    .select()
    .single()

  if (error || !bet) throw error ?? new Error('Failed to create H2H challenge')

  // Claimant joins as rider
  await supabase.from('bet_sides').insert({
    bet_id: bet.id,
    user_id: userId,
    side: 'rider' as BetSide,
  })

  // Notification is created by DB trigger (notify_h2h_challenge)

  return bet
}

/** Accept an H2H challenge. Opponent joins as doubter, bet becomes active. */
export async function acceptH2HChallenge(betId: string): Promise<void> {
  const userId = await getCurrentUserId()

  const { data: bet, error: fetchError } = await supabase
    .from('bets')
    .select('id, h2h_opponent_id, status')
    .eq('id', betId)
    .single()

  if (fetchError || !bet) throw fetchError ?? new Error('Bet not found')
  if (bet.h2h_opponent_id !== userId) throw new Error('You are not the challenged user')
  if (bet.status !== 'pending') throw new Error('This challenge is no longer pending')

  const { error: joinError } = await supabase.from('bet_sides').insert({
    bet_id: betId,
    user_id: userId,
    side: 'doubter' as BetSide,
  })

  if (joinError) throw joinError

  // check_bet_activation trigger will set status to 'active' when 2 participants
}

/** Decline an H2H challenge. Bet status → voided. */
export async function declineH2HChallenge(betId: string): Promise<void> {
  const userId = await getCurrentUserId()

  const { data: bet, error: fetchError } = await supabase
    .from('bets')
    .select('id, h2h_opponent_id, status')
    .eq('id', betId)
    .single()

  if (fetchError || !bet) throw fetchError ?? new Error('Bet not found')
  if (bet.h2h_opponent_id !== userId) throw new Error('You are not the challenged user')
  if (bet.status !== 'pending') throw new Error('This challenge is no longer pending')

  const { error: updateError } = await supabase
    .from('bets')
    .update({ status: 'voided' })
    .eq('id', betId)

  if (updateError) throw updateError
}
