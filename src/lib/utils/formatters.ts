import { REP_THRESHOLDS } from './constants'

export function formatMoney(cents: number): string {
  const dollars = cents / 100
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(dollars)
}

export function formatCountdown(deadline: Date | string): string {
  const target = typeof deadline === 'string' ? new Date(deadline) : deadline
  const now = Date.now()
  const diff = target.getTime() - now

  if (diff <= 0) return 'EXPIRED'

  const totalSeconds = Math.floor(diff / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (diff < 24 * 60 * 60 * 1000) {
    const hh = String(hours).padStart(2, '0')
    const mm = String(minutes).padStart(2, '0')
    const ss = String(seconds).padStart(2, '0')
    return `${hh}:${mm}:${ss}`
  }

  return `${days}D ${hours}H`
}

export function formatOdds(
  riders: number,
  doubters: number,
): { riderPct: number; doubterPct: number } {
  const total = riders + doubters
  if (total === 0) return { riderPct: 50, doubterPct: 50 }
  return {
    riderPct: Math.round((riders / total) * 100),
    doubterPct: Math.round((doubters / total) * 100),
  }
}

export function formatRecord(wins: number, losses: number, voids: number): string {
  return `${wins}W · ${losses}L · ${voids}V`
}

export function formatRepBadge(repScore: number): {
  color: 'gold' | 'green' | 'coral'
  label: string
} {
  if (repScore >= REP_THRESHOLDS.gold) {
    return { color: 'gold', label: 'Legendary' }
  }
  if (repScore >= REP_THRESHOLDS.green) {
    return { color: 'green', label: 'Reliable' }
  }
  return { color: 'coral', label: 'Sketchy' }
}

export function relativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = Date.now()
  const diff = now - d.getTime()

  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return 'just now'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`

  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks} week${weeks === 1 ? '' : 's'} ago`

  const months = Math.floor(days / 30)
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`

  const years = Math.floor(days / 365)
  return `${years} year${years === 1 ? '' : 's'} ago`
}
