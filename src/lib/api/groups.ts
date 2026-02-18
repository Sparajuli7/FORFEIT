import { supabase } from '@/lib/supabase'
import type { Group, GroupMember } from '@/lib/database.types'

async function getCurrentUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

function generateInviteCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

export async function getUserGroups(): Promise<Group[]> {
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from('group_members')
    .select('groups(*)')
    .eq('user_id', userId)

  if (error) throw error

  return (data ?? [])
    .map((row) => row.groups)
    .filter((g): g is Group => g !== null)
}

export async function createGroup(name: string, emoji: string): Promise<Group> {
  const userId = await getCurrentUserId()

  const { data: group, error: groupError } = await supabase
    .from('groups')
    .insert({
      name,
      avatar_emoji: emoji,
      created_by: userId,
      invite_code: generateInviteCode(),
    })
    .select()
    .single()

  if (groupError || !group) throw groupError ?? new Error('Failed to create group')

  const { error: memberError } = await supabase.from('group_members').insert({
    group_id: group.id,
    user_id: userId,
    role: 'admin',
  })
  if (memberError) throw memberError

  return group
}

export async function getGroupByInviteCode(code: string): Promise<Group | null> {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('invite_code', code.toUpperCase())
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function joinGroup(groupId: string): Promise<void> {
  const userId = await getCurrentUserId()

  const { data: existing } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .single()

  if (existing) throw new Error('You are already in this group.')

  const { error } = await supabase.from('group_members').insert({
    group_id: groupId,
    user_id: userId,
    role: 'member',
  })
  if (error) throw error
}

export async function getGroupMembers(groupId: string): Promise<GroupMember[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select('*')
    .eq('group_id', groupId)
    .order('joined_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function leaveGroup(groupId: string): Promise<void> {
  const userId = await getCurrentUserId()

  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId)

  if (error) throw error
}
