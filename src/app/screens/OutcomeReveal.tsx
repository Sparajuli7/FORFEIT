import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'motion/react'
import { getBetOutcomeWithDetails } from '@/lib/api/outcomes'
import { isParticipantInBet } from '@/lib/api/bets'
import { getProfilesByIds } from '@/lib/api/profiles'
import { useAuthStore } from '@/stores'
import { formatMoney } from '@/lib/utils/formatters'
import type { BetOutcomeDetails } from '@/lib/api/outcomes'
import type { OutcomeResult } from '@/lib/database.types'
import { PrimaryButton } from '../components/PrimaryButton'
import { PunishmentReceipt } from '../components/PunishmentReceipt'
import { ShareSheet } from '../components/ShareSheet'
import { getBetShareUrl, getOutcomeShareText, shareWithNative, getProofShareFiles } from '@/lib/share'
import { Download, Share2 } from 'lucide-react'
import { captureElementAsImage, shareImage } from '@/lib/utils/imageExport'
import { getPunishmentShareText } from '@/lib/share'

interface OutcomeRevealProps {
  onShare?: () => void
  onBack?: () => void
}

type ProfileMap = Map<string, { display_name: string; avatar_url: string | null }>

// ---------------------------------------------------------------------------
// Winner card — ref-captured for share/save
// ---------------------------------------------------------------------------

interface WinnerCardProps {
  betTitle: string
  winnerName: string
  winnerNames: string[]
  loserNames: string[]
  stakeMoney?: number | null
  punishmentText?: string | null
  resolvedDate: string
  betId?: string
}

