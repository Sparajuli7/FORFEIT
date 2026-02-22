/**
 * Social sharing: Web Share API + fallback intent URLs for X (Twitter),
 * Facebook, WhatsApp, and SMS.
 * Use for sharing bets, challenges, results, and stats.
 */

const APP_ORIGIN =
  typeof window !== 'undefined' ? window.location.origin : ''

// ---------------------------------------------------------------------------
// URL builders
// ---------------------------------------------------------------------------

/** Build full URL for a bet (for sharing). */
export function getBetShareUrl(betId: string): string {
  return `${APP_ORIGIN}/bet/${betId}`
}

/** Build full URL for a competition. */
export function getCompetitionShareUrl(compId: string): string {
  return `${APP_ORIGIN}/compete/${compId}`
}

// ---------------------------------------------------------------------------
// Share text builders
// ---------------------------------------------------------------------------

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

/** Build share text for personal stats / record. */
export function getRecordShareText(params: {
  wins: number
  losses: number
  winRate: number
}): string {
  return `I'm ${params.wins}W-${params.losses}L on FORFEIT with a ${params.winRate}% win rate. Think you can beat that? 🎯`
}

/** Build share text for a competition leaderboard. */
export function getCompetitionShareText(params: {
  title: string
  rank?: number
}): string {
  const rankStr = params.rank ? ` — I'm ranked #${params.rank}!` : ''
  return `🏆 ${params.title} competition on FORFEIT${rankStr} Join and compete 🎲`
}

/** Build share text for a punishment receipt. */
export function getPunishmentShareText(params: {
  loserName: string
  punishment: string
  betTitle: string
}): string {
  return `📜 FORFEIT RECEIPT: ${params.loserName} owes ${params.punishment} for losing "${params.betTitle}". No refunds. 😤`
}

/** Build share text for shame proof submission. */
export function getShameShareText(params: {
  loserName: string
  betTitle: string
}): string {
  return `😂 ${params.loserName} just completed their punishment for losing "${params.betTitle}" on FORFEIT!`
}

// ---------------------------------------------------------------------------
// Platform intent URLs
// ---------------------------------------------------------------------------

/** X (Twitter) intent URL. */
export function getTwitterShareUrl(text: string, url: string): string {
  const encoded = encodeURIComponent(`${text} ${url}`.trim())
  return `https://twitter.com/intent/tweet?text=${encoded}`
}

/** Facebook share URL. */
export function getFacebookShareUrl(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
}

/** WhatsApp share URL. */
export function getWhatsAppShareUrl(text: string, url: string): string {
  const encoded = encodeURIComponent(`${text} ${url}`.trim())
  return `https://wa.me/?text=${encoded}`
}

/** SMS share URL. */
export function getSMSShareUrl(text: string, url: string): string {
  const encoded = encodeURIComponent(`${text} ${url}`.trim())
  return `sms:?body=${encoded}`
}

// ---------------------------------------------------------------------------
// Native share + clipboard
// ---------------------------------------------------------------------------

export interface SharePayload {
  title?: string
  text: string
  url: string
  /** Optional image files to attach (proof photos). Used in native share. */
  files?: File[]
}

/** Whether the Web Share API is available (e.g. mobile share sheet). */
export function canUseNativeShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
}

/**
 * Share using the native share sheet when available (best UX on mobile).
 * Attaches image files when provided and supported by the browser.
 * Returns true if native share was used, false if caller should show fallback (e.g. ShareSheet).
 */
export async function shareWithNative(payload: SharePayload): Promise<boolean> {
  if (!canUseNativeShare()) return false
  try {
    const shareData: ShareData = {
      title: payload.title ?? 'FORFEIT',
      text: payload.text,
      url: payload.url,
    }
    // Attach files (proof images) if the browser supports it
    if (payload.files?.length && navigator.canShare?.({ files: payload.files })) {
      shareData.files = payload.files
    }
    await navigator.share(shareData)
    return true
  } catch (e) {
    if ((e as Error).name === 'AbortError') return true
    return false
  }
}

/**
 * Fetch a remote image URL and return it as a File for native sharing.
 * Returns null if fetch fails or URL is falsy.
 */
export async function fetchImageAsFile(
  imageUrl: string | null | undefined,
  filename = 'proof.jpg',
): Promise<File | null> {
  if (!imageUrl) return null
  try {
    const res = await fetch(imageUrl)
    if (!res.ok) return null
    const blob = await res.blob()
    return new File([blob], filename, { type: blob.type || 'image/jpeg' })
  } catch {
    return null
  }
}

/**
 * Collect the best shareable proof image from proof media URLs.
 * Fetches one image (front > back > first screenshot) to keep shares fast.
 */
export async function getProofShareFiles(proof: {
  front_camera_url?: string | null
  back_camera_url?: string | null
  screenshot_urls?: string[] | null
}): Promise<File[]> {
  const url =
    proof.front_camera_url ??
    proof.back_camera_url ??
    proof.screenshot_urls?.[0] ??
    null
  if (!url) return []
  const file = await fetchImageAsFile(url, 'forfeit-proof.jpg')
  return file ? [file] : []
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
