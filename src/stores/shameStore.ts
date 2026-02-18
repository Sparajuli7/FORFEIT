import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { supabase } from '@/lib/supabase'
import type { HallOfShameEntry, HallOfShameInsert } from '@/lib/database.types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Group-level stats shown at the bottom of the Hall of Shame feed */
export interface GroupShameStats {
  totalIssued: number
  totalConfirmed: number
  confirmedPct: number
  disputedPct: number
  pendingPct: number
}

/** Data required to submit a new shame post */
export interface PostShameData {
  betId: string
  outcomeId: string
  frontUrl?: string
  backUrl?: string
  screenshotUrls?: string[]
  caption?: string
  isPublic?: boolean
}

interface ShameState {
  shamePosts: HallOfShameEntry[]
  groupStats: GroupShameStats | null
  isLoading: boolean
  error: string | null
}

interface ShameActions {
  fetchShameFeed: (groupId: string) => Promise<void>
  postShameProof: (data: PostShameData) => Promise<HallOfShameEntry | null>
  reactToPost: (postId: string, emoji: string) => Promise<void>
  fetchGroupStats: (groupId: string) => Promise<void>
  clearError: () => void
}

export type ShameStore = ShameState & ShameActions

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getCurrentUserId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

function safeReactions(raw: unknown): Record<string, number> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, number>
  }
  return {}
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const useShameStore = create<ShameStore>()(
  immer((set, get) => ({
    // ---- state ----
    shamePosts: [],
    groupStats: null,
    isLoading: false,
    error: null,

    // ---- actions ----

    fetchShameFeed: async (groupId) => {
      set((draft) => {
        draft.isLoading = true
        draft.error = null
      })

      // Join through outcomes → bets to filter by group
      const { data, error } = await supabase
        .from('hall_of_shame')
        .select(
          `
          *,
          bets!inner(group_id)
        `,
        )
        .eq('bets.group_id', groupId)
        .eq('is_public', true)
        .order('submitted_at', { ascending: false })

      set((draft) => {
        if (error) {
          draft.error = error.message
        } else {
          // Strip the joined bets field — we only needed it for filtering
          draft.shamePosts = (data ?? []).map(({ bets: _bets, ...post }) => post as HallOfShameEntry)
        }
        draft.isLoading = false
      })
    },

    postShameProof: async (data) => {
      const userId = await getCurrentUserId()
      if (!userId) return null

      set((draft) => {
        draft.isLoading = true
        draft.error = null
      })

      const insert: HallOfShameInsert = {
        bet_id: data.betId,
        outcome_id: data.outcomeId,
        submitted_by: userId,
        front_url: data.frontUrl ?? null,
        back_url: data.backUrl ?? null,
        screenshot_urls: data.screenshotUrls ?? null,
        caption: data.caption ?? null,
        reactions: {},
        is_public: data.isPublic ?? true,
      }

      const { data: post, error } = await supabase
        .from('hall_of_shame')
        .insert(insert)
        .select()
        .single()

      set((draft) => {
        if (error) {
          draft.error = error?.message ?? 'Failed to post shame proof.'
        } else if (post) {
          draft.shamePosts.unshift(post)
        }
        draft.isLoading = false
      })

      return error ? null : post ?? null
    },

    reactToPost: async (postId, emoji) => {
      const userId = await getCurrentUserId()
      if (!userId) return

      // Optimistic update first
      set((draft) => {
        const post = draft.shamePosts.find((p) => p.id === postId)
        if (!post) return
        const reactions = safeReactions(post.reactions)
        reactions[emoji] = (reactions[emoji] ?? 0) + 1
        post.reactions = reactions
      })

      // Fetch current server value to avoid clobbering concurrent reactions
      const { data: current } = await supabase
        .from('hall_of_shame')
        .select('reactions')
        .eq('id', postId)
        .single()

      const serverReactions = safeReactions(current?.reactions)
      serverReactions[emoji] = (serverReactions[emoji] ?? 0) + 1

      const { error } = await supabase
        .from('hall_of_shame')
        .update({ reactions: serverReactions })
        .eq('id', postId)

      if (error) {
        // Rollback optimistic update
        set((draft) => {
          const post = draft.shamePosts.find((p) => p.id === postId)
          if (!post) return
          const reactions = safeReactions(post.reactions)
          reactions[emoji] = Math.max(0, (reactions[emoji] ?? 1) - 1)
          post.reactions = reactions
          draft.error = error.message
        })
      } else {
        // Sync with confirmed server value
        set((draft) => {
          const post = draft.shamePosts.find((p) => p.id === postId)
          if (post) post.reactions = serverReactions
        })
      }
    },

    fetchGroupStats: async (groupId) => {
      // Pull all outcomes for bets in this group
      const { data, error } = await supabase
        .from('outcomes')
        .select(`
          result,
          bets!inner(group_id)
        `)
        .eq('bets.group_id', groupId)

      if (error || !data) return

      const totalIssued = data.length
      const confirmed = data.filter((o) => o.result === 'claimant_failed').length
      const voided = data.filter((o) => o.result === 'voided').length
      const pending = totalIssued - confirmed - voided

      set((draft) => {
        draft.groupStats = {
          totalIssued,
          totalConfirmed: confirmed,
          confirmedPct: totalIssued > 0 ? Math.round((confirmed / totalIssued) * 100) : 0,
          disputedPct: totalIssued > 0 ? Math.round((voided / totalIssued) * 100) : 0,
          pendingPct: totalIssued > 0 ? Math.round((pending / totalIssued) * 100) : 0,
        }
      })
    },

    clearError: () =>
      set((draft) => {
        draft.error = null
      }),
  })),
)

export default useShameStore
