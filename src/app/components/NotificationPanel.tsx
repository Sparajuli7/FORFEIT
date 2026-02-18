import { useNavigate } from 'react-router'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/app/components/ui/sheet'
import { ScrollArea } from '@/app/components/ui/scroll-area'
import { useNotificationStore } from '@/stores'
import { relativeTime } from '@/lib/utils/formatters'
import type { Notification, NotificationType } from '@/lib/database.types'

const NOTIFICATION_ICONS: Record<NotificationType, string> = {
  bet_created: '📢',
  bet_joined: '👋',
  proof_submitted: '📸',
  proof_confirmed: '✅',
  proof_disputed: '⚠️',
  outcome_resolved: '🏁',
  punishment_assigned: '💀',
  punishment_completed: '🎉',
  group_invite: '👥',
  general: '🔔',
}

function getNavFromNotification(n: Notification): string | null {
  const data = n.data as Record<string, unknown> | null
  if (!data) return null
  if (data.bet_id) return `/bet/${data.bet_id}`
  if (data.group_id) return `/group/${data.group_id}`
  return null
}

interface NotificationPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NotificationPanel({ open, onOpenChange }: NotificationPanelProps) {
  const navigate = useNavigate()
  const notifications = useNotificationStore((s) => s.notifications)
  const markAsRead = useNotificationStore((s) => s.markAsRead)
  const markAllRead = useNotificationStore((s) => s.markAllRead)
  const isLoading = useNotificationStore((s) => s.isLoading)

  const handleNotificationClick = (n: Notification) => {
    if (!n.read) markAsRead(n.id)
    const path = getNavFromNotification(n)
    onOpenChange(false)
    if (path) navigate(path)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-sm bg-bg-primary border-border-subtle">
        <SheetHeader>
          <SheetTitle className="text-text-primary">Notifications</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col h-[calc(100%-4rem)]">
          <button
            onClick={() => markAllRead()}
            className="self-end text-xs font-bold text-accent-green hover:underline mb-2"
          >
            Mark all read
          </button>
          <ScrollArea className="flex-1 -mx-6 px-6">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-accent-green border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <p className="text-text-muted text-sm py-8 text-center">No notifications yet</p>
            ) : (
              <div className="space-y-1">
                {notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`w-full text-left p-3 rounded-xl transition-colors ${
                      n.read ? 'bg-transparent' : 'bg-accent-green/10'
                    } hover:bg-bg-elevated`}
                  >
                    <div className="flex gap-3">
                      <span className="text-xl flex-shrink-0">
                        {NOTIFICATION_ICONS[n.type] ?? NOTIFICATION_ICONS.general}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2">
                          <p className="font-semibold text-text-primary text-sm">{n.title}</p>
                          {!n.read && (
                            <span className="w-2 h-2 rounded-full bg-accent-green flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className="text-text-muted text-xs mt-0.5 line-clamp-2">{n.body}</p>
                        <p className="text-text-muted text-[10px] mt-1">
                          {relativeTime(n.created_at)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  )
}
