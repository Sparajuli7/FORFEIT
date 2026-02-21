import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { supabase } from '@/lib/supabase'
import type { Message } from '@/lib/database.types'
import type { RealtimeChannel } from '@supabase/supabase-js'
import {
  getUserConversations,
  getMessages,
  sendMessage as apiSendMessage,
  markConversationRead as apiMarkRead,
  getUnreadCount,
  getGroupConversation,
  getCompetitionConversation,
  getOrCreateDMConversation,
} from '@/lib/api/chat'
import type { ConversationWithMeta, MessageWithSender } from '@/lib/api/chat'

// ---------------------------------------------------------------------------
// Module-level refs — keep channels outside React render cycles
// ---------------------------------------------------------------------------

let _globalChannel: RealtimeChannel | null = null
let _conversationChannel: RealtimeChannel | null = null
let _onNewMessage: ((m: Message) => void) | null = null

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatState {
  conversations: ConversationWithMeta[]
  activeConversation: ConversationWithMeta | null
  messages: MessageWithSender[]
  totalUnreadCount: number
  hasMoreMessages: boolean
  isLoading: boolean
  error: string | null
}

interface ChatActions {
  fetchConversations: () => Promise<void>
  openConversation: (id: string) => Promise<void>
  sendMessage: (content: string, type?: 'text' | 'image', mediaUrl?: string) => Promise<void>
  loadMoreMessages: () => Promise<void>
  markRead: (conversationId: string) => Promise<void>
  getOrCreateGroupChat: (groupId: string) => Promise<string>
  getOrCreateCompetitionChat: (betId: string) => Promise<string>
  getOrCreateDM: (userId: string) => Promise<string>
  subscribeToRealtime: () => Promise<void>
  unsubscribeFromRealtime: () => Promise<void>
  subscribeToConversation: (id: string) => Promise<void>
  unsubscribeFromConversation: () => Promise<void>
  setOnNewMessage: (cb: ((m: Message) => void) | null) => void
  clearActiveConversation: () => void
  clearError: () => void
}

export type ChatStore = ChatState & ChatActions

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getCurrentUserId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

