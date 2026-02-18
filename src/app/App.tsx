import { useState, useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'
import { AppRouter } from './Router'
import { Toaster } from './components/ui/sonner'
import { useAuthStore } from '@/stores'

export default function App() {
  const [darkMode, setDarkMode] = useState(true)
  const initialize = useAuthStore((s) => s.initialize)

  useEffect(() => {
    initialize()
  }, [initialize])

  const toggleTheme = () => {
    setDarkMode(!darkMode)
  }

  return (
    <div className={`size-full flex items-center justify-center ${darkMode ? 'dark' : ''} ${darkMode ? 'bg-gray-950' : 'bg-gray-100'} p-4 transition-colors`}>
      {/* iPhone Frame */}
      <div className="relative">
        {/* Phone Bezel */}
        <div
          className={`${darkMode ? 'bg-black' : 'bg-gray-200'} rounded-[3rem] shadow-2xl overflow-hidden border-8 ${darkMode ? 'border-gray-900' : 'border-gray-300'} transition-colors`}
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
          className={`absolute top-0 left-1/2 -translate-x-1/2 ${darkMode ? 'bg-black' : 'bg-gray-200'} rounded-b-3xl z-50 transition-colors`}
          style={{
            width: '120px',
            height: '30px',
          }}
        />
      </div>

      {/* Controls Panel */}
      <div className={`fixed top-4 right-4 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} rounded-2xl p-4 max-w-xs shadow-2xl border transition-colors`}>
        {/* Theme Toggle */}
        <div className="mb-4 pb-4 border-b border-gray-700 dark:border-gray-800">
          <p className={`text-xs font-bold mb-3 uppercase tracking-wider ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Toggle Theme
          </p>
          <button
            onClick={toggleTheme}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
              darkMode
                ? 'bg-gray-800 hover:bg-gray-700'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {darkMode ? 'Dark Mode' : 'Light Mode'}
            </span>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              darkMode ? 'bg-purple-900/50' : 'bg-yellow-100'
            }`}>
              {darkMode ? (
                <Moon className="w-5 h-5 text-purple-400" />
              ) : (
                <Sun className="w-5 h-5 text-yellow-600" />
              )}
            </div>
          </button>
        </div>

        {/* Info */}
        <div className={`mt-4 pt-4 border-t ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <span className="font-black">FORFEIT</span> — Supreme x DraftKings
          </p>
          <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
            Make claims. Bet on friends. Face the consequences.
          </p>
        </div>
      </div>
    </div>
  )
}
