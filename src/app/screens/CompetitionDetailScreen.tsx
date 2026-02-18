import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import { ChevronLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useCompetitionStore } from '@/stores'
import { useRealtimeSubscription } from '@/lib/hooks/useRealtime'
import { AvatarWithRepBadge } from '@/app/components/RepBadge'
import type { Bet } from '@/lib/database.types'

export function CompetitionDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const leaderboard = useCompetitionStore((s) => s.leaderboard)
  const fetchLeaderboard = useCompetitionStore((s) => s.fetchLeaderboard)
  const setActiveCompetition = useCompetitionStore((s) => s.setActiveCompetition)
  const isLoading = useCompetitionStore((s) => s.isLoading)
  const [competition, setCompetition] = useState<Bet | null>(null)

  useEffect(() => {
    if (id) {
      fetchLeaderboard(id)
      supabase
        .from('bets')
        .select('*')
        .eq('id', id)
        .single()
        .then(({ data }) => setCompetition(data as Bet | null))
    }
    return () => setActiveCompetition(null)
  }, [id, fetchLeaderboard, setActiveCompetition])

  // Subscribe to competition_scores for this bet → live leaderboard
  useRealtimeSubscription(
    'competition_scores',
    () => id && fetchLeaderboard(id),
    id ? `bet_id=eq.${id}` : undefined,
  )

  const handleBack = () => navigate(-1)

  if (!id) return null

  if (isLoading && leaderboard.length === 0) {
    return (
      <div className="h-full bg-bg-primary flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent-green border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-full bg-bg-primary grain-texture overflow-y-auto pb-24">
      <button
        onClick={handleBack}
        className="absolute top-6 left-6 p-2 -m-2 text-text-muted hover:text-text-primary transition-colors z-10"
        aria-label="Go back"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <div className="px-6 pt-12 pb-6">
        <h1 className="text-2xl font-black text-text-primary mb-2">
          {competition?.title ?? 'Competition'} Leaderboard
        </h1>
        <p className="text-text-muted text-sm mb-6">
          {competition?.comp_metric ?? 'Score'}
        </p>

        {leaderboard.length === 0 ? (
          <p className="text-text-muted text-sm">No scores yet.</p>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((entry, i) => (
              <div
                key={entry.score.id}
                className={`flex items-center gap-4 bg-bg-card rounded-xl border border-border-subtle p-4 ${
                  i === 0 ? 'border-gold/50 bg-gold/5' : ''
                }`}
              >
                <span className="text-2xl font-black tabular-nums text-text-muted w-8">
                  {entry.rank}
                </span>
                <div className="relative">
                  <AvatarWithRepBadge
                    src={entry.profile?.avatar_url ?? null}
                    alt={entry.profile?.display_name ?? 'Player'}
                    score={entry.profile?.rep_score ?? 100}
                    name={entry.profile?.display_name}
                    size={48}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-text-primary truncate">
                    {entry.profile?.display_name ?? 'Unknown'}
                  </p>
                  <p className="text-xs text-text-muted">@{entry.profile?.username ?? '—'}</p>
                </div>
                <span className="text-xl font-black tabular-nums text-text-primary">
                  {entry.score.score}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
