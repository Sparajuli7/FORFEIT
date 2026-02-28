import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Theme = 'dark' | 'light'

interface UiState {
  theme: Theme
  /** ID of the currently open modal (null = closed) */
  activeModal: string | null
  /** ID of the currently open bottom sheet (null = closed) */
  activeBottomSheet: string | null
}

interface UiActions {
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
  openModal: (id: string) => void
  closeModal: () => void
  openSheet: (id: string) => void
  closeSheet: () => void
}

export type UiStore = UiState & UiActions

// ---------------------------------------------------------------------------
// DOM helper — applies the theme class to the document root
// Runs outside React so it works on initial hydration too.
// ---------------------------------------------------------------------------

function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return
  if (theme === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const useUiStore = create<UiStore>()(
  persist(
    (set, get) => ({
      // ---- state ----
      theme: 'dark',           // LYNK defaults to dark
      activeModal: null,
      activeBottomSheet: null,

      // ---- actions ----

      toggleTheme: () => {
        const next: Theme = get().theme === 'dark' ? 'light' : 'dark'
        applyTheme(next)
        set({ theme: next })
      },

      setTheme: (theme) => {
        applyTheme(theme)
        set({ theme })
      },

      openModal: (id) => set({ activeModal: id }),
      closeModal: () => set({ activeModal: null }),

      openSheet: (id) => set({ activeBottomSheet: id }),
      closeSheet: () => set({ activeBottomSheet: null }),
    }),
    {
      name: 'lynk-ui',
      // Only persist the theme — modal/sheet state should reset on page load
      partialize: (state) => ({ theme: state.theme }),
      // Re-apply the theme class after localStorage is read on startup
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme)
      },
    },
  ),
)

export default useUiStore

// ---------------------------------------------------------------------------
// Modal / sheet ID constants — import these instead of using magic strings
// ---------------------------------------------------------------------------

export const MODALS = {
  BET_DETAIL: 'bet-detail',
  CREATE_GROUP: 'create-group',
  JOIN_GROUP: 'join-group',
  DISPUTE_PROOF: 'dispute-proof',
  PROFILE_EDIT: 'profile-edit',
} as const

export const SHEETS = {
  BET_CREATION: 'bet-creation',
  PROOF_UPLOAD: 'proof-upload',
  PUNISHMENT_PICKER: 'punishment-picker',
  NOTIFICATION_DRAWER: 'notification-drawer',
  FILTER_DRAWER: 'filter-drawer',
} as const
