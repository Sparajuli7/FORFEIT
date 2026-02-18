import { supabase } from '@/lib/supabase'
import type { Bet, BetInsert, CompetitionScore, Profile, StakeType } from '@/lib/database.types'

export interface CompetitionData {
  title: string
  description?: string
  groupId: string
  deadline: string
  metric: string
  stakeType: StakeType
  stakeMoney?: number
  stakePunishmentId?: string
}

export interface LeaderboardEntry {
  score: CompetitionScore
  profile: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url' | 'rep_score'>
  rank: number
}

export async function createCompetition(data: CompetitionData): Promise<Bet> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const insert: BetInsert = {
    group_id: data.groupId,
    claimant_id: user.id,
    title: data.title.trim().slice(0, 140),
    description: data.description,
    category: 'fitness',
    bet_type: 'competition',
    deadline: data.deadline,
    stake_type: data.stakeType,
    stake_money: data.stakeMoney ?? null,
    stake_punishment_id: data.stakePunishmentId ?? null,
    comp_metric: data.metric,
    status: 'active',
  }

  const { data: competition, error } = await supabase
    .from('bets')
    .insert(insert)
    .select()
    .single()

  if (error || !competition) throw error ?? new Error('Failed to create competition')

  await Promise.all([
    supabase.from('bet_sides').insert({
      bet_id: competition.id,
      user_id: user.id,
      side: 'rider',
    }),
    supabase.from('competition_scores').insert({
      bet_id: competition.id,
      user_id: user.id,
      score: 0,
    }),
  ])

  return competition
}

export async function getCompetitionDetail(betId: string): Promise<Bet> {
  const { data, error } = await supabase
    .from('bets')
    .select('*')
    .eq('id', betId)
    .eq('bet_type', 'competition')
    .single()

  if (error) throw error
  return data
}

export async function submitScore(
  betId: string,
  score: number,
  proofUrl?: string,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('competition_scores')
    .upsert(
      {
        bet_id: betId,
        user_id: user.id,
        score,
        proof_url: proofUrl ?? null,
      },
      { onConflict: 'bet_id,user_id' },
    )

  if (error) throw error
}

export async function getLeaderboard(betId: string): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('competition_scores')
    .select('*, profiles(id, username, display_name, avatar_url, rep_score)')
    .eq('bet_id', betId)
    .order('score', { ascending: false })

  if (error) throw error

  return (data ?? []).map((row, index) => ({
    score: {
      id: row.id,
      bet_id: row.bet_id,
      user_id: row.user_id,
      score: row.score,
      proof_url: row.proof_url,
      updated_at: row.updated_at,
    },
    profile: row.profiles as LeaderboardEntry['profile'],
    rank: index + 1,
  }))
}
