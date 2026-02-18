import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Group, GroupMember, GroupInsert } from '@/lib/database.types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GroupState {
  groups: Group[]
  activeGroup: Group | null
  members: GroupMember[]
  isLoading: boolean
  error: string | null
}

interface GroupActions {
  /** Fetch all groups the current user belongs to */
  fetchGroups: () => Promise<void>
  createGroup: (name: string, emoji: string) => Promise<Group | null>
  joinGroupByCode: (code: string) => Promise<Group | null>
  fetchMembers: (groupId: string) => Promise<void>
  setActiveGroup: (group: Group | null) => void
  leaveGroup: (groupId: string) => Promise<void>
  clearError: () => void
}

export type GroupStore = GroupState & GroupActions

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a random 6-char alphanumeric invite code */
function generateInviteCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

async function getCurrentUserId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const useGroupStore = create<GroupStore>()((set, get) => ({
  // ---- state ----
  groups: [],
  activeGroup: null,
  members: [],
  isLoading: false,
  error: null,

  // ---- actions ----

  fetchGroups: async () => {
    const userId = await getCurrentUserId()
    if (!userId) return

    set({ isLoading: true, error: null })

    // Join through group_members to only return groups user belongs to
    const { data, error } = await supabase
      .from('group_members')
      .select('groups(*)')
      .eq('user_id', userId)

    if (error) {
      set({ error: error.message, isLoading: false })
      return
    }

    // Unwrap the nested join result
    const groups = (data ?? [])
      .map((row) => row.groups)
      .filter((g): g is Group => g !== null)

    set({ groups, isLoading: false })
  },

  createGroup: async (name, emoji) => {
    const userId = await getCurrentUserId()
    if (!userId) return null

    set({ isLoading: true, error: null })

    const insert: GroupInsert = {
      name,
      avatar_emoji: emoji,
      created_by: userId,
      invite_code: generateInviteCode(),
    }

    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert(insert)
      .select()
      .single()

    if (groupError || !group) {
      set({ error: groupError?.message ?? 'Failed to create group', isLoading: false })
      return null
    }

    // Add creator as admin member
    const { error: memberError } = await supabase.from('group_members').insert({
      group_id: group.id,
      user_id: userId,
      role: 'admin',
    })

    if (memberError) {
      set({ error: memberError.message, isLoading: false })
      return null
    }

    set((state) => ({
      groups: [group, ...state.groups],
      activeGroup: group,
      isLoading: false,
    }))

    return group
  },

  joinGroupByCode: async (code) => {
    const userId = await getCurrentUserId()
    if (!userId) return null

    set({ isLoading: true, error: null })

    // Find group by invite code
    const { data: group, error: findError } = await supabase
      .from('groups')
      .select('*')
      .eq('invite_code', code.toUpperCase())
      .single()

    if (findError || !group) {
      set({ error: 'No group found with that code.', isLoading: false })
      return null
    }

    // Check not already a member
    const { data: existing } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('group_id', group.id)
      .eq('user_id', userId)
      .single()

    if (existing) {
      set({ error: 'You are already in this group.', isLoading: false })
      return null
    }

    const { error: joinError } = await supabase.from('group_members').insert({
      group_id: group.id,
      user_id: userId,
      role: 'member',
    })

    if (joinError) {
      set({ error: joinError.message, isLoading: false })
      return null
    }

    set((state) => ({
      groups: [...state.groups, group],
      isLoading: false,
    }))

    return group
  },

  fetchMembers: async (groupId) => {
    set({ isLoading: true, error: null })

    const { data, error } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', groupId)
      .order('joined_at', { ascending: true })

    if (error) {
      set({ error: error.message, isLoading: false })
      return
    }

    set({ members: data ?? [], isLoading: false })
  },

  setActiveGroup: (group) => set({ activeGroup: group }),

  leaveGroup: async (groupId) => {
    const userId = await getCurrentUserId()
    if (!userId) return

    set({ isLoading: true, error: null })

    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId)

    if (error) {
      set({ error: error.message, isLoading: false })
      return
    }

    set((state) => ({
      groups: state.groups.filter((g) => g.id !== groupId),
      activeGroup: state.activeGroup?.id === groupId ? null : state.activeGroup,
      members: state.members.filter((m) => m.group_id !== groupId),
      isLoading: false,
    }))
  },

  clearError: () => set({ error: null }),
}))

export default useGroupStore
