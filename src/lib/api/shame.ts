import { supabase } from '@/lib/supabase'

const SHAME_BUCKET = 'shame'

async function uploadToShame(path: string, file: File): Promise<string | null> {
  const { error } = await supabase.storage.from(SHAME_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type,
  })
  if (error) return null
  const { data } = supabase.storage.from(SHAME_BUCKET).getPublicUrl(path)
  return data.publicUrl
}
import type { HallOfShameEntry, HallOfShameInsert, Json } from '@/lib/database.types'

type Reactions = Record<string, string[]>

export interface PunishmentLeaderboardEntry {
  id: string
  display_name: string
  avatar_url: string | null
  rep_score: number
  punishments_taken: number
}

export interface WeeklyShameStats {
  punishmentsThisWeek: number
  completionRate: number
  topGroupName: string | null
}

function parseReactions(raw: Json): Reactions {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as unknown as Reactions
  }
  return {}
}

export async function getShameFeed(
  groupId: string,
  limit = 20,
  offset = 0,
): Promise<HallOfShameEntry[]> {
  const { data, error } = await supabase
    .from('hall_of_shame')
    .select('*, bets!inner(group_id)')
    .eq('bets.group_id', groupId)
    .eq('is_public', true)
    .order('submitted_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error

  return (data ?? []).map(
    ({ bets: _bets, ...post }) => post as HallOfShameEntry,
  )
}

export async function postShameProof(
  data: Omit<HallOfShameInsert, 'submitted_by'>,
): Promise<HallOfShameEntry> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: post, error } = await supabase
    .from('hall_of_shame')
    .insert({
      ...data,
      submitted_by: user.id,
      reactions: data.reactions ?? {},
      is_public: data.is_public ?? true,
    })
    .select()
    .single()

  if (error || !post) throw error ?? new Error('Failed to post shame proof')
  return post
}

export interface ShameProofFiles {
  frontFile?: File
  backFile?: File
  screenshotFiles?: File[]
  caption?: string
}

/** Upload files to shame bucket and create hall_of_shame record */
export async function submitShameProof(
  betId: string,
  outcomeId: string,
  files: ShameProofFiles,
): Promise<HallOfShameEntry> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const ts = Date.now()
  const basePath = `${user.id}/${betId}/${ts}`

  const [frontUrl, backUrl, ...screenshotUrls] = await Promise.all([
    files.frontFile ? uploadToShame(`${basePath}/front.jpg`, files.frontFile) : null,
    files.backFile ? uploadToShame(`${basePath}/back.jpg`, files.backFile) : null,
    ...(files.screenshotFiles ?? []).map((f, i) =>
      uploadToShame(`${basePath}/screenshot_${i}.jpg`, f),
    ),
  ])

  return postShameProof({
    bet_id: betId,
    outcome_id: outcomeId,
    front_url: frontUrl ?? null,
    back_url: backUrl ?? null,
    screenshot_urls:
      screenshotUrls.filter((u): u is string => u !== null).length > 0
        ? screenshotUrls.filter((u): u is string => u !== null)
        : null,
    caption: files.caption ?? null,
    is_public: true,
  })
}

/**
 * Toggle a reaction: if user already reacted with that emoji, remove them;
 * otherwise add them. Reactions stored as { "😭": ["uid1", "uid2"], ... }
 */
export async function addReaction(
  shameId: string,
  emoji: string,
  userId: string,
): Promise<Reactions> {
  const { data: current, error: fetchError } = await supabase
    .from('hall_of_shame')
    .select('reactions')
    .eq('id', shameId)
    .single()

  if (fetchError) throw fetchError

  const reactions = parseReactions(current?.reactions ?? {})
  const users = reactions[emoji] ?? []
  const idx = users.indexOf(userId)

  if (idx >= 0) {
    users.splice(idx, 1)
    if (users.length === 0) {
      delete reactions[emoji]
    } else {
      reactions[emoji] = users
    }
  } else {
    reactions[emoji] = [...users, userId]
  }

  const { error: updateError } = await supabase
    .from('hall_of_shame')
    .update({ reactions: reactions as unknown as Json })
    .eq('id', shameId)

  if (updateError) throw updateError

  return reactions
}

/** Punishment leaderboard: group members sorted by most punishments taken */
export async function getPunishmentLeaderboard(
  groupId: string,
  limit = 10,
): Promise<PunishmentLeaderboardEntry[]> {
  const { data: members } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId)

  const userIds = (members ?? []).map((m) => m.user_id)
  if (userIds.length === 0) return []

  const { data } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, rep_score, punishments_taken')
    .in('id', userIds)
    .order('punishments_taken', { ascending: false })
    .limit(limit)

  return (data ?? []).map((p) => ({
    id: p.id,
    display_name: p.display_name,
    avatar_url: p.avatar_url,
    rep_score: p.rep_score ?? 100,
    punishments_taken: p.punishments_taken ?? 0,
  }))
}

/** Weekly stats for the shame ticker */
export async function getWeeklyShameStats(
  groupId: string,
): Promise<WeeklyShameStats> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: shamePosts } = await supabase
    .from('hall_of_shame')
    .select('id, submitted_at, bets!inner(group_id)')
    .eq('bets.group_id', groupId)
    .gte('submitted_at', weekAgo)

  const punishmentsThisWeek = (shamePosts ?? []).length

  const { data: members } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId)

  const userIds = (members ?? []).map((m) => m.user_id)
  let completionRate = 0
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('punishments_taken, punishments_completed')
      .in('id', userIds)
    const totalTaken = (profiles ?? []).reduce((s, p) => s + (p.punishments_taken ?? 0), 0)
    const totalCompleted = (profiles ?? []).reduce((s, p) => s + (p.punishments_completed ?? 0), 0)
    completionRate = totalTaken > 0 ? Math.round((totalCompleted / totalTaken) * 100) : 0
  }

  const { data: group } = await supabase
    .from('groups')
    .select('name')
    .eq('id', groupId)
    .single()

  return {
    punishmentsThisWeek,
    completionRate,
    topGroupName: group?.name ?? null,
  }
}
