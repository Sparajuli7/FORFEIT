import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuthStore } from '@/stores'
import { supabase } from '@/lib/supabase'

/**
 * Handles the redirect after the user clicks "Confirm your mail" in the Supabase email.
 * Supabase sends them here with tokens in the URL hash, or token_hash in query (PKCE).
 * We process the session then redirect to home or profile-setup.
 */
export function AuthCallbackScreen() {
  const navigate = useNavigate()
  const initialize = useAuthStore((s) => s.initialize)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const profile = useAuthStore((s) => s.profile)
  const isNewUser = useAuthStore((s) => s.isNewUser)
  const isLoading = useAuthStore((s) => s.isLoading)

  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const hash = window.location.hash.slice(1)
    const params = new URLSearchParams(hash || window.location.search)
    const errorCode = params.get('error_code')
    const errorDesc = params.get('error_description')

    if (errorCode || params.get('error')) {
      const message =
        errorDesc?.replace(/\+/g, ' ') ||
        (errorCode === 'otp_expired'
          ? 'That link has expired. Request a new one from the app.'
          : 'Something went wrong. Try signing in again.')
      setErrorMessage(message)
      return
    }

    const tokenHash = params.get('token_hash')
    const type = params.get('type')

    const run = async () => {
      if (tokenHash && type === 'email') {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'email',
        })
        if (error) {
          setErrorMessage(error.message)
          return
        }
      }
      await initialize()
    }
    run()
  }, [initialize])

  // After initialize(), redirect if we're authenticated
  useEffect(() => {
    if (errorMessage) return
    if (!isLoading && isAuthenticated) {
      if (profile) {
        navigate('/home', { replace: true })
      } else if (isNewUser) {
        navigate('/auth/profile-setup', { replace: true })
      }
    }
  }, [errorMessage, isLoading, isAuthenticated, profile, isNewUser, navigate])

  // If we're still loading and no error, show spinner
  if (!errorMessage && (isLoading || (!isAuthenticated && !errorMessage))) {
    return (
      <div className="h-full bg-bg-primary grain-texture flex flex-col items-center justify-center px-6">
        <div className="w-10 h-10 border-2 border-accent-green border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-text-muted text-sm">Signing you in...</p>
      </div>
    )
  }

  // Error state: link expired or failed
  if (errorMessage) {
    return (
      <div className="h-full bg-bg-primary grain-texture flex flex-col items-center justify-center px-6">
        <p className="text-text-primary font-semibold text-center mb-2">
          Link expired or invalid
        </p>
        <p className="text-text-muted text-sm text-center mb-6">
          {errorMessage}
        </p>
        <button
          onClick={() => navigate('/auth/email', { replace: true })}
          className="h-12 px-6 rounded-xl bg-accent-green text-white font-bold text-sm"
        >
          Back to sign in
        </button>
      </div>
    )
  }

  return null
}