const WinnerCard = ({ betTitle, winnerName, winnerNames, loserNames, stakeMoney, punishmentText, resolvedDate }: WinnerCardProps) => (
  <div
    className="mx-4 rounded-2xl overflow-hidden"
    style={{
      background: 'linear-gradient(135deg, #0F1A0F 0%, #1A2A0F 50%, #0A1F0A 100%)',
      border: '1.5px solid rgba(0,230,118,0.4)',
      boxShadow: '0 0 40px rgba(0,230,118,0.15)',
    }}
  >
    {/* Top stripe */}
    <div
      className="h-1.5"
      style={{ background: 'linear-gradient(90deg, #00E676, #FFB800, #00E676)' }}
    />

    <div className="p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-accent-green opacity-80">
          FORFEIT
        </p>
        <p className="text-[10px] text-text-muted tabular-nums">{resolvedDate}</p>
      </div>

      {/* Trophy + winner name */}
      <div className="text-center mb-5">
        <div className="text-5xl mb-2">🏆</div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-accent-green mb-1">
          WINNER
        </p>
        <p className="text-xl font-black text-white leading-tight">
          {winnerNames.length > 1 ? winnerNames.join(' & ') : winnerName}
        </p>
      </div>

      {/* Divider */}
      <div className="border-t border-dashed border-accent-green/20 my-4" />

      {/* Bet info */}
      <div className="space-y-2.5">
        <div className="flex justify-between items-start gap-3">
          <span className="text-[10px] font-bold uppercase text-text-muted shrink-0">BET</span>
          <span className="text-xs text-text-primary text-right">{betTitle}</span>
        </div>

        {(stakeMoney || punishmentText) && (
          <div className="flex justify-between items-start gap-3">
            <span className="text-[10px] font-bold uppercase text-text-muted shrink-0">COLLECTS</span>
            <span className="text-xs font-bold text-accent-green text-right">
              {stakeMoney ? formatMoney(stakeMoney) : punishmentText}
            </span>
          </div>
        )}

        {loserNames.length > 0 && (
          <div className="flex justify-between items-start gap-3">
            <span className="text-[10px] font-bold uppercase text-text-muted shrink-0">OWES</span>
            <span className="text-xs text-accent-coral text-right">{loserNames.join(', ')}</span>
          </div>
        )}
      </div>

      {/* Bottom stripe */}
      <div
        className="h-px mt-5"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(0,230,118,0.3), transparent)' }}
      />
      <p className="text-center text-[9px] font-bold uppercase tracking-widest text-text-muted mt-3 opacity-60">
        FORFEIT · Bet settled
      </p>
    </div>
  </div>
)

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export function OutcomeReveal({ onShare, onBack }: OutcomeRevealProps) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [data, setData] = useState<BetOutcomeDetails | null>(null)
  const [profiles, setProfiles] = useState<ProfileMap>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState<'revealing' | 'result'>('revealing')
  const [shareSheetOpen, setShareSheetOpen] = useState(false)
  const [savingImage, setSavingImage] = useState(false)
  const receiptRef = useRef<HTMLDivElement>(null)
  const winnerCardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    getBetOutcomeWithDetails(id)
      .then(async (details) => {
        if (cancelled || !details) return
        setData(details)
        const ids = new Set<string>([
          details.bet.claimant_id,
          ...details.betSides.map((s) => s.user_id),
        ])
        const map = await getProfilesByIds([...ids])
        if (!cancelled) setProfiles(map)
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? 'Failed to load outcome')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [id])

  // Auto-advance reveal after 2.2s
  useEffect(() => {
    if (!loading && !error && data) {
      const t = setTimeout(() => setPhase('result'), 2200)
      return () => clearTimeout(t)
    }
  }, [loading, error, data])

  const handleShare = async () => {
    if (!data || !id) return
    const result = data.outcome.result as 'claimant_succeeded' | 'claimant_failed' | 'voided'
    const claimantName = profiles.get(data.bet.claimant_id)?.display_name ?? 'Claimant'
    const riderNames = data.betSides.filter((s) => s.side === 'rider').map((s) => profiles.get(s.user_id)?.display_name ?? 'Unknown')
    const doubterNames = data.betSides.filter((s) => s.side === 'doubter').map((s) => profiles.get(s.user_id)?.display_name ?? 'Unknown')
    const text = getOutcomeShareText({ title: data.bet.title, claimantName, result, riderNames, doubterNames })
    const url = getBetShareUrl(id)
    const proofFiles = data.proofs.length > 0 ? await getProofShareFiles(data.proofs[0]) : []
    const usedNative = await shareWithNative({ title: 'Share result', text, url, files: proofFiles })
    if (usedNative) {
      onShare?.() ?? navigate('/home')
    } else {
      setShareSheetOpen(true)
    }
  }

  const handleSharedDone = () => { onShare?.() ?? navigate('/home') }
  const handleBack = () => (onBack ? onBack() : navigate(-1))
  const handleSubmitPunishmentProof = () => id && navigate(`/bet/${id}/shame-proof`)
  const handleDispute = () => navigate('/home')

  const handleSaveReceipt = async () => {
    if (!receiptRef.current || savingImage) return
    setSavingImage(true)
    try {
      const blob = await captureElementAsImage(receiptRef.current, { scale: 2 })
      await shareImage(blob, 'forfeit-receipt.png', 'FORFEIT Punishment Receipt')
    } catch { /* ignore */ }
    finally { setSavingImage(false) }
  }

  const handleSaveWinnerCard = async () => {
    if (!winnerCardRef.current || savingImage) return
    setSavingImage(true)
    try {
      const blob = await captureElementAsImage(winnerCardRef.current, { scale: 2 })
      await shareImage(blob, 'forfeit-winner.png', 'I won the bet! 🏆')
    } catch { /* ignore */ }
    finally { setSavingImage(false) }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-full bg-bg-primary flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent-green border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div className="h-full bg-bg-primary flex flex-col items-center justify-center px-6">
        <p className="text-destructive mb-4">{error ?? 'Outcome not found'}</p>
        <PrimaryButton onClick={() => navigate(-1)}>Go Back</PrimaryButton>
      </div>
    )
  }

  const { outcome, bet, betSides, punishmentText } = data
  const result = outcome.result as OutcomeResult
  const claimantProfile = profiles.get(bet.claimant_id)
  const claimantName = claimantProfile?.display_name ?? 'Claimant'
  const claimantAvatar = claimantProfile?.avatar_url
  const riders = betSides.filter((s) => s.side === 'rider')
  const doubters = betSides.filter((s) => s.side === 'doubter')
  const winnerIds = result === 'claimant_succeeded' ? [bet.claimant_id, ...riders.map((r) => r.user_id)] : doubters.map((d) => d.user_id)
  const loserIds = result === 'claimant_succeeded' ? doubters.map((d) => d.user_id) : [bet.claimant_id, ...riders.map((r) => r.user_id)]
  const winnerNames = winnerIds.map((uid) => profiles.get(uid)?.display_name ?? 'Unknown')
  const loserNames = loserIds.map((uid) => profiles.get(uid)?.display_name ?? 'Unknown')
  const isParticipant = isParticipantInBet(bet, betSides, user?.id)
  const resolvedDate = new Date(outcome.resolved_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })

  const outcomeShareText = getOutcomeShareText({
    title: bet.title,
    claimantName,
    result,
    riderNames: riders.map((r) => profiles.get(r.user_id)?.display_name ?? 'Unknown'),
    doubterNames: doubters.map((d) => profiles.get(d.user_id)?.display_name ?? 'Unknown'),
  })
  const outcomeShareUrl = id ? getBetShareUrl(id) : ''

  const firstProof = data.proofs[0]
  const proofImageUrl =
    firstProof?.front_camera_url ??
    firstProof?.back_camera_url ??
    firstProof?.screenshot_urls?.[0] ??
    null
  const proofCaption = firstProof?.caption ?? bet.title

  const shareSheet = (
    <ShareSheet
      open={shareSheetOpen}
      onOpenChange={setShareSheetOpen}
      title="Share result"
      text={outcomeShareText}
      url={outcomeShareUrl}
      imageUrl={proofImageUrl}
      caption={proofCaption}
      onShared={handleSharedDone}
    />
  )

  // ── Dramatic Reveal Phase ─────────────────────────────────────────────────
  if (phase === 'revealing') {
    const revealEmoji = result === 'claimant_succeeded' ? '👑' : result === 'claimant_failed' ? '💀' : '🎲'
    const revealColor = result === 'claimant_succeeded'
      ? 'from-yellow-900/60 via-black to-black'
      : result === 'claimant_failed'
        ? 'from-red-950/60 via-black to-black'
        : 'from-gray-900 via-black to-black'

    return (
      <div
        className={`h-full bg-gradient-to-b ${revealColor} flex flex-col items-center justify-center px-6 cursor-pointer`}
        onClick={() => setPhase('result')}
      >
        {/* Pulsing emoji */}
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.8, 1, 0.8] }}
          transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
          className="text-8xl mb-8 select-none"
        >
          {revealEmoji}
        </motion.div>

        {/* "Verdict is in" */}
        <motion.h2
          className="text-3xl font-black text-white text-center mb-3 leading-tight"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          The verdict is in
        </motion.h2>

        <motion.p
          className="text-text-muted text-center text-sm max-w-[260px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {bet.title}
        </motion.p>

        {/* Progress bar auto-advancing */}
        <motion.div
          className="absolute bottom-0 left-0 h-0.5 bg-accent-green/60"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 2.2, ease: 'linear' }}
        />

        <p className="absolute bottom-8 text-text-muted text-xs font-medium opacity-60">
          Tap to reveal
        </p>
      </div>
    )
  }

  // ── WIN ────────────────────────────────────────────────────────────────────
  if (result === 'claimant_succeeded') {
    const punishmentForShare = getPunishmentShareText({
      loserName: loserNames[0] ?? 'Opponent',
      punishment: punishmentText ?? 'their stakes',
      betTitle: bet.title,
    })

    return (
      <>
        {shareSheet}
        <div
          className="h-full flex flex-col overflow-hidden relative"
          style={{ background: 'linear-gradient(to bottom, #0D1A00 0%, #050A00 60%, #0A0A0F 100%)' }}
        >
          {/* Confetti particles */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(40)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full"
                initial={{ opacity: 0, y: -20, scale: 0 }}
                animate={{
                  opacity: [0, 0.7, 0.3],
                  y: ['0%', `${60 + (i % 4) * 10}%`],
                  x: [`${-10 + (i % 5) * 5}px`, `${10 - (i % 5) * 5}px`],
                  scale: [0, 1, 0.5],
                  rotate: [0, 360 * (i % 2 === 0 ? 1 : -1)],
                }}
                transition={{ delay: i * 0.04, duration: 2 + (i % 3) * 0.5, ease: 'easeOut' }}
                style={{
                  left: `${(i * 2.5) % 100}%`,
                  top: `${(i * 3) % 30}%`,
                  width: i % 4 === 0 ? 8 : 5,
                  height: i % 4 === 0 ? 8 : 5,
                  backgroundColor: ['#FFB800', '#00E676', '#FFFFFF', '#FF6B35', '#7B61FF'][i % 5],
                }}
              />
            ))}
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col items-center px-6 pt-10 pb-4">
              {/* WINNER headline */}
              <AnimatePresence>
                <motion.h1
                  className="font-black text-center mb-6"
                  style={{
                    fontSize: 68,
                    letterSpacing: '-0.03em',
                    lineHeight: 1,
                    background: 'linear-gradient(135deg, #FFB800 0%, #00E676 50%, #FFB800 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                  initial={{ opacity: 0, scale: 0.6, y: -30 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  WINNER
                </motion.h1>
              </AnimatePresence>

              {/* Claimant avatar */}
              <motion.div
                className="relative mb-5"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 280 }}
              >
                {/* Glow ring */}
                <div
                  className="absolute inset-0 rounded-full"
                  style={{ boxShadow: '0 0 0 6px rgba(0,230,118,0.25), 0 0 30px rgba(0,230,118,0.3)' }}
                />
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-accent-green relative">
                  {claimantAvatar ? (
                    <img src={claimantAvatar} alt={claimantName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-bg-elevated flex items-center justify-center text-3xl font-black text-accent-green">
                      {claimantName[0]}
                    </div>
                  )}
                </div>
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-4xl">👑</div>
              </motion.div>

              <motion.p
                className="text-white font-black text-2xl mb-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
              >
                {claimantName}
              </motion.p>
              <motion.p
                className="text-accent-green text-xs font-bold uppercase tracking-widest mb-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
              >
                Takes the W
              </motion.p>

              {/* Winner card — shareable */}
              <motion.div
                className="w-full mb-4"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.4 }}
                ref={winnerCardRef}
              >
                <WinnerCard
                  betTitle={bet.title}
                  winnerName={claimantName}
                  winnerNames={winnerNames}
                  loserNames={loserNames}
                  stakeMoney={bet.stake_money}
                  punishmentText={punishmentText}
                  resolvedDate={resolvedDate}
                  betId={id}
                />
              </motion.div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="px-6 pb-8 pt-3 space-y-3 shrink-0 border-t border-white/5">
            <PrimaryButton onClick={handleShare} variant="primary">
              Share Result 🏆
            </PrimaryButton>
            <button
              onClick={handleSaveWinnerCard}
              disabled={savingImage}
              className="w-full h-12 rounded-xl border border-accent-green/30 text-accent-green text-sm font-bold flex items-center justify-center gap-2 hover:bg-accent-green/10 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {savingImage ? 'Saving…' : 'Save Winner Card'}
            </button>
            {isParticipant && id && (
              <PrimaryButton
                onClick={() => navigate(`/bet/${id}/rematch`)}
                variant="ghost"
                className="border border-accent-green/40 text-accent-green"
              >
                Rematch — same people, higher stakes
              </PrimaryButton>
            )}
            <PrimaryButton onClick={handleBack} variant="ghost">
              Back to Group
            </PrimaryButton>
          </div>
        </div>

        {/* Shame share sheet for loser names */}
        <ShareSheet
          open={false}
          onOpenChange={() => {}}
          title="Shame them"
          text={punishmentForShare}
          url={outcomeShareUrl}
          onShared={() => {}}
        />
      </>
    )
  }

  // ── LOSE ───────────────────────────────────────────────────────────────────
  if (result === 'claimant_failed') {
    return (
      <>
        {shareSheet}
        <div
          className="h-full flex flex-col overflow-hidden relative"
          style={{ background: 'linear-gradient(to bottom, #1A0000 0%, #0D0000 60%, #0A0A0F 100%)' }}
        >
          {/* Red flash on mount */}
          <motion.div
            className="absolute inset-0 bg-accent-coral pointer-events-none"
            initial={{ opacity: 0.4 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          />

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col items-center px-6 pt-10 pb-4">
              {/* FORFEIT headline */}
              <motion.h1
                className="font-black text-accent-coral text-center mb-2 italic"
                style={{ fontSize: 72, letterSpacing: '-0.03em', lineHeight: 1 }}
                initial={{ opacity: 0, scale: 1.4, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 250, damping: 18 }}
              >
                FORFEIT
              </motion.h1>

              <motion.p
                className="text-accent-coral/70 text-xs font-bold uppercase tracking-widest mb-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                You lost the bet
              </motion.p>

              {/* Losing figure */}
              <motion.div
                className="mb-6 opacity-30"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.3 }}
                transition={{ delay: 0.25 }}
              >
                <svg width="120" height="84" viewBox="0 0 200 140" className="text-accent-coral">
                  <path d="M 100 0 L 98 30 L 102 50 L 97 80 L 103 110 L 100 140"
                    stroke="currentColor" strokeWidth="2.5" fill="none" strokeDasharray="4,3" />
                  <path d="M 100 60 L 65 45 L 45 65 M 100 60 L 135 45 L 155 65"
                    stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="4,3" />
                  <path d="M 100 90 L 70 105 L 50 125 M 100 90 L 130 105 L 150 125"
                    stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="4,3" />
                </svg>
              </motion.div>

              {/* Punishment Receipt */}
              <motion.div
                className="w-full mb-4"
                initial={{ opacity: 0, y: 30, rotate: -1 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                transition={{ delay: 0.3, duration: 0.45 }}
              >
                <PunishmentReceipt
                  ref={receiptRef}
                  betTitle={bet.title}
                  loserName={claimantName}
                  punishment={punishmentText ?? 'Complete the stake'}
                  winnerNames={winnerNames}
                  issuedDate={resolvedDate}
                  betId={id}
                />
              </motion.div>

              {/* Who won */}
              {winnerNames.length > 0 && (
                <motion.p
                  className="text-center text-xs text-text-muted"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  {winnerNames.join(' & ')} {winnerNames.length === 1 ? 'wins' : 'win'} this one
                </motion.p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="px-6 pb-8 pt-3 space-y-3 shrink-0 border-t border-white/5">
            <PrimaryButton onClick={handleSubmitPunishmentProof} variant="danger">
              SUBMIT PUNISHMENT PROOF
            </PrimaryButton>
            <button
              onClick={handleSaveReceipt}
              disabled={savingImage}
              className="w-full h-12 rounded-xl border border-border-subtle text-text-primary text-sm font-bold flex items-center justify-center gap-2 hover:bg-bg-elevated transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {savingImage ? 'Saving…' : 'Save Receipt as Image'}
            </button>
            <button
              onClick={handleShare}
              className="w-full h-12 rounded-xl border border-border-subtle text-text-muted text-sm font-bold flex items-center justify-center gap-2 hover:bg-bg-elevated transition-colors"
            >
              <Share2 className="w-4 h-4" />
              Share Result
            </button>
            {isParticipant && id && (
              <PrimaryButton
                onClick={() => navigate(`/bet/${id}/rematch`)}
                variant="ghost"
                className="border border-accent-green/40 text-accent-green"
              >
                Rematch — same people, higher stakes
              </PrimaryButton>
            )}
            <button
              onClick={handleDispute}
              className="w-full text-xs text-text-muted font-medium btn-pressed py-2"
            >
              Dispute Outcome
            </button>
          </div>
        </div>
      </>
    )
  }

  // ── VOID ──────────────────────────────────────────────────────────────────
  return (
    <>
      {shareSheet}
      <div
        className="h-full flex flex-col items-center justify-between px-6 py-12"
        style={{ background: 'linear-gradient(to bottom, #1A1A1A 0%, #0D0D0D 100%)' }}
      >
        <div className="flex-1 flex flex-col items-center justify-center">
          <motion.h1
            className="text-[64px] font-black text-text-muted mb-8 text-center"
            style={{ letterSpacing: '-0.02em' }}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            NO CONTEST
          </motion.h1>
          <motion.p
            className="text-text-muted text-center max-w-xs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            This bet was voided. No winners, no losers.
          </motion.p>
        </div>

        <div className="w-full space-y-3">
          {isParticipant && id && (
            <PrimaryButton
              onClick={() => navigate(`/bet/${id}/rematch`)}
              variant="ghost"
              className="border border-accent-green text-accent-green w-full"
            >
              Rematch — same people, higher stakes
            </PrimaryButton>
          )}
          <PrimaryButton onClick={handleShare} variant="ghost">
            Share Result
          </PrimaryButton>
          <PrimaryButton onClick={handleBack} variant="ghost">
            Back to Group
          </PrimaryButton>
        </div>
      </div>
    </>
  )
}
