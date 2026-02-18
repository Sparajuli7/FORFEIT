import type { StakeType } from '@/lib/database.types'

interface ValidationResult {
  valid: boolean
  error?: string
}

export function validateClaim(text: string): ValidationResult {
  const trimmed = text.trim()
  if (!trimmed) {
    return { valid: false, error: 'Claim cannot be empty.' }
  }
  if (trimmed.length > 140) {
    return { valid: false, error: 'Claim must be 140 characters or less.' }
  }
  return { valid: true }
}

export function validateStake(
  type: StakeType | null,
  money?: number | null,
  punishment?: { id: string } | null,
): ValidationResult {
  if (!type) {
    return { valid: false, error: 'Select a stake type.' }
  }

  if ((type === 'money' || type === 'both') && (!money || money <= 0)) {
    return { valid: false, error: 'Enter a valid money amount.' }
  }

  if (money && money > 5000) {
    return { valid: false, error: 'Maximum stake is $50.00.' }
  }

  if ((type === 'punishment' || type === 'both') && !punishment) {
    return { valid: false, error: 'Select a punishment.' }
  }

  return { valid: true }
}

export function validatePhone(phone: string): { valid: boolean; formatted: string; error?: string } {
  const digits = phone.replace(/\D/g, '')

  if (digits.length < 10) {
    return { valid: false, formatted: phone, error: 'Phone number must be at least 10 digits.' }
  }

  let formatted: string
  if (digits.startsWith('1') && digits.length === 11) {
    formatted = `+${digits}`
  } else if (digits.length === 10) {
    formatted = `+1${digits}`
  } else if (phone.startsWith('+')) {
    formatted = `+${digits}`
  } else {
    formatted = `+${digits}`
  }

  return { valid: true, formatted }
}

export function validateUsername(username: string): ValidationResult {
  const trimmed = username.trim()

  if (trimmed.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters.' }
  }

  if (trimmed.length > 20) {
    return { valid: false, error: 'Username must be 20 characters or less.' }
  }

  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return { valid: false, error: 'Username can only contain letters, numbers, and underscores.' }
  }

  return { valid: true }
}
