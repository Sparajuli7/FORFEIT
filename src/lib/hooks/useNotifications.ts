import { useEffect } from 'react'
import { toast } from 'sonner'
import { useNotificationStore, useAuthStore } from '@/stores'

export function useNotifications() {
  const notifications = useNotificationStore((s) => s.notifications)
  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const isLoading = useNotificationStore((s) => s.isLoading)
  const error = useNotificationStore((s) => s.error)

  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications)
  const markAsRead = useNotificationStore((s) => s.markAsRead)
  const markAllRead = useNotificationStore((s) => s.markAllRead)
  const subscribeToRealtime = useNotificationStore((s) => s.subscribeToRealtime)
  const unsubscribeFromRealtime = useNotificationStore((s) => s.unsubscribeFromRealtime)
  const setOnNewNotification = useNotificationStore((s) => s.setOnNewNotification)
  const clearError = useNotificationStore((s) => s.clearError)

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  useEffect(() => {
    if (!isAuthenticated) return

    fetchNotifications()
    subscribeToRealtime()
    setOnNewNotification((n) => {
      toast(n.title, { description: n.body })
    })

    return () => {
      setOnNewNotification(null)
      unsubscribeFromRealtime()
    }
  }, [isAuthenticated, fetchNotifications, subscribeToRealtime, unsubscribeFromRealtime, setOnNewNotification])

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    fetchNotifications,
    markAsRead,
    markAllRead,
    clearError,
  }
}
