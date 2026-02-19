import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuthStore } from '@/stores'
import { validateEmail } from '@/lib/utils/validators'
import { Input } from '@/app/components/ui/input'
import { Button } from '@/app/components/ui/button'
import { ChevronLeft } from 'lucide-react'

export function EmailEntryScreen() {
  const navigate = useNavigate()
  const signInWithEmail = useAuthStore((s) => s.signInWithEmail)
  const isLoading = useAuthStore((s) => s.isLoading)
  const error = useAuthStore((s) => s.error)
  const clearError = useAuthStore((s) => s.clearError)

  const [emailInput, setEmailInput] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  const handleContinue = async () => {
    clearError()
    setLocalError(null)

    const trimmed = emailInput.trim().toLowerCase()
    const { valid, error: validationError } = validateEmail(trimmed)
    if (!valid) {
      setLocalError(validationError ?? 'Enter a valid email address.')
      return
    }

    try {
      await signInWithEmail(trimmed)
      navigate('/auth/otp', { state: { email: trimmed } })
    } catch {
      // Error is set in authStore
    }
  }

  const displayError = error ?? localError
  const { valid } = validateEmail(emailInput.trim())

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
          Enter your email
        </h1>
        <p className="text-text-muted text-sm mb-8">
          We'll send you a 6-digit code to verify
        </p>

        <div className="mb-6">
          <Input
            type="email"
            placeholder="you@example.com"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            className="h-12 rounded-xl bg-input-background border-input text-base w-full"
            autoComplete="email"
          />
        </div>

        {displayError && (
          <p className="text-destructive text-sm mb-4">{displayError}</p>
        )}

        <Button
          onClick={handleContinue}
          disabled={isLoading || !valid}
          className="w-full h-14 rounded-2xl bg-accent-green text-white font-bold text-base hover:bg-accent-green/90"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Sending...
            </span>
          ) : (
            'Continue'
          )}
        </Button>
      </div>
    </div>
  )
}
