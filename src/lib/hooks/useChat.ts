import { useEffect } from 'react'
import { toast } from 'sonner'
import { useChatStore, useAuthStore } from '@/stores'

export function useChat() {
  const conversations = useChatStore((s) => s.conversations)
  const totalUnreadCount = useChatStore((s) => s.totalUnreadCount)
  const isLoading = useChatStore((s) => s.isLoading)
  const error = useChatStore((s) => s.error)

  const fetchConversations = useChatStore((s) => s.fetchConversations)
  const subscribeToRealtime = useChatStore((s) => s.subscribeToRealtime)
  const unsubscribeFromRealtime = useChatStore((s) => s.unsubscribeFromRealtime)
  const setOnNewMessage = useChatStore((s) => s.setOnNewMessage)
  const clearError = useChatStore((s) => s.clearError)

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  useEffect(() => {
    if (!isAuthenticated) return

    fetchConversations().then(() => {
      subscribeToRealtime()
    })

    setOnNewMessage((m) => {
      toast('New message', { description: m.content.slice(0, 60) })
    })

    return () => {
      setOnNewMessage(null)
      unsubscribeFromRealtime()
    }
  }, [isAuthenticated, fetchConversations, subscribeToRealtime, unsubscribeFromRealtime, setOnNewMessage])

  return {
    conversations,
    totalUnreadCount,
    isLoading,
    error,
    fetchConversations,
    clearError,
  }
}
