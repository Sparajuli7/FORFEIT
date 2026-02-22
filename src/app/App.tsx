import { useEffect } from 'react'
import { AppRouter } from './Router'
import { Toaster } from './components/ui/sonner'
import { useAuthStore, useUiStore } from '@/stores'

export default function App() {
  const initialize = useAuthStore((s) => s.initialize)
  const theme = useUiStore((s) => s.theme)

  useEffect(() => {
    initialize()
  }, [initialize])

  const isDark = theme === 'dark'

  return (
    <div className={`size-full flex items-center justify-center ${isDark ? 'bg-gray-950' : 'bg-gray-100'} p-4 transition-colors`}>
      {/* iPhone Frame */}
      <div className="relative">
        {/* Phone Bezel */}
        <div
          className={`${isDark ? 'bg-black' : 'bg-gray-200'} rounded-[3rem] shadow-2xl overflow-hidden border-8 ${isDark ? 'border-gray-900' : 'border-gray-300'} transition-colors`}
          style={{
            width: '390px',
            height: '844px',
          }}
        >
          {/* Screen Content */}
          <div className="relative size-full bg-bg-primary overflow-hidden">
            <AppRouter />
            <Toaster position="top-center" richColors />
          </div>
        </div>

        {/* Dynamic Island */}
        <div
          className={`absolute top-0 left-1/2 -translate-x-1/2 ${isDark ? 'bg-black' : 'bg-gray-200'} rounded-b-3xl z-50 transition-colors`}
          style={{
            width: '120px',
            height: '30px',
          }}
        />
      </div>
    </div>
  )
}
