import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useAuthStore } from '@/stores'
import { validateEmail } from '@/lib/utils/validators'
import { Input } from '@/app/components/ui/input'
import { Button } from '@/app/components/ui/button'
import { ChevronLeft, Eye, EyeOff } from 'lucide-react'

type LoginMode = 'password' | 'otp'

export function LoginScreen() {
  const navigate = useNavigate()
  const signIn = useAuthStore((s) => s.signIn)
  const sendOtp = useAuthStore((s) => s.sendOtp)
  const isLoading = useAuthStore((s) => s.isLoading)
  const error = useAuthStore((s) => s.error)
  const clearError = useAuthStore((s) => s.clearError)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isNewUser = useAuthStore((s) => s.isNewUser)
  const profile = useAuthStore((s) => s.profile)

  const [mode, setMode] = useState<LoginMode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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

  const handlePasswordSubmit = async () => {
    clearError()
    setLocalError(null)

    const trimmedEmail = email.trim().toLowerCase()
    const emailCheck = validateEmail(trimmedEmail)
    if (!emailCheck.valid) {
      setLocalError(emailCheck.error ?? 'Enter a valid email address.')
      return
    }

    if (!password) {
      setLocalError('Password is required.')
      return
    }

    await signIn(trimmedEmail, password)
  }

  const handleOtpSubmit = async () => {
    clearError()
    setLocalError(null)

    const trimmedEmail = email.trim().toLowerCase()
    const emailCheck = validateEmail(trimmedEmail)
    if (!emailCheck.valid) {
      setLocalError(emailCheck.error ?? 'Enter a valid email address.')
      return
    }

    await sendOtp(trimmedEmail)
    // If no error was set by the store, navigate to OTP screen
    const storeError = useAuthStore.getState().error
    if (!storeError) {
      navigate('/auth/otp', { state: { email: trimmedEmail } })
    }
  }

  const switchMode = (newMode: LoginMode) => {
    clearError()
    setLocalError(null)
    setPassword('')
    setMode(newMode)
  }

  const displayError = error ?? localError
  const emailValid = validateEmail(email.trim()).valid
  const canSubmitPassword = emailValid && password.length > 0 && !isLoading
  const canSubmitOtp = emailValid && !isLoading

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
          Welcome back
        </h1>
        <p className="text-text-muted text-sm mb-6">
          {mode === 'password'
            ? 'Log in with your email and password'
            : 'We\'ll send a 6-digit code to your email'}
        </p>

        {/* Mode toggle */}
        <div className="flex rounded-xl bg-bg-elevated p-1 mb-6">
          <button
            onClick={() => switchMode('password')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
              mode === 'password'
                ? 'bg-accent-green text-white'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Password
          </button>
          <button
            onClick={() => switchMode('otp')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
              mode === 'otp'
                ? 'bg-accent-green text-white'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Email Code
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 rounded-xl bg-input-background border-input text-base w-full"
            autoComplete="email"
          />

          {mode === 'password' && (
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 rounded-xl bg-input-background border-input text-base w-full pr-12"
                autoComplete="current-password"
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
          )}
        </div>

        {displayError && (
          <p className="text-destructive text-sm mb-4">{displayError}</p>
        )}

        {mode === 'password' ? (
          <Button
            onClick={handlePasswordSubmit}
            disabled={!canSubmitPassword}
            className="w-full h-14 rounded-2xl bg-accent-green text-white font-bold text-base hover:bg-accent-green/90"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Logging in...
              </span>
            ) : (
              'Log In'
            )}
          </Button>
        ) : (
          <Button
            onClick={handleOtpSubmit}
            disabled={!canSubmitOtp}
            className="w-full h-14 rounded-2xl bg-accent-green text-white font-bold text-base hover:bg-accent-green/90"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Sending code...
              </span>
            ) : (
              'Send Code'
            )}
          </Button>
        )}

        <p className="text-center text-sm text-text-muted mt-6">
          Don't have an account?{' '}
          <button
            onClick={() => navigate('/auth/signup')}
            className="text-accent-green font-medium hover:underline"
          >
            Sign up
          </button>
        </p>
      </div>
    </div>
  )
}