const MESSAGE_PAGE_SIZE = 50

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const useChatStore = create<ChatStore>()(
  immer((set, get) => ({
    // ---- state ----
    conversations: [],
    activeConversation: null,
    messages: [],
    totalUnreadCount: 0,
    hasMoreMessages: true,
    isLoading: false,
    error: null,

    // ---- actions ----

    fetchConversations: async () => {
      set((draft) => {
        draft.isLoading = true
        draft.error = null
      })

      try {
        const conversations = await getUserConversations()
        const unreadCount = await getUnreadCount()
        set((draft) => {
          draft.conversations = conversations
          draft.totalUnreadCount = unreadCount
          draft.isLoading = false
        })
      } catch (e) {
        set((draft) => {
          draft.error = e instanceof Error ? e.message : 'Failed to fetch conversations'
          draft.isLoading = false
        })
      }
    },

    openConversation: async (id: string) => {
      const conv = get().conversations.find((c) => c.id === id)

      set((draft) => {
        draft.activeConversation = conv ?? null
        draft.messages = []
        draft.hasMoreMessages = true
        draft.isLoading = true
        draft.error = null
      })

      try {
        const messages = await getMessages(id, MESSAGE_PAGE_SIZE)
        set((draft) => {
          // Messages come newest-first from API; reverse for display (oldest first)
          draft.messages = messages.reverse()
          draft.hasMoreMessages = messages.length === MESSAGE_PAGE_SIZE
          draft.isLoading = false
        })

        // Mark as read
        await apiMarkRead(id)
        set((draft) => {
          const c = draft.conversations.find((c) => c.id === id)
          if (c) c._unread = false
          draft.totalUnreadCount = draft.conversations.filter((c) => c._unread).length
        })
      } catch (e) {
        set((draft) => {
          draft.error = e instanceof Error ? e.message : 'Failed to load messages'
          draft.isLoading = false
        })
      }
    },

    sendMessage: async (content, type = 'text', mediaUrl) => {
      const userId = await getCurrentUserId()
      const activeConv = get().activeConversation
      if (!userId || !activeConv) return

      // Optimistic: append message immediately
      const optimisticId = `optimistic-${Date.now()}`
      const optimisticMsg: MessageWithSender = {
        id: optimisticId,
        conversation_id: activeConv.id,
        sender_id: userId,
        content,
        type,
        media_url: mediaUrl ?? null,
        created_at: new Date().toISOString(),
        _senderName: 'You',
        _senderAvatar: null,
      }

      set((draft) => {
        draft.messages.push(optimisticMsg)
      })

      try {
        const sent = await apiSendMessage(activeConv.id, content, type, mediaUrl)

        set((draft) => {
          // Replace optimistic message with real one
          const idx = draft.messages.findIndex((m) => m.id === optimisticId)
          if (idx !== -1) {
            draft.messages[idx] = {
              ...sent,
              _senderName: optimisticMsg._senderName,
              _senderAvatar: optimisticMsg._senderAvatar,
            }
          }
          // Update conversation preview
          const conv = draft.conversations.find((c) => c.id === activeConv.id)
          if (conv) {
            conv.last_message_at = sent.created_at
            conv.last_message_preview = content.slice(0, 100)
          }
        })
      } catch (e) {
        // Rollback optimistic message
        set((draft) => {
          draft.messages = draft.messages.filter((m) => m.id !== optimisticId)
          draft.error = e instanceof Error ? e.message : 'Failed to send message'
        })
      }
    },

    loadMoreMessages: async () => {
      const { activeConversation, messages, hasMoreMessages } = get()
      if (!activeConversation || !hasMoreMessages || messages.length === 0) return

      const oldestMessage = messages[0]

      try {
        const older = await getMessages(activeConversation.id, MESSAGE_PAGE_SIZE, oldestMessage.created_at)
        set((draft) => {
          // Prepend older messages (they come newest-first, reverse for display)
          draft.messages.unshift(...older.reverse())
          draft.hasMoreMessages = older.length === MESSAGE_PAGE_SIZE
        })
      } catch (e) {
        set((draft) => {
          draft.error = e instanceof Error ? e.message : 'Failed to load messages'
        })
      }
    },

    markRead: async (conversationId) => {
      // Optimistic
      set((draft) => {
        const conv = draft.conversations.find((c) => c.id === conversationId)
        if (conv) conv._unread = false
        draft.totalUnreadCount = draft.conversations.filter((c) => c._unread).length
      })

      try {
        await apiMarkRead(conversationId)
      } catch {
        // Rollback
        set((draft) => {
          const conv = draft.conversations.find((c) => c.id === conversationId)
          if (conv) conv._unread = true
          draft.totalUnreadCount = draft.conversations.filter((c) => c._unread).length
        })
      }
    },

    getOrCreateGroupChat: async (groupId) => {
      const conv = await getGroupConversation(groupId)
      if (conv) return conv.id
      throw new Error('Group conversation not found. It should have been auto-created.')
    },

    getOrCreateCompetitionChat: async (betId) => {
      const conv = await getCompetitionConversation(betId)
      if (conv) return conv.id
      throw new Error('Competition conversation not found. It should have been auto-created.')
    },

    getOrCreateDM: async (otherUserId) => {
      const conv = await getOrCreateDMConversation(otherUserId)
      return conv.id
    },

    subscribeToRealtime: async () => {
      const userId = await getCurrentUserId()
      if (!userId) return

      // Avoid duplicate channels
      if (_globalChannel) await get().unsubscribeFromRealtime()

      // Get user's conversation IDs for filtering
      const conversations = get().conversations
      if (conversations.length === 0) return

      // Subscribe to messages in all user's conversations
      // Use a broad channel and filter client-side for efficiency
      _globalChannel = supabase
        .channel(`chat:global:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
          },
          (payload) => {
            const newMessage = payload.new as Message
            const convIds = new Set(get().conversations.map((c) => c.id))

            // Only process messages for conversations user is part of
            if (!convIds.has(newMessage.conversation_id)) return

            // Skip own messages (already handled optimistically)
            if (newMessage.sender_id === userId) return

            const activeConv = get().activeConversation

            // If this is the active conversation, it will be handled by the conversation channel
            if (activeConv && activeConv.id === newMessage.conversation_id) return

            // Update conversation in list
            set((draft) => {
              const conv = draft.conversations.find((c) => c.id === newMessage.conversation_id)
              if (conv) {
                conv.last_message_at = newMessage.created_at
                conv.last_message_preview = newMessage.content.slice(0, 100)
                conv._unread = true
              }
              draft.totalUnreadCount = draft.conversations.filter((c) => c._unread).length
            })

            _onNewMessage?.(newMessage)
          },
        )
        .subscribe()
    },

    unsubscribeFromRealtime: async () => {
      if (_globalChannel) {
        await supabase.removeChannel(_globalChannel)
        _globalChannel = null
      }
      _onNewMessage = null
    },

    subscribeToConversation: async (conversationId) => {
      const userId = await getCurrentUserId()
      if (!userId) return

      // Clean up existing conversation channel
      if (_conversationChannel) {
        await supabase.removeChannel(_conversationChannel)
        _conversationChannel = null
      }

      _conversationChannel = supabase
        .channel(`chat:conv:${conversationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`,
          },
          async (payload) => {
            const newMessage = payload.new as Message

            // Skip own messages (already handled optimistically)
            if (newMessage.sender_id === userId) return

            // Enrich with sender profile
            const { data: profile } = await supabase
              .from('profiles')
              .select('display_name, avatar_url')
              .eq('id', newMessage.sender_id)
              .single()

            const enriched: MessageWithSender = {
              ...newMessage,
              _senderName: profile?.display_name ?? 'Unknown',
              _senderAvatar: profile?.avatar_url ?? null,
            }

            set((draft) => {
              // Avoid duplicates
              if (!draft.messages.some((m) => m.id === newMessage.id)) {
                draft.messages.push(enriched)
              }
            })

            // Auto-mark as read since user is viewing this conversation
            await apiMarkRead(conversationId).catch(() => {})
          },
        )
        .subscribe()
    },

    unsubscribeFromConversation: async () => {
      if (_conversationChannel) {
        await supabase.removeChannel(_conversationChannel)
        _conversationChannel = null
      }
    },

    setOnNewMessage: (cb) => {
      _onNewMessage = cb
    },

    clearActiveConversation: () => {
      set((draft) => {
        draft.activeConversation = null
        draft.messages = []
        draft.hasMoreMessages = true
      })
    },

    clearError: () =>
      set((draft) => {
        draft.error = null
      }),
  })),
)

export default useChatStore
