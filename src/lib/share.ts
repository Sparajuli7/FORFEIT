/**
 * Social sharing: Web Share API + fallback intent URLs for X (Twitter) and Facebook.
 * Use for sharing bets, challenges, and results.
 */

const APP_ORIGIN =
  typeof window !== 'undefined' ? window.location.origin : ''

/** Build full URL for a bet (for sharing). */
export function getBetShareUrl(betId: string): string {
  return `${APP_ORIGIN}/bet/${betId}`
}

/** Build share text for a bet or challenge. */
export function getBetShareText(title: string, claimantName?: string): string {
  const who = claimantName ? `${claimantName} claims: ` : ''
  return `${who}"${title}" — Bet on it in FORFEIT 🎲`
}

/** Build share text for an outcome/result. */
export function getOutcomeShareText(params: {
  title: string
  claimantName: string
  result: 'claimant_succeeded' | 'claimant_failed' | 'voided'
  riderNames?: string[]
  doubterNames?: string[]
}): string {
  const { title, claimantName, result, riderNames = [], doubterNames = [] } = params
  if (result === 'claimant_succeeded') {
    return `🏆 ${claimantName} WON: "${title}" — ${doubterNames.length ? doubterNames.join(', ') + ' owe up!' : 'Claimant proved it!'} Bet on your friends in FORFEIT 🎲`
  }
  if (result === 'claimant_failed') {
    return `😬 FORFEIT: ${claimantName} lost "${title}" — owes ${riderNames.length ? riderNames.join(', ') : 'the group'}. Bet on your friends in FORFEIT 🎲`
  }
  return `🤝 NO CONTEST: "${title}" was voided. Bet on your friends in FORFEIT 🎲`
}

/** X (Twitter) intent URL. */
export function getTwitterShareUrl(text: string, url: string): string {
  const encoded = encodeURIComponent(`${text} ${url}`.trim())
  return `https://twitter.com/intent/tweet?text=${encoded}`
}

/** Facebook share URL. */
export function getFacebookShareUrl(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
}

export interface SharePayload {
  title?: string
  text: string
  url: string
}

/** Whether the Web Share API is available (e.g. mobile share sheet). */
export function canUseNativeShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
}

/**
 * Share using the native share sheet when available (best UX on mobile).
 * Returns true if native share was used, false if caller should show fallback (e.g. ShareSheet).
 */
export async function shareWithNative(payload: SharePayload): Promise<boolean> {
  if (!canUseNativeShare()) return false
  try {
    await navigator.share({
      title: payload.title ?? 'FORFEIT',
      text: payload.text,
      url: payload.url,
    })
    return true
  } catch (e) {
    if ((e as Error).name === 'AbortError') return true
    return false
  }
}

/** Copy text to clipboard. Returns true on success. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
