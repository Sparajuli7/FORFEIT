import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import type { Profile, ProfileUpdate } from '@/lib/database.types'

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
  /** Send OTP SMS to phone number (E.164 format, e.g. +14155552671) */
  signInWithPhone: (phone: string) => Promise<void>
  /** Verify the 6-digit OTP received via SMS */
  verifyOtp: (phone: string, token: string) => Promise<void>
  signOut: () => Promise<void>
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

    // Keep store in sync across tabs and token refreshes
    supabase.auth.onAuthStateChange(async (event, session) => {
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
  },

  signInWithPhone: async (phone) => {
    set({ isLoading: true, error: null })
    const { error } = await supabase.auth.signInWithOtp({ phone })
    // OTP sent — isLoading stays false, UI should show OTP input
    if (error) {
      set({ error: error.message, isLoading: false })
    } else {
      set({ isLoading: false })
    }
  },

  verifyOtp: async (phone, token) => {
    set({ isLoading: true, error: null })
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    })
    if (error) {
      set({ error: error.message, isLoading: false })
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
