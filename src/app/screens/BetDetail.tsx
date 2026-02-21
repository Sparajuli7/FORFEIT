import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router'
import { ArrowLeft, Share2, Pencil, Check, X } from 'lucide-react'
import { useBetStore } from '@/stores'
import { useProofStore } from '@/stores'
import { useAuthStore } from '@/stores'
import { useCountdown } from '@/lib/hooks/useCountdown'
import { useRealtime } from '@/lib/hooks/useRealtime'
import { getProfilesByIds } from '@/lib/api/profiles'
import { formatMoney } from '@/lib/utils/formatters'
import { formatOdds } from '@/lib/utils/formatters'
import { BET_CATEGORIES } from '@/lib/utils/constants'
import { OddsBar } from '../components/OddsBar'
import { PrimaryButton } from '../components/PrimaryButton'
import { ShareSheet } from '../components/ShareSheet'
import { MediaGallery } from '../components/MediaGallery'
import type { MediaItem } from '../components/MediaGallery'
import { getBetShareUrl, getBetShareText, shareWithNative } from '@/lib/share'

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
  const updateCaption = useProofStore((s) => s.updateCaption)
  const getVoteCounts = useProofStore((s) => s.getVoteCounts)

  const [profileMap, setProfileMap] = useState<Map<string, { display_name: string; avatar_url: string | null }>>(new Map())
  const [editingProofId, setEditingProofId] = useState<string | null>(null)
  const [editCaption, setEditCaption] = useState('')

  // Always call useCountdown (Rules of Hooks). Use current time as fallback when no bet so countdown is expired.
  const countdown = useCountdown(activeBet?.deadline ?? new Date().toISOString())
  const riders = activeBetSides.filter((s) => s.side === 'rider')
  const doubters = activeBetSides.filter((s) => s.side === 'doubter')
  const { riderPct, doubterPct } = formatOdds(riders.length, doubters.length)
  const mySide = activeBetSides.find((s) => s.user_id === user?.id)?.side ?? null
  const isClaimant = activeBet?.claimant_id === user?.id
  const canJoin = !mySide && (activeBet?.status === 'pending' || activeBet?.status === 'active')
  const showSubmitProof = isClaimant && activeBet?.status === 'active'

  const [shareOpen, setShareOpen] = useState(false)
  const [votingProofId, setVotingProofId] = useState<string | null>(null)
  const prevStatusRef = useRef(activeBet?.status)

  // Auto-navigate to outcome when bet resolves (e.g. after a majority vote)
  useEffect(() => {
    if (
      prevStatusRef.current === 'proof_submitted' &&
      (activeBet?.status === 'completed' || activeBet?.status === 'voided') &&
      id
    ) {
      // Small delay so user sees the resolution before navigating
      const timer = setTimeout(() => navigate(`/bet/${id}/outcome`), 1500)
      return () => clearTimeout(timer)
    }
    prevStatusRef.current = activeBet?.status
  }, [activeBet?.status, id, navigate])

  const claimantForShare = activeBet ? profileMap.get(activeBet.claimant_id) : null
  const handleShare = async () => {
    if (!id || !activeBet) return
    const url = getBetShareUrl(id)
    const text = getBetShareText(activeBet.title, claimantForShare?.display_name ?? undefined)
    const usedNative = await shareWithNative({ title: 'Share bet', text, url })
    if (!usedNative) setShareOpen(true)
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
  const statusLabel = activeBet.status === 'proof_submitted' ? 'Vote Now' : activeBet.status === 'completed' ? 'Completed' : activeBet.status === 'voided' ? 'Voided' : activeBet.status === 'disputed' ? 'Disputed' : 'Active'
  const statusColor = activeBet.status === 'proof_submitted' ? 'amber-400' : activeBet.status === 'completed' ? 'accent-green' : activeBet.status === 'voided' || activeBet.status === 'disputed' ? 'accent-coral' : 'accent-green'

  return (
    <div className="h-full bg-bg-primary overflow-y-auto pb-8">
      {/* Header */}
      <div className="px-6 pt-12 pb-6 flex items-center justify-between">
        <button onClick={handleBack} className="w-10 h-10 flex items-center justify-center btn-pressed rounded-lg hover:bg-bg-elevated transition-colors">
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
          statusColor === 'amber-400' ? 'bg-amber-500/20 border border-amber-500/40' :
          statusColor === 'accent-coral' ? 'bg-accent-coral/20 border border-accent-coral' :
          'bg-accent-green/20 border border-accent-green'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            statusColor === 'amber-400' ? 'bg-amber-400' :
            statusColor === 'accent-coral' ? 'bg-accent-coral' :
            'bg-accent-green'
          } pulse-slow`} />
          <span className={`text-xs font-semibold uppercase tracking-wider ${
            statusColor === 'amber-400' ? 'text-amber-400' :
            statusColor === 'accent-coral' ? 'text-accent-coral' :
            'text-accent-green'
          }`}>{statusLabel}</span>
        </div>
        <button
          onClick={handleShare}
          className="w-10 h-10 flex items-center justify-center btn-pressed rounded-lg hover:bg-bg-elevated transition-colors"
          aria-label="Share"
        >
          <Share2 className="w-5 h-5 text-white" />
        </button>
      </div>

      <ShareSheet
        open={shareOpen}
        onOpenChange={setShareOpen}
        title="Share this bet"
        text={getBetShareText(activeBet.title, claimantForShare?.display_name ?? undefined)}
        url={getBetShareUrl(id!)}
      />

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
      {(activeBet.status === 'proof_submitted' || activeBet.status === 'completed' || activeBet.status === 'voided') && proofs.length > 0 && (
        <div className="px-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Proof Submitted</h3>
            {activeBet.status === 'proof_submitted' && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Awaiting Votes
              </span>
            )}
            {activeBet.status === 'completed' && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent-green/20 text-accent-green border border-accent-green/30">
                Resolved
              </span>
            )}
          </div>

          {proofs.map((proof) => {
            const counts = getVoteCounts(proof.id)
            const myVote = votes.find((v) => v.proof_id === proof.id && v.user_id === user?.id)
            const isProofOwner = user?.id === proof.submitted_by
            const canVote = !myVote && !isProofOwner && activeBet.status === 'proof_submitted'
            const totalParticipants = activeBetSides.length
            const majority = Math.floor(totalParticipants / 2) + 1

            // Build media items for the gallery
            const mediaItems: MediaItem[] = []
            if (proof.front_camera_url) mediaItems.push({ url: proof.front_camera_url, type: 'image', label: 'Front' })
            if (proof.back_camera_url) mediaItems.push({ url: proof.back_camera_url, type: 'image', label: 'Back' })
            if (proof.screenshot_urls?.length) {
              proof.screenshot_urls.forEach((url, i) => mediaItems.push({ url, type: 'image', label: `Screenshot ${i + 1}` }))
            }
            if (proof.video_url) mediaItems.push({ url: proof.video_url, type: 'video', label: 'Video' })
            if (proof.document_url) mediaItems.push({ url: proof.document_url, type: 'document', label: 'Document' })

            return (
              <div key={proof.id} className="bg-bg-card rounded-2xl border border-border-subtle p-4 mb-4">
                {/* Proof media */}
                <MediaGallery items={mediaItems} caption={editingProofId === proof.id ? undefined : proof.caption} />

                {/* Text-only proof (no media) */}
                {mediaItems.length === 0 && proof.caption && editingProofId !== proof.id && (
                  <div className="bg-bg-elevated rounded-xl p-4 border border-border-subtle">
                    <p className="text-sm text-text-primary">{proof.caption}</p>
                  </div>
                )}

                {/* Inline caption edit */}
                {editingProofId === proof.id ? (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="text"
                      value={editCaption}
                      onChange={(e) => setEditCaption(e.target.value)}
                      className="flex-1 h-9 rounded-lg bg-bg-elevated border border-border-subtle px-3 text-sm text-text-primary"
                      autoFocus
                    />
                    <button
                      onClick={async () => {
                        await updateCaption(proof.id, editCaption)
                        setEditingProofId(null)
                      }}
                      className="w-8 h-8 rounded-lg bg-accent-green flex items-center justify-center"
                    >
                      <Check className="w-4 h-4 text-white" />
                    </button>
                    <button
                      onClick={() => setEditingProofId(null)}
                      className="w-8 h-8 rounded-lg bg-bg-elevated flex items-center justify-center"
                    >
                      <X className="w-4 h-4 text-text-muted" />
                    </button>
                  </div>
                ) : isProofOwner && activeBet.status === 'proof_submitted' ? (
                  <button
                    onClick={() => { setEditingProofId(proof.id); setEditCaption(proof.caption ?? '') }}
                    className="flex items-center gap-1 mt-2 text-xs text-text-muted hover:text-accent-green transition-colors"
                  >
                    <Pencil className="w-3 h-3" />
                    {proof.caption ? 'Edit caption' : 'Add caption'}
                  </button>
                ) : null}

                {/* Vote progress bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-accent-green font-bold">
                      {counts.confirm} Confirm{counts.confirm !== 1 ? 's' : ''}
                    </span>
                    <span className="text-text-muted">
                      {counts.total} / {totalParticipants} voted
                      {totalParticipants >= 2 && <> &middot; {majority} needed</>}
                    </span>
                    <span className="text-accent-coral font-bold">
                      {counts.dispute} Dispute{counts.dispute !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="h-2 bg-bg-elevated rounded-full overflow-hidden flex">
                    {counts.total > 0 ? (
                      <>
                        <div
                          className="h-full bg-accent-green transition-all duration-300"
                          style={{ width: `${counts.confirmPct}%` }}
                        />
                        <div
                          className="h-full bg-accent-coral transition-all duration-300"
                          style={{ width: `${100 - counts.confirmPct}%` }}
                        />
                      </>
                    ) : (
                      <div className="h-full w-full bg-bg-elevated" />
                    )}
                  </div>
                </div>

                {/* Vote buttons */}
                {canVote && (
                  <div className="mt-4">
                    <p className="text-xs text-text-muted text-center mb-3">Did they do it? Cast your vote.</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        disabled={votingProofId === proof.id}
                        onClick={async () => {
                          setVotingProofId(proof.id)
                          await voteOnProof(proof.id, 'confirm')
                          if (id) fetchBetDetail(id)
                          setVotingProofId(null)
                        }}
                        className="py-3 rounded-2xl bg-accent-green text-bg-primary font-extrabold text-sm flex items-center justify-center gap-2 btn-pressed disabled:opacity-50"
                      >
                        {votingProofId === proof.id ? (
                          <div className="w-4 h-4 border-2 border-bg-primary border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>🤝 Confirm</>
                        )}
                      </button>
                      <button
                        disabled={votingProofId === proof.id}
                        onClick={async () => {
                          setVotingProofId(proof.id)
                          await voteOnProof(proof.id, 'dispute')
                          if (id) fetchBetDetail(id)
                          setVotingProofId(null)
                        }}
                        className="py-3 rounded-2xl bg-accent-coral text-white font-extrabold text-sm flex items-center justify-center gap-2 btn-pressed disabled:opacity-50"
                      >
                        {votingProofId === proof.id ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>💀 Dispute</>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Already voted indicator */}
                {myVote && (
                  <div className="mt-3 flex items-center justify-center gap-2 py-2 rounded-xl bg-bg-elevated">
                    <span className="text-sm">{myVote.vote === 'confirm' ? '🤝' : '💀'}</span>
                    <span className="text-xs font-bold text-text-muted">
                      You voted {myVote.vote === 'confirm' ? 'Confirm' : 'Dispute'}
                    </span>
                  </div>
                )}

                {/* Proof owner can't vote message */}
                {isProofOwner && activeBet.status === 'proof_submitted' && (
                  <p className="mt-3 text-xs text-text-muted text-center">Waiting for others to vote on your proof</p>
                )}
              </div>
            )
          })}

          {/* Resubmit proof — claimant only, while still in proof_submitted */}
          {isClaimant && activeBet.status === 'proof_submitted' && (
            <button
              onClick={() => navigate(`/bet/${id}/proof`)}
              className="w-full text-center text-sm font-bold text-text-muted hover:text-accent-green transition-colors mt-2"
            >
              + Submit additional proof
            </button>
          )}
        </div>
      )}

      {/* Outcome link + Rematch (visible to everyone who can view the bet; only participants can complete rematch) */}
      {(activeBet.status === 'completed' || activeBet.status === 'voided') && (
        <div className="px-6 mb-6 space-y-3">
          <PrimaryButton onClick={() => navigate(`/bet/${id}/outcome`)} className="w-full">
            View Outcome
          </PrimaryButton>
          <button
            onClick={() => navigate(`/bet/${id}/rematch`)}
            className="w-full py-3 rounded-xl border border-accent-green text-accent-green font-bold text-sm"
          >
            Rematch — same people, higher stakes
          </button>
        </div>
      )}

      {/* Remix — use this challenge as a template (for all bets the user can see) */}
      <div className="px-6 mb-6">
        <button
          onClick={() => navigate('/bet/create', { state: { templateBetId: id } })}
          className="w-full py-3 rounded-xl border border-border-subtle text-text-muted hover:text-text-primary hover:border-accent-green/50 font-bold text-sm transition-colors"
        >
          Remix — use as template & pick who to invite
        </button>
      </div>

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
