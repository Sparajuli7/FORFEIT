import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { PushSubscriptionInsert } from '@/lib/database.types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PushState {
  permission: NotificationPermission
  isSubscribed: boolean
  isLoading: boolean
  error: string | null
}

interface PushActions {
  /** Check current permission and subscription state */
  initialize: () => Promise<void>
  /** Request notification permission from the browser */
  requestPermission: () => Promise<NotificationPermission>
  /** Subscribe to Web Push and save subscription to database */
  subscribe: () => Promise<boolean>
  /** Unsubscribe from Web Push and remove from database */
  unsubscribe: () => Promise<void>
  clearError: () => void
}

export type PushStore = PushState & PushActions

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  return navigator.serviceWorker.ready
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const usePushStore = create<PushStore>()((set, get) => ({
  permission: typeof Notification !== 'undefined' ? Notification.permission : 'default',
  isSubscribed: false,
  isLoading: false,
  error: null,

  initialize: async () => {
    if (typeof Notification === 'undefined') return

    set({ permission: Notification.permission })

    if (Notification.permission !== 'granted') {
      set({ isSubscribed: false })
      return
    }

    const reg = await getRegistration()
    if (!reg) return

    const sub = await reg.pushManager.getSubscription()
    set({ isSubscribed: !!sub })
  },

  requestPermission: async () => {
    if (typeof Notification === 'undefined') return 'denied'
    const result = await Notification.requestPermission()
    set({ permission: result })
    return result
  },

  subscribe: async () => {
    const userId = await getCurrentUserId()
    if (!userId) return false
    if (!VAPID_PUBLIC_KEY) {
      set({ error: 'Push notifications not configured (missing VAPID key).' })
      return false
    }

    set({ isLoading: true, error: null })

    try {
      // Request permission if not yet granted
      let perm = get().permission
      if (perm === 'default') {
        perm = await get().requestPermission()
      }
      if (perm !== 'granted') {
        set({ isLoading: false })
        return false
      }

      const reg = await getRegistration()
      if (!reg) {
        set({ error: 'Service worker not available.', isLoading: false })
        return false
      }

      // Subscribe to push
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      const keys = subscription.toJSON().keys!
      const insert: PushSubscriptionInsert = {
        user_id: userId,
        endpoint: subscription.endpoint,
        keys_p256dh: keys.p256dh!,
        keys_auth: keys.auth!,
      }

      const { error } = await supabase.from('push_subscriptions').upsert(insert, {
        onConflict: 'user_id,endpoint',
      })

      if (error) {
        set({ error: error.message, isLoading: false })
        return false
      }

      set({ isSubscribed: true, isLoading: false })
      return true
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to subscribe.',
        isLoading: false,
      })
      return false
    }
  },

  unsubscribe: async () => {
    const userId = await getCurrentUserId()
    set({ isLoading: true, error: null })

    try {
      const reg = await getRegistration()
      if (reg) {
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          // Delete from database first
          if (userId) {
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('user_id', userId)
              .eq('endpoint', sub.endpoint)
          }
          await sub.unsubscribe()
        }
      }

      set({ isSubscribed: false, isLoading: false })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to unsubscribe.',
        isLoading: false,
      })
    }
  },

  clearError: () => set({ error: null }),
}))

export default usePushStore
