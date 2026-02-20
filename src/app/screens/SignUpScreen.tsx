import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useAuthStore } from '@/stores'
import { validateEmail, validatePassword, validatePasswordMatch } from '@/lib/utils/validators'
import { Input } from '@/app/components/ui/input'
import { Button } from '@/app/components/ui/button'
import { ChevronLeft, Eye, EyeOff } from 'lucide-react'

export function SignUpScreen() {
  const navigate = useNavigate()
  const signUp = useAuthStore((s) => s.signUp)
  const isLoading = useAuthStore((s) => s.isLoading)
  const error = useAuthStore((s) => s.error)
  const clearError = useAuthStore((s) => s.clearError)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isNewUser = useAuthStore((s) => s.isNewUser)
  const profile = useAuthStore((s) => s.profile)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      if (profile) {
        navigate('/home', { replace: true })
      } else if (isNewUser) {
        navigate('/auth/profile-setup', { replace: true })
      }
    }
  }, [isLoading, isAuthenticated, profile, isNewUser, navigate])

  const handleSubmit = async () => {
    clearError()
    setLocalError(null)

    const trimmedEmail = email.trim().toLowerCase()
    const emailCheck = validateEmail(trimmedEmail)
    if (!emailCheck.valid) {
      setLocalError(emailCheck.error ?? 'Enter a valid email address.')
      return
    }

    const passCheck = validatePassword(password)
    if (!passCheck.valid) {
      setLocalError(passCheck.error ?? 'Enter a valid password.')
      return
    }

    const matchCheck = validatePasswordMatch(password, confirmPassword)
    if (!matchCheck.valid) {
      setLocalError(matchCheck.error ?? 'Passwords do not match.')
      return
    }

    await signUp(trimmedEmail, password)
  }

  const displayError = error ?? localError
  const emailValid = validateEmail(email.trim()).valid
  const passValid = validatePassword(password).valid
  const matchValid = confirmPassword.length > 0 && validatePasswordMatch(password, confirmPassword).valid
  const canSubmit = emailValid && passValid && matchValid && !isLoading

  return (
    <div className="h-full bg-bg-primary grain-texture flex flex-col px-6">
      <button
        onClick={() => navigate(-1)}
        className="absolute top-6 left-6 p-2 -m-2 text-text-muted hover:text-text-primary transition-colors"
        aria-label="Go back"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <div className="flex-1 flex flex-col justify-center pt-12">
        <h1 className="text-2xl font-black text-text-primary mb-2">
          Create your account
        </h1>
        <p className="text-text-muted text-sm mb-8">
          Enter your email and create a password
        </p>

        <div className="space-y-4 mb-6">
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 rounded-xl bg-input-background border-input text-base w-full"
            autoComplete="email"
          />

          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password (8+ characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 rounded-xl bg-input-background border-input text-base w-full pr-12"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <div className="relative">
            <Input
              type={showConfirm ? 'text' : 'password'}
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-12 rounded-xl bg-input-background border-input text-base w-full pr-12"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
              aria-label={showConfirm ? 'Hide password' : 'Show password'}
            >
              {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {displayError && (
          <p className="text-destructive text-sm mb-4">{displayError}</p>
        )}

        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full h-14 rounded-2xl bg-accent-green text-white font-bold text-base hover:bg-accent-green/90"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Creating account...
            </span>
          ) : (
            'Sign Up'
          )}
        </Button>

        <p className="text-center text-sm text-text-muted mt-6">
          Already have an account?{' '}
          <button
            onClick={() => navigate('/auth/login')}
            className="text-accent-green font-medium hover:underline"
          >
            Log in
          </button>
        </p>
      </div>
    </div>
  )
}
