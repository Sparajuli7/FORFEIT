import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ChevronLeft, Sun, Moon, LogOut } from 'lucide-react'
import { useAuthStore, useUiStore } from '@/stores'
import { Button } from '@/app/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog'

export function SettingsScreen() {
  const navigate = useNavigate()
  const signOut = useAuthStore((s) => s.signOut)
  const theme = useUiStore((s) => s.theme)
  const toggleTheme = useUiStore((s) => s.toggleTheme)

  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    setSigningOut(true)
    await signOut()
    setSigningOut(false)
    setShowSignOutConfirm(false)
    navigate('/', { replace: true })
  }

  return (
    <div className="h-full bg-bg-primary grain-texture flex flex-col px-6">
      <button
        onClick={() => navigate(-1)}
        className="absolute top-6 left-6 p-2 -m-2 text-text-muted hover:text-text-primary transition-colors"
        aria-label="Go back"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <div className="pt-12">
        <h1 className="text-2xl font-black text-text-primary mb-8">Settings</h1>

        <div className="space-y-4">
          {/* Theme toggle */}
          <div className="bg-bg-card border border-border-subtle rounded-xl p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">
              Theme
            </p>
            <button
              onClick={toggleTheme}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-bg-elevated hover:bg-bg-elevated/80 transition-colors"
            >
              <span className="text-text-primary font-medium">
                {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
              </span>
              <div className="flex items-center gap-2">
                {theme === 'dark' ? (
                  <Moon className="w-5 h-5 text-accent-green" />
                ) : (
                  <Sun className="w-5 h-5 text-accent-green" />
                )}
              </div>
            </button>
          </div>

          {/* Notification preferences - placeholder */}
          <div className="bg-bg-card border border-border-subtle rounded-xl p-4 opacity-60">
            <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
              Notification preferences
            </p>
            <p className="text-sm text-text-muted">Coming soon</p>
          </div>

          {/* Sign out */}
          <button
            onClick={() => setShowSignOutConfirm(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-accent-coral/50 text-accent-coral font-bold text-sm hover:bg-accent-coral/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      <AlertDialog open={showSignOutConfirm} onOpenChange={setShowSignOutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              You will need to sign in again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSignOut}
              disabled={signingOut}
              className="bg-accent-coral hover:bg-accent-coral/90"
            >
              {signingOut ? 'Signing out...' : 'Sign Out'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
