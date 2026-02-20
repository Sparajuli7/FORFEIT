import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import type { Profile, ProfileUpdate } from '@/lib/database.types'

// Track the auth listener so we can unsubscribe before re-subscribing
let _authSubscription: { unsubscribe: () => void } | null = null

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuthState {
  user: User | null
  profile: Profile | null
  isLoading: boolean
  isAuthenticated: boolean
  /** True when user has signed in but has no profile row yet */
  isNewUser: boolean
  error: string | null
}

interface AuthActions {
  /** Check current session and subscribe to auth state changes. Call once on app mount. */
  initialize: () => Promise<void>
  /** Create a new account with email + password */
  signUp: (email: string, password: string) => Promise<void>
  /** Sign in with email + password */
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  /** Create a new profile row (for first-time users). Use updateProfile for existing profiles. Returns true on success. */
  createProfile: (data: { username: string; display_name: string; avatar_url?: string }) => Promise<boolean>
  updateProfile: (data: ProfileUpdate) => Promise<void>
  /** Directly set profile in store (used after profile creation) */
  setProfile: (profile: Profile | null) => void
  clearError: () => void
}

export type AuthStore = AuthState & AuthActions

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function loadProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return data ?? null
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const useAuthStore = create<AuthStore>()((set, get) => ({
  // ---- state ----
  user: null,
  profile: null,
  isLoading: true,
  isAuthenticated: false,
  isNewUser: false,
  error: null,

  // ---- actions ----

  initialize: async () => {
    set({ isLoading: true, error: null })

    // Hydrate from existing session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError) {
      set({ error: sessionError.message, isLoading: false })
      return
    }

    if (session?.user) {
      const profile = await loadProfile(session.user.id)
      set({
        user: session.user,
        profile,
        isAuthenticated: true,
        isNewUser: !profile,
        isLoading: false,
      })
    } else {
      set({ isLoading: false })
    }

    // Unsubscribe previous listener if initialize is called again
    _authSubscription?.unsubscribe()

    // Keep store in sync across tabs and token refreshes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Avoid redundant DB round-trips if user object is unchanged
        if (get().user?.id === session.user.id && get().profile) return

        const profile = await loadProfile(session.user.id)
        set({
          user: session.user,
          profile,
          isAuthenticated: true,
          isNewUser: !profile,
          isLoading: false,
          error: null,
        })
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        set({ user: session.user })
      } else if (event === 'SIGNED_OUT') {
        set({
          user: null,
          profile: null,
          isAuthenticated: false,
          isNewUser: false,
          isLoading: false,
          error: null,
        })
      }
    })
    _authSubscription = subscription
  },

  signUp: async (email, password) => {
    set({ isLoading: true, error: null })
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      set({ error: error.message, isLoading: false })
    } else {
      set({ isLoading: false })
    }
    // On success, onAuthStateChange fires SIGNED_IN and updates the store
  },

  signIn: async (email, password) => {
    set({ isLoading: true, error: null })
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      set({ error: error.message, isLoading: false })
    } else {
      set({ isLoading: false })
    }
    // On success, onAuthStateChange fires SIGNED_IN and updates the store
  },

  signOut: async () => {
    set({ isLoading: true, error: null })
    const { error } = await supabase.auth.signOut()
    if (error) {
      set({ error: error.message, isLoading: false })
    }
    // onAuthStateChange fires SIGNED_OUT and clears the store
  },

  createProfile: async (data) => {
    const { user } = get()
    if (!user) return false

    set({ isLoading: true, error: null })
    const { data: profile, error } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        username: data.username.toLowerCase(),
        display_name: data.display_name.trim(),
        avatar_url: data.avatar_url ?? null,
      })
      .select()
      .single()

    if (error) {
      set({ error: error.message, isLoading: false })
      return false
    }
    set({ profile, isNewUser: false, isLoading: false })
    return true
  },

  updateProfile: async (data) => {
    const { user } = get()
    if (!user) return

    set({ isLoading: true, error: null })
    const { data: updated, error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      set({ error: error.message, isLoading: false })
    } else {
      set({ profile: updated, isLoading: false })
    }
  },

  setProfile: (profile) => set({ profile, isNewUser: false }),

  clearError: () => set({ error: null }),
}))

export default useAuthStore
