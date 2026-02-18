import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import { motion } from 'motion/react'
import { getBetOutcomeWithDetails } from '@/lib/api/outcomes'
import { getProfilesByIds } from '@/lib/api/profiles'
import { formatMoney } from '@/lib/utils/formatters'
import type { BetOutcomeDetails } from '@/lib/api/outcomes'
import type { OutcomeResult } from '@/lib/database.types'
import { PrimaryButton } from '../components/PrimaryButton'
import { PunishmentReceipt } from '../components/PunishmentReceipt'

interface OutcomeRevealProps {
  onShare?: () => void
  onBack?: () => void
}

type ProfileMap = Map<string, { display_name: string; avatar_url: string | null }>

export function OutcomeReveal({ onShare, onBack }: OutcomeRevealProps) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<BetOutcomeDetails | null>(null)
  const [profiles, setProfiles] = useState<ProfileMap>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  const handleShare = async () => {
    if (!data) return
    const result = data.outcome.result
    const claimantName = profiles.get(data.bet.claimant_id)?.display_name ?? 'Claimant'
    const riders = data.betSides.filter((s) => s.side === 'rider').map((s) => profiles.get(s.user_id)?.display_name ?? 'Unknown')
    const doubters = data.betSides.filter((s) => s.side === 'doubter').map((s) => profiles.get(s.user_id)?.display_name ?? 'Unknown')
    let text = ''
    if (result === 'claimant_succeeded') {
      text = `🏆 ${claimantName} WON: "${data.bet.title}" — ${doubters.length ? doubters.join(', ') + ' owe up!' : 'Claimant proved it!'}`
    } else if (result === 'claimant_failed') {
      text = `😬 FORFEIT: ${claimantName} lost "${data.bet.title}" — owes ${riders.length ? riders.join(', ') : 'the group'}`
    } else {
      text = `🤝 NO CONTEST: "${data.bet.title}" was voided.`
    }
    try {
      await navigator.clipboard.writeText(text)
    } catch (_) {}
    onShare?.() ?? navigate('/home')
  }

  const handleBack = () => (onBack ? onBack() : navigate(-1))
  const handleSubmitPunishmentProof = () => id && navigate(`/bet/${id}/shame-proof`)
  const handleDispute = () => navigate('/home')

  if (loading) {
    return (
      <div className="h-full bg-bg-primary flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent-green border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

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
  const winnerNames = winnerIds.map((id) => profiles.get(id)?.display_name ?? 'Unknown')
  const loserNames = loserIds.map((id) => profiles.get(id)?.display_name ?? 'Unknown')
  const resolvedDate = new Date(outcome.resolved_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  // WIN
  if (result === 'claimant_succeeded') {
    return (
      <div
        className="h-full flex flex-col items-center justify-between px-6 py-12 relative overflow-hidden"
        style={{
          background: 'linear-gradient(to bottom, #1A1400 0%, #0A0A0F 100%)',
        }}
      >
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 0.4 + Math.random() * 0.4, scale: 1 }}
              transition={{ delay: i * 0.02, duration: 0.3 }}
              style={{
                left: `${(i * 7) % 100}%`,
                top: `${(i * 11) % 100}%`,
                backgroundColor: ['#FFB800', '#00E676', '#FFFFFF'][i % 3],
              }}
            />
          ))}
        </div>

        <div className="flex-1 flex flex-col items-center justify-center relative z-10">
          <motion.h1
            className="text-[64px] font-black text-gold mb-8 text-center"
            style={{ letterSpacing: '-0.02em' }}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            WINNER
          </motion.h1>

          <motion.div
            className="relative mb-6"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gold to-accent-green overflow-hidden border-4 border-gold">
              {claimantAvatar ? (
                <img src={claimantAvatar} alt={claimantName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-bg-elevated flex items-center justify-center text-2xl font-bold text-gold">
                  {claimantName[0]}
                </div>
              )}
            </div>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-4xl">👑</div>
          </motion.div>

          <motion.p
            className="text-text-primary font-bold text-xl mb-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {claimantName}
          </motion.p>

          <motion.div
            className="w-full max-w-sm mt-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.3 }}
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted text-center mb-4">
              COLLECTING:
            </p>
            <div className="bg-bg-card/50 backdrop-blur-sm border border-gold/30 rounded-2xl p-6 text-center">
              <div className="text-5xl font-black text-accent-green tabular-nums mb-3">
                {bet.stake_money ? formatMoney(bet.stake_money) : '—'}
              </div>
              <p className="text-sm text-text-muted">
                {punishmentText ? `or ${punishmentText}` : 'or punishment incoming 😈'}
              </p>
            </div>
            {loserNames.length > 0 && (
              <div className="mt-6 text-center">
                <p className="text-xs text-accent-coral">
                  {loserNames.join(' · ')} owe you
                </p>
              </div>
            )}
          </motion.div>
        </div>

        <div className="w-full space-y-3 relative z-10">
          <PrimaryButton onClick={handleShare} variant="primary">
            Share Result 🏆
          </PrimaryButton>
          <PrimaryButton onClick={handleBack} variant="ghost">
            Back to Group
          </PrimaryButton>
        </div>
      </div>
    )
  }

  // LOSE
  if (result === 'claimant_failed') {
    return (
      <div
        className="h-full flex flex-col items-center justify-between px-6 py-12 relative overflow-hidden"
        style={{
          background: 'linear-gradient(to bottom, #1A0000 0%, #0A0A0F 100%)',
        }}
      >
        <div className="flex-1 flex flex-col items-center justify-center w-full">
          <motion.h1
            className="text-[72px] font-black text-accent-coral mb-6 text-center italic"
            style={{ letterSpacing: '-0.02em' }}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            FORFEIT
          </motion.h1>

          <motion.div
            className="mb-8 opacity-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            transition={{ delay: 0.2 }}
          >
            <svg width="200" height="140" viewBox="0 0 200 140" className="text-accent-coral">
              <path
                d="M 100 0 L 98 30 L 102 50 L 97 80 L 103 110 L 100 140"
                stroke="currentColor"
                strokeWidth="2.5"
                fill="none"
                strokeDasharray="4,3"
              />
              <path
                d="M 100 60 L 65 45 L 45 65 M 100 60 L 135 45 L 155 65"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeDasharray="4,3"
              />
              <path
                d="M 100 90 L 70 105 L 50 125 M 100 90 L 130 105 L 150 125"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeDasharray="4,3"
              />
            </svg>
          </motion.div>

          <motion.div
            className="w-full mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
          >
            <PunishmentReceipt
              betTitle={bet.title}
              loserName={claimantName}
              punishment={punishmentText ?? 'Complete the stake'}
              winnerNames={winnerNames}
              issuedDate={resolvedDate}
            />
          </motion.div>
        </div>

        <div className="w-full space-y-3">
          <PrimaryButton onClick={handleSubmitPunishmentProof} variant="danger">
            SUBMIT PUNISHMENT PROOF
          </PrimaryButton>
          <button
            onClick={handleDispute}
            className="w-full text-xs text-text-muted font-medium btn-pressed"
          >
            Dispute Outcome
          </button>
        </div>
      </div>
    )
  }

  // VOID
  return (
    <div
      className="h-full flex flex-col items-center justify-between px-6 py-12"
      style={{
        background: 'linear-gradient(to bottom, #1A1A1A 0%, #0D0D0D 100%)',
      }}
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
        <PrimaryButton onClick={handleShare} variant="ghost">
          Share Result
        </PrimaryButton>
        <PrimaryButton onClick={handleBack} variant="ghost">
          Back to Group
        </PrimaryButton>
      </div>
    </div>
  )
}
