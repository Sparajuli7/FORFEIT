import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuthStore } from '@/stores'
import { Input } from '@/app/components/ui/input'
import { Button } from '@/app/components/ui/button'
import { ChevronLeft } from 'lucide-react'

const COUNTRY_CODES = [
  { code: '+1', country: 'US', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+91', country: 'IN', flag: '🇮🇳' },
  { code: '+49', country: 'DE', flag: '🇩🇪' },
  { code: '+33', country: 'FR', flag: '🇫🇷' },
  { code: '+81', country: 'JP', flag: '🇯🇵' },
  { code: '+86', country: 'CN', flag: '🇨🇳' },
  { code: '+61', country: 'AU', flag: '🇦🇺' },
]

function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
}

export function PhoneEntryScreen() {
  const navigate = useNavigate()
  const signInWithPhone = useAuthStore((s) => s.signInWithPhone)
  const isLoading = useAuthStore((s) => s.isLoading)
  const error = useAuthStore((s) => s.error)
  const clearError = useAuthStore((s) => s.clearError)

  const [countryCode, setCountryCode] = useState('+1')
  const [phoneInput, setPhoneInput] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  const handleContinue = async () => {
    clearError()
    setLocalError(null)

    const digits = phoneInput.replace(/\D/g, '')
    if (digits.length < 10) {
      setLocalError('Phone number must be at least 10 digits')
      return
    }

    const formatted = `${countryCode}${digits}`

    try {
      await signInWithPhone(formatted)
      navigate('/auth/otp', { state: { phone: formatted } })
    } catch {
      // Error is set in authStore
    }
  }

  const displayError = error ?? localError

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
          Enter your phone
        </h1>
        <p className="text-text-muted text-sm mb-8">
          We'll send you a 6-digit code to verify
        </p>

        <div className="flex gap-2 mb-6">
          <select
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            className="h-12 px-4 rounded-xl bg-input-background border border-input text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-accent-green/50"
          >
            {COUNTRY_CODES.map(({ code, country, flag }) => (
              <option key={code} value={code}>
                {flag} {code}
              </option>
            ))}
          </select>
          <Input
            type="tel"
            placeholder="555-123-4567"
            value={phoneInput}
            onChange={(e) => setPhoneInput(formatPhoneInput(e.target.value))}
            className="flex-1 h-12 rounded-xl bg-input-background border-input text-base"
            autoComplete="tel-national"
          />
        </div>

        {displayError && (
          <p className="text-destructive text-sm mb-4">{displayError}</p>
        )}

        <Button
          onClick={handleContinue}
          disabled={isLoading || phoneInput.replace(/\D/g, '').length < 10}
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
