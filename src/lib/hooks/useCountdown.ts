import { useState, useEffect } from 'react'

interface CountdownResult {
  days: number
  hours: number
  minutes: number
  seconds: number
  isUrgent: boolean
  /** "2D 14H" when > 24h, "22:14:03" when < 24h, "EXPIRED" when past */
  formatted: string
  isExpired: boolean
  totalMs: number
}

export function useCountdown(deadline: Date | string): CountdownResult {
  const target = typeof deadline === 'string' ? new Date(deadline) : deadline

  const compute = (): CountdownResult => {
    const now = Date.now()
    const totalMs = target.getTime() - now

    if (totalMs <= 0) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        isUrgent: true,
        formatted: 'EXPIRED',
        isExpired: true,
        totalMs: 0,
      }
    }

    const totalSeconds = Math.floor(totalMs / 1000)
    const days = Math.floor(totalSeconds / 86400)
    const hours = Math.floor((totalSeconds % 86400) / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    const isUrgent = totalMs < 24 * 60 * 60 * 1000

    let formatted: string
    if (isUrgent) {
      const hh = String(hours).padStart(2, '0')
      const mm = String(minutes).padStart(2, '0')
      const ss = String(seconds).padStart(2, '0')
      formatted = `${hh}:${mm}:${ss}`
    } else {
      formatted = `${days}D ${hours}H`
    }

    return { days, hours, minutes, seconds, isUrgent, formatted, isExpired: false, totalMs }
  }

  const [value, setValue] = useState(compute)

  useEffect(() => {
    const id = setInterval(() => setValue(compute()), 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.getTime()])

  return value
}
