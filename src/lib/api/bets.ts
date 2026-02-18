import { supabase } from '@/lib/supabase'
import type { Bet, BetSideEntry, BetInsert, BetSide, BetCategory, BetType, BetStatus } from '@/lib/database.types'

export type BetWithSides = Bet & { bet_sides: BetSideEntry[] }

export interface BetFilters {
  category?: BetCategory
  type?: BetType
  status?: BetStatus
}

const BET_SELECT = '*, bet_sides(*)' as const

export async function getGroupBets(
  groupId: string,
  filters?: BetFilters,
): Promise<BetWithSides[]> {
  let query = supabase
    .from('bets')
    .select(BET_SELECT)
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })

  if (filters?.category) query = query.eq('category', filters.category)
  if (filters?.type) query = query.eq('bet_type', filters.type)
  if (filters?.status) query = query.eq('status', filters.status)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as BetWithSides[]
}

export async function getBetDetail(betId: string): Promise<BetWithSides> {
  const { data, error } = await supabase
    .from('bets')
    .select(BET_SELECT)
    .eq('id', betId)
    .single()

  if (error) throw error
  return data as BetWithSides
}

export async function createBet(
  data: Omit<BetInsert, 'claimant_id' | 'status'>,
): Promise<Bet> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: bet, error } = await supabase
    .from('bets')
    .insert({ ...data, claimant_id: user.id, status: 'active' })
    .select()
    .single()

  if (error || !bet) throw error ?? new Error('Failed to create bet')

  await supabase.from('bet_sides').insert({
    bet_id: bet.id,
    user_id: user.id,
    side: 'rider' as BetSide,
  })

  return bet
}

export async function joinBetSide(betId: string, side: BetSide): Promise<BetSideEntry> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: existing } = await supabase
    .from('bet_sides')
    .select('id')
    .eq('bet_id', betId)
    .eq('user_id', user.id)
    .single()

  if (existing) throw new Error('You have already joined this bet.')

  const { data: entry, error } = await supabase
    .from('bet_sides')
    .insert({ bet_id: betId, user_id: user.id, side })
    .select()
    .single()

  if (error || !entry) throw error ?? new Error('Failed to join bet')
  return entry
}

export async function getBetParticipants(betId: string): Promise<BetSideEntry[]> {
  const { data, error } = await supabase
    .from('bet_sides')
    .select('*')
    .eq('bet_id', betId)
    .order('joined_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function getMyBets(userId: string): Promise<BetWithSides[]> {
  const { data: sideEntries, error: sidesError } = await supabase
    .from('bet_sides')
    .select('bet_id')
    .eq('user_id', userId)

  if (sidesError) throw sidesError

  const betIds = (sideEntries ?? []).map((s) => s.bet_id)
  if (betIds.length === 0) return []

  const { data, error } = await supabase
    .from('bets')
    .select(BET_SELECT)
    .in('id', betIds)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as BetWithSides[]
}
