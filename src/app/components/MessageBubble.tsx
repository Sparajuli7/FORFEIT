import type { MessageWithSender } from '@/lib/api/chat'
import { AvatarWithRepBadge } from '@/app/components/RepBadge'
import { format, isToday, isYesterday } from 'date-fns'

interface MessageBubbleProps {
  message: MessageWithSender
  isOwn: boolean
  showSender: boolean
}

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr)
  return format(date, 'h:mm a')
}

export function formatDateSeparator(dateStr: string): string {
  const date = new Date(dateStr)
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'MMM d, yyyy')
}

export function MessageBubble({ message, isOwn, showSender }: MessageBubbleProps) {
  // System messages (join/leave events)
  if (message.type === 'system') {
    return (
      <div className="flex justify-center py-1">
        <p className="text-xs text-text-muted italic">{message.content}</p>
      </div>
    )
  }

  return (
    <div className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar — only for other people's messages, first in cluster */}
      {!isOwn && showSender ? (
        <div className="shrink-0 mt-auto">
          <AvatarWithRepBadge
            src={message._senderAvatar}
            alt={message._senderName}
            score={100}
            name={message._senderName}
            size={28}
          />
        </div>
      ) : !isOwn ? (
        <div className="w-7 shrink-0" />
      ) : null}

      <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Sender name — only for other people, first in cluster */}
        {!isOwn && showSender && (
          <p className="text-[10px] font-semibold text-text-muted mb-0.5 px-1">
            {message._senderName}
          </p>
        )}

        <div
          className={`rounded-2xl px-3 py-2 ${
            isOwn
              ? 'bg-accent-green/20 rounded-br-md'
              : 'bg-bg-card border border-border-subtle rounded-bl-md'
          }`}
        >
          {message.type === 'image' && message.media_url && (
            <img
              src={message.media_url}
              alt="Shared image"
              className="rounded-lg max-w-full max-h-48 object-cover mb-1"
            />
          )}
          <p className={`text-sm ${isOwn ? 'text-text-primary' : 'text-text-primary'}`}>
            {message.content}
          </p>
        </div>

        <p className={`text-[10px] text-text-muted mt-0.5 px-1 ${isOwn ? 'text-right' : ''}`}>
          {formatMessageTime(message.created_at)}
        </p>
      </div>
    </div>
  )
}
