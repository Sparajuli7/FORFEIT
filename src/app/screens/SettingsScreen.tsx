import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ChevronLeft, Sun, Moon, LogOut, Eye, EyeOff, Lock } from 'lucide-react'
import { useAuthStore, useUiStore } from '@/stores'
import { Input } from '@/app/components/ui/input'
import { Button } from '@/app/components/ui/button'
import { validatePassword, validatePasswordMatch } from '@/lib/utils/validators'
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
  const setPassword = useAuthStore((s) => s.setPassword)
  const theme = useUiStore((s) => s.theme)
  const toggleTheme = useUiStore((s) => s.toggleTheme)

  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  // Password form state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  const handleSignOut = async () => {
    setSigningOut(true)
    await signOut()
    setSigningOut(false)
    setShowSignOutConfirm(false)
    navigate('/', { replace: true })
  }

  const handleSetPassword = async () => {
    setPasswordError(null)
    setPasswordSuccess(false)

    const passCheck = validatePassword(newPassword)
    if (!passCheck.valid) {
      setPasswordError(passCheck.error ?? 'Enter a valid password.')
      return
    }

    const matchCheck = validatePasswordMatch(newPassword, confirmPassword)
    if (!matchCheck.valid) {
      setPasswordError(matchCheck.error ?? 'Passwords do not match.')
      return
    }

    setPasswordSaving(true)
    await setPassword(newPassword)

    const storeError = useAuthStore.getState().error
    if (storeError) {
      setPasswordError(storeError)
    } else {
      setPasswordSuccess(true)
      setNewPassword('')
      setConfirmPassword('')
    }
    setPasswordSaving(false)
  }

  const canSavePassword =
    validatePassword(newPassword).valid &&
    confirmPassword.length > 0 &&
    validatePasswordMatch(newPassword, confirmPassword).valid &&
    !passwordSaving

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
          {/* Set / Update Password */}
          <div className="bg-bg-card border border-border-subtle rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Lock className="w-4 h-4 text-text-muted" />
              <p className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Password
              </p>
            </div>
            <p className="text-xs text-text-muted mb-3">
              Set or update your password for email + password login.
            </p>

            <div className="space-y-3">
              <div className="relative">
                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="New password (8+ characters)"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value)
                    setPasswordSuccess(false)
                    setPasswordError(null)
                  }}
                  className="h-11 rounded-xl bg-input-background border-input text-sm w-full pr-12"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="relative">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value)
                    setPasswordSuccess(false)
                    setPasswordError(null)
                  }}
                  className="h-11 rounded-xl bg-input-background border-input text-sm w-full pr-12"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {passwordError && (
                <p className="text-destructive text-xs">{passwordError}</p>
              )}
              {passwordSuccess && (
                <p className="text-accent-green text-xs">Password updated!</p>
              )}

              <Button
                onClick={handleSetPassword}
                disabled={!canSavePassword}
                className="w-full h-10 rounded-xl bg-accent-green text-white font-bold text-sm hover:bg-accent-green/90"
              >
                {passwordSaving ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </span>
                ) : (
                  'Set Password'
                )}
              </Button>
            </div>
          </div>

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
