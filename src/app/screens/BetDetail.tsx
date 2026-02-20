import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import { ArrowLeft, Share2 } from 'lucide-react'
import { useBetStore } from '@/stores'
import { useProofStore } from '@/stores'
import { useAuthStore } from '@/stores'
import { useCountdown } from '@/lib/hooks/useCountdown'
import { useRealtime } from '@/lib/hooks/useRealtime'
import { getProfilesByIds } from '@/lib/api/profiles'
import { acceptH2HChallenge, declineH2HChallenge } from '@/lib/api/h2h'
import { formatMoney } from '@/lib/utils/formatters'
import { formatOdds } from '@/lib/utils/formatters'
import { BET_CATEGORIES } from '@/lib/utils/constants'
import { OddsBar } from '../components/OddsBar'
import { PrimaryButton } from '../components/PrimaryButton'

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop'

function formatStake(bet: { stake_money: number | null; stake_custom_punishment: string | null; stake_punishment_id: string | null }) {
  if (bet.stake_money) return formatMoney(bet.stake_money)
  if (bet.stake_custom_punishment) return bet.stake_custom_punishment
  if (bet.stake_punishment_id) return '🔥 Punishment'
  return '—'
}

interface BetDetailProps {
  onBack?: () => void
}

export function BetDetail({ onBack }: BetDetailProps) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  const activeBet = useBetStore((s) => s.activeBet)
  const activeBetSides = useBetStore((s) => s.activeBetSides)
  const fetchBetDetail = useBetStore((s) => s.fetchBetDetail)
  const joinBet = useBetStore((s) => s.joinBet)
  const isLoading = useBetStore((s) => s.isLoading)
  const error = useBetStore((s) => s.error)

  const proofs = useProofStore((s) => s.proofs)
  const votes = useProofStore((s) => s.votes)
  const fetchProofs = useProofStore((s) => s.fetchProofs)
  const voteOnProof = useProofStore((s) => s.voteOnProof)
  const getVoteCounts = useProofStore((s) => s.getVoteCounts)

  const [profileMap, setProfileMap] = useState<Map<string, { display_name: string; avatar_url: string | null }>>(new Map())

  // Always call useCountdown (Rules of Hooks). Use current time as fallback when no bet so countdown is expired.
  const countdown = useCountdown(activeBet?.deadline ?? new Date().toISOString())
  const riders = activeBetSides.filter((s) => s.side === 'rider')
  const doubters = activeBetSides.filter((s) => s.side === 'doubter')
  const { riderPct, doubterPct } = formatOdds(riders.length, doubters.length)
  const mySide = activeBetSides.find((s) => s.user_id === user?.id)?.side ?? null
  const isClaimant = activeBet?.claimant_id === user?.id
  const isH2HPendingForMe =
    activeBet?.bet_type === 'h2h' &&
    activeBet?.status === 'pending' &&
    activeBet?.h2h_opponent_id === user?.id
  const canJoin = !mySide && (activeBet?.status === 'pending' || activeBet?.status === 'active') && !isH2HPendingForMe
  const showH2HAccept = isH2HPendingForMe
  const showSubmitProof = isClaimant && activeBet?.status === 'active'

  const [h2hLoading, setH2hLoading] = useState(false)
  const handleAcceptH2H = async () => {
    if (!id || h2hLoading) return
    setH2hLoading(true)
    try {
      await acceptH2HChallenge(id)
      fetchBetDetail(id)
    } finally {
      setH2hLoading(false)
    }
  }
  const handleDeclineH2H = async () => {
    if (!id || h2hLoading) return
    setH2hLoading(true)
    try {
      await declineH2HChallenge(id)
      handleBack()
    } finally {
      setH2hLoading(false)
    }
  }

  useEffect(() => {
    if (id) {
      fetchBetDetail(id)
      fetchProofs(id)
    }
  }, [id, fetchBetDetail, fetchProofs])

  useEffect(() => {
    const ids = new Set<string>()
    activeBetSides.forEach((s) => ids.add(s.user_id))
    if (activeBet) ids.add(activeBet.claimant_id)
    if (ids.size === 0) return
    getProfilesByIds([...ids]).then(setProfileMap)
  }, [activeBet, activeBetSides])

  useRealtime('bets', () => id && fetchBetDetail(id), { filter: id ? `id=eq.${id}` : undefined })
  useRealtime('bet_sides', () => id && fetchBetDetail(id), { filter: id ? `bet_id=eq.${id}` : undefined })
  useRealtime('proofs', () => id && fetchProofs(id), { filter: id ? `bet_id=eq.${id}` : undefined })
  useRealtime('proof_votes', () => id && fetchProofs(id))

  const handleBack = () => (onBack ? onBack() : navigate(-1))

  if (!id) return null

  if (isLoading && !activeBet) {
    return (
      <div className="h-full bg-bg-primary flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent-green border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!activeBet) {
    return (
      <div className="h-full bg-bg-primary flex flex-col items-center justify-center px-6">
        <p className="text-text-muted mb-4">Bet not found</p>
        <button onClick={handleBack} className="text-accent-green font-bold">
          Go back
        </button>
      </div>
    )
  }

  const claimant = profileMap.get(activeBet.claimant_id)
  const statusLabel = activeBet.status === 'proof_submitted' ? 'Proof Dropped' : activeBet.status === 'completed' ? 'Completed' : activeBet.status === 'voided' ? 'Voided' : 'Active'

  return (
    <div className="h-full bg-bg-primary overflow-y-auto pb-8">
      {/* Header */}
      <div className="px-6 pt-12 pb-6 flex items-center justify-between">
        <button onClick={handleBack} className="w-10 h-10 flex items-center justify-center btn-pressed rounded-lg hover:bg-bg-elevated transition-colors">
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-accent-green/20 border border-accent-green">
          <div className="w-2 h-2 rounded-full bg-accent-green pulse-slow" />
          <span className="text-xs font-semibold text-accent-green uppercase tracking-wider">{statusLabel}</span>
        </div>
        <button className="w-10 h-10 flex items-center justify-center">
          <Share2 className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Claimant */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent-green to-accent-coral mb-3 overflow-hidden">
          <img
            src={claimant?.avatar_url ?? DEFAULT_AVATAR}
            alt={claimant?.display_name ?? 'Claimant'}
            className="w-full h-full object-cover"
          />
        </div>
        <span className="text-white font-bold text-lg">{claimant?.display_name ?? 'Anonymous'}</span>
      </div>

      {/* Claim */}
      <div className="px-6 mb-8">
        <h2 className="text-[32px] font-extrabold text-white text-center leading-tight" style={{ letterSpacing: '-0.02em' }}>
          {activeBet.title}
        </h2>
        <p className="text-center text-text-muted text-sm mt-2">
          {BET_CATEGORIES[activeBet.category]?.emoji} {BET_CATEGORIES[activeBet.category]?.label}
        </p>
      </div>

      {/* Countdown Timer */}
      <div className="px-6 mb-6">
        <div className="flex justify-center gap-2 mb-3">
          <div className="bg-bg-elevated rounded-xl px-4 py-3 min-w-[70px] text-center">
            <div className="text-3xl font-black text-white tabular-nums">{countdown?.days ?? 0}</div>
            <div className="text-xs text-text-muted uppercase tracking-wider">days</div>
          </div>
          <div className="bg-bg-elevated rounded-xl px-4 py-3 min-w-[70px] text-center">
            <div className="text-3xl font-black text-white tabular-nums">{countdown?.hours ?? 0}</div>
            <div className="text-xs text-text-muted uppercase tracking-wider">hrs</div>
          </div>
          <div className="bg-bg-elevated rounded-xl px-4 py-3 min-w-[70px] text-center">
            <div className="text-3xl font-black text-white tabular-nums">{countdown?.minutes ?? 0}</div>
            <div className="text-xs text-text-muted uppercase tracking-wider">min</div>
          </div>
        </div>
        {!countdown?.isExpired && (
          <div className="h-1 bg-border-subtle rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-green transition-all"
              style={{ width: `${Math.max(0, countdown ? (countdown.totalMs / (countdown.totalMs + 1000)) * 100 : 0)}%` }}
            />
          </div>
        )}
      </div>

      {/* Odds */}
      <div className="px-6 mb-8">
        <OddsBar
          ridersPercent={riderPct}
          doubtersPercent={doubterPct}
          ridersCount={riders.length}
          doubtersCount={doubters.length}
        />
      </div>

      {/* Sides with avatars */}
      <div className="px-6 mb-8">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-bg-card rounded-2xl border border-border-subtle p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🟢</span>
              <span className="text-sm font-bold text-white uppercase tracking-wider">Riders</span>
            </div>
            <div className="space-y-2">
              {riders.map((s) => {
                const p = profileMap.get(s.user_id)
                return (
                  <div key={s.id} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-bg-elevated overflow-hidden">
                      <img src={p?.avatar_url ?? DEFAULT_AVATAR} alt="" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-sm text-text-muted">{p?.display_name ?? 'Anonymous'}</span>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="bg-bg-card rounded-2xl border border-border-subtle p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🔴</span>
              <span className="text-sm font-bold text-white uppercase tracking-wider">Doubters</span>
            </div>
            <div className="space-y-2">
              {doubters.map((s) => {
                const p = profileMap.get(s.user_id)
                return (
                  <div key={s.id} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-bg-elevated overflow-hidden">
                      <img src={p?.avatar_url ?? DEFAULT_AVATAR} alt="" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-sm text-text-muted">{p?.display_name ?? 'Anonymous'}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* H2H Accept/Decline */}
      {showH2HAccept && (
        <div className="px-6 mb-6">
          <div className="bg-bg-card border-2 border-dashed border-gold/50 rounded-2xl p-6 mb-4">
            <p className="text-center text-text-muted text-sm mb-4">You&apos;ve been challenged!</p>
            <div className="flex gap-3">
              <button
                onClick={handleAcceptH2H}
                disabled={h2hLoading}
                className="flex-1 py-4 rounded-2xl bg-accent-green text-white font-bold flex items-center justify-center gap-2 btn-pressed disabled:opacity-50"
              >
                Accept ⚔️
              </button>
              <button
                onClick={handleDeclineH2H}
                disabled={h2hLoading}
                className="flex-1 py-4 rounded-2xl border-2 border-accent-coral text-accent-coral font-bold btn-pressed disabled:opacity-50"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Join CTAs */}
      {canJoin && (
        <div className="px-6 mb-6">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => joinBet(id, 'rider')}
              className="bg-accent-green rounded-2xl p-4 flex flex-col items-center gap-2 btn-pressed"
            >
              <span className="text-2xl">🤝</span>
              <span className="text-bg-primary font-bold">Ride</span>
            </button>
            <button
              onClick={() => joinBet(id, 'doubter')}
              className="bg-accent-coral rounded-2xl p-4 flex flex-col items-center gap-2 btn-pressed"
            >
              <span className="text-2xl">💀</span>
              <span className="text-white font-bold">Doubt</span>
            </button>
          </div>
        </div>
      )}

      {/* Submit Proof CTA */}
      {showSubmitProof && (
        <div className="px-6 mb-6">
          <PrimaryButton onClick={() => navigate(`/bet/${id}/proof`)}>
            Submit Proof
          </PrimaryButton>
        </div>
      )}

      {/* Proof with voting */}
      {activeBet.status === 'proof_submitted' && proofs.length > 0 && (
        <div className="px-6 mb-6">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Proof</h3>
          {proofs.map((proof) => {
            const counts = getVoteCounts(proof.id)
            const myVote = votes.find((v) => v.proof_id === proof.id && v.user_id === user?.id)
            const canVote = !myVote && user?.id !== proof.submitted_by

            return (
              <div key={proof.id} className="bg-bg-card rounded-2xl border border-border-subtle p-4 mb-4">
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {proof.front_camera_url && (
                    <img src={proof.front_camera_url} alt="Front" className="rounded-lg aspect-[3/4] object-cover" />
                  )}
                  {proof.back_camera_url && (
                    <img src={proof.back_camera_url} alt="Back" className="rounded-lg aspect-[3/4] object-cover" />
                  )}
                  {proof.video_url && (
                    <video src={proof.video_url} controls className="rounded-lg w-full" />
                  )}
                  {proof.document_url && (
                    <a href={proof.document_url} target="_blank" rel="noreferrer" className="text-accent-green text-sm">
                      View document
                    </a>
                  )}
                </div>
                {proof.caption && <p className="text-sm text-text-muted mb-4">{proof.caption}</p>}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs text-text-muted">Confirm: {counts.confirm}</span>
                  <span className="text-xs text-text-muted">Dispute: {counts.dispute}</span>
                </div>
                {canVote && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => voteOnProof(proof.id, 'confirm')}
                      className="flex-1 py-2 rounded-xl bg-accent-green text-white font-bold text-sm"
                    >
                      Confirm ✓
                    </button>
                    <button
                      onClick={() => voteOnProof(proof.id, 'dispute')}
                      className="flex-1 py-2 rounded-xl bg-accent-coral text-white font-bold text-sm"
                    >
                      Dispute ✗
                    </button>
                  </div>
                )}
                {myVote && (
                  <p className="text-xs text-text-muted">You voted: {myVote.vote}</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Outcome link */}
      {(activeBet.status === 'completed' || activeBet.status === 'voided') && (
        <div className="px-6 mb-6">
          <PrimaryButton onClick={() => navigate(`/bet/${id}/outcome`)}>
            View Outcome
          </PrimaryButton>
        </div>
      )}

      {/* Stake */}
      <div className="px-6 mb-6">
        <div className="bg-bg-card rounded-2xl border border-border-subtle p-4 text-center">
          <span className="text-text-muted text-sm">Stake: </span>
          <span className="text-white font-bold">{formatStake(activeBet)}</span>
        </div>
      </div>

      {error && <p className="px-6 text-destructive text-sm">{error}</p>}
    </div>
  )
}
