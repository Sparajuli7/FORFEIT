import { Outlet, useNavigate, useLocation } from 'react-router'
import { LayoutGrid, Swords, Trophy, Skull, User } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useNotifications } from '@/lib/hooks/useNotifications'

interface NavItem {
  id: string
  label: string
  path: string
  icon: LucideIcon
  boost?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', path: '/home', icon: LayoutGrid },
  { id: 'h2h', label: 'H2H', path: '/h2h', icon: Swords },
  { id: 'compete', label: 'Compete', path: '/compete', icon: Trophy, boost: true },
  { id: 'shame', label: 'Shame', path: '/shame', icon: Skull },
  { id: 'profile', label: 'Profile', path: '/profile', icon: User },
]

function resolveActiveTab(pathname: string): string {
  for (const item of NAV_ITEMS) {
    if (pathname === item.path || pathname.startsWith(item.path + '/')) {
      return item.id
    }
  }
  if (pathname.startsWith('/bet') || pathname.startsWith('/group') || pathname.startsWith('/settings') || pathname.startsWith('/punishment')) {
    return 'home'
  }
  return 'home'
}

export function AppLayout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const activeTab = resolveActiveTab(pathname)

  // Initialize global notification subscription (updates unreadCount, shows toast on new)
  useNotifications()

  return (
    <div className="h-full bg-bg-primary grain-texture flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </div>

      {/* Bottom Navigation */}
      <nav className="absolute bottom-0 left-0 right-0 h-20 bg-bg-primary border-t border-border-subtle flex items-center justify-around pb-safe">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id
          const Icon = item.icon

          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-0.5 transition-all ${item.boost ? '-mt-2' : ''}`}
            >
              <Icon
                className={`w-6 h-6 transition-all ${
                  isActive
                    ? 'text-[#00E676] scale-110'
                    : 'text-[#4A4A4A]'
                }`}
                strokeWidth={isActive ? 2.5 : 2}
              />
              {isActive && (
                <>
                  <span className="text-[10px] text-[#00E676] font-bold uppercase tracking-wider">
                    {item.label}
                  </span>
                  <div className="w-1 h-1 rounded-full bg-[#00E676]" />
                </>
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
