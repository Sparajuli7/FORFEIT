import { supabase } from '@/lib/supabase'
import type {
  PunishmentCard,
  PunishmentCardInsert,
  PunishmentCategory,
  PunishmentDifficulty,
} from '@/lib/database.types'

export async function getApprovedPunishments(
  category?: PunishmentCategory,
  difficulty?: PunishmentDifficulty,
): Promise<PunishmentCard[]> {
  let query = supabase
    .from('punishment_cards')
    .select('*')
    .eq('is_approved', true)
    .order('times_assigned', { ascending: false })

  if (category) query = query.eq('category', category)
  if (difficulty) query = query.eq('difficulty', difficulty)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function createPunishment(
  data: Omit<PunishmentCardInsert, 'is_approved' | 'is_community' | 'submitted_by'> & {
    is_community?: boolean
  },
): Promise<PunishmentCard> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const isCommunity = data.is_community ?? true
  const isApproved = !isCommunity // Private = approved for creator only; Community = needs approval
  const { data: card, error } = await supabase
    .from('punishment_cards')
    .insert({
      ...data,
      submitted_by: user.id,
      is_community: isCommunity,
      is_approved: isApproved,
    })
    .select()
    .single()

  if (error || !card) throw error ?? new Error('Failed to create punishment')
  return card
}

export interface PunishmentStats {
  timesAssigned: number
  timesCompleted: number
  timesDisputed: number
  completionRate: number
}

export async function getPunishmentStats(
  punishmentId: string,
): Promise<PunishmentStats> {
  const { data, error } = await supabase
    .from('punishment_cards')
    .select('times_assigned, times_completed, times_disputed')
    .eq('id', punishmentId)
    .single()

  if (error) throw error

  const assigned = data.times_assigned
  return {
    timesAssigned: assigned,
    timesCompleted: data.times_completed,
    timesDisputed: data.times_disputed,
    completionRate: assigned > 0 ? Math.round((data.times_completed / assigned) * 100) : 0,
  }
}
