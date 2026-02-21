import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Trophy, Lock } from 'lucide-react'
import { getCompetitionsForUser, getLeaderboard } from '@/lib/api/competitions'
import { formatMoney } from '@/lib/utils/formatters'
import { BET_CATEGORIES } from '@/lib/utils/constants'
import type { Bet } from '@/lib/database.types'
import type { LeaderboardEntry } from '@/lib/api/competitions'
import { useAuthStore } from '@/stores'
import { SportsbookButton } from '../components/SportsbookButton'
import { format } from 'date-fns'

function getStatus(competition: Bet): 'OPEN' | 'LIVE' | 'ENDED' {
  const now = new Date()
  const deadline = new Date(competition.deadline)
  const created = new Date(competition.created_at)

  if (competition.status === 'completed' || competition.status === 'voided' || deadline < now) return 'ENDED'
  if (created <= now && deadline >= now) return 'LIVE'
  return 'OPEN'
}

function formatStake(competition: Bet) {
  if (competition.stake_money) return formatMoney(competition.stake_money)
  if (competition.stake_custom_punishment) return competition.stake_custom_punishment
  if (competition.stake_punishment_id) return '🔥 Punishment'
  return '—'
}

function formatTimeframe(competition: Bet) {
  const start = new Date(competition.created_at)
  const end = new Date(competition.deadline)
  return `${format(start, 'MMM d')} – ${format(end, 'MMM d')}`
}

const RANK_EMOJI: Record<number, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
}

export function Competitions() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [competitions, setCompetitions] = useState<Bet[]>([])
  const [leaderboards, setLeaderboards] = useState<Record<string, LeaderboardEntry[]>>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    getCompetitionsForUser()
      .then((data) => {
        setCompetitions(data)
      })
      .catch((err) => {
        console.warn('[Competitions] Failed to fetch:', err)
      })
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    competitions.forEach((c) => {
      getLeaderboard(c.id)
        .then((lb) => {
          setLeaderboards((prev) => ({ ...prev, [c.id]: lb }))
        })
        .catch(() => {})
    })
  }, [competitions])

  if (isLoading) {
    return (
      <div className="h-full bg-bg-primary flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent-green border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-full bg-bg-primary overflow-y-auto pb-6">
      <div className="px-6 pt-12 pb-6">
        <h1 className="text-3xl font-black text-text-primary mb-2">🏆 COMPETITIONS</h1>
        <p className="text-sm text-text-muted">Run a contest. Crown a winner.</p>
      </div>

      <div className="px-6 space-y-4">
        {competitions.length === 0 ? (
          <div className="bg-bg-card border border-border-subtle rounded-xl p-8 text-center">
            <p className="text-text-muted mb-4">No competitions yet</p>
            <SportsbookButton onClick={() => navigate('/compete/create')}>
              CREATE COMPETITION
            </SportsbookButton>
          </div>
        ) : (
          competitions.map((competition) => {
            const status = getStatus(competition)
            const lb = leaderboards[competition.id] ?? []
            const top3 = lb.slice(0, 3)
            const participantCount = lb.length

            return (
              <div
                key={competition.id}
                onClick={() => navigate(`/compete/${competition.id}`)}
                className={`bg-bg-card border-l-4 rounded-xl p-5 cursor-pointer transition-opacity hover:opacity-95 ${
                  status === 'ENDED' ? 'opacity-75 border-l-gold' : 'border-l-purple'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                      COMPETITION
                    </span>
                    <div
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${
                        status === 'LIVE'
                          ? 'bg-accent-green/20'
                          : status === 'OPEN'
                            ? 'bg-gold/20'
                            : 'bg-text-muted/20'
                      }`}
                    >
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${
                          status === 'LIVE' ? 'bg-accent-green pulse-live' : status === 'OPEN' ? 'bg-gold' : 'bg-text-muted'
                        }`}
                      />
                      <span
                        className={`text-[10px] font-bold uppercase ${
                          status === 'LIVE' ? 'text-accent-green' : status === 'OPEN' ? 'text-gold' : 'text-text-muted'
                        }`}
                      >
                        {status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!competition.is_public && <Lock className="w-4 h-4 text-accent-coral" />}
                    <Trophy className="w-5 h-5 text-gold" />
                  </div>
                </div>

                <h3 className="text-xl font-black text-text-primary mb-4">{competition.title}</h3>

                {top3.length > 0 && (
                  <div className="bg-bg-elevated rounded-lg p-3 mb-4 space-y-2">
                    {top3.map((entry, i) => {
                      const isYou = entry.score.user_id === user?.id
                      const rank = i + 1
                      return (
                        <div
                          key={entry.score.id}
                          className={`flex items-center justify-between rounded-lg p-2 ${
                            rank === 1 ? 'bg-gold/10' : isYou ? 'bg-purple/10 border border-purple/30' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`text-2xl font-black tabular-nums ${
                                rank === 1 ? 'text-gold' : 'text-text-muted'
                              }`}
                            >
                              {rank}
                            </span>
                            <span className="text-xl">{RANK_EMOJI[rank] ?? ''}</span>
                            <span className="font-bold text-sm text-text-primary">
                              {entry.profile?.display_name ?? 'Unknown'}
                              {isYou ? ' (You)' : ''}
                            </span>
                          </div>
                          <span className="text-xl font-black tabular-nums text-text-primary">
                            {entry.score.score}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="text-xs font-semibold px-3 py-1.5 bg-bg-elevated rounded-full">
                    {participantCount} participant{participantCount !== 1 ? 's' : ''}
                  </span>
                  <span className="text-xs font-semibold px-3 py-1.5 bg-bg-elevated rounded-full">
                    {formatTimeframe(competition)}
                  </span>
                  <span className="text-xs font-semibold px-3 py-1.5 bg-accent-coral/20 text-accent-coral rounded-full">
                    {formatStake(competition)}
                  </span>
                </div>

                <button className="w-full text-center text-sm font-bold text-accent-green uppercase tracking-wide">
                  VIEW LEADERBOARD →
                </button>
              </div>
            )
          })
        )}
      </div>

      {competitions.length > 0 && (
        <div className="px-6 mt-6">
          <SportsbookButton onClick={() => navigate('/compete/create')}>
            CREATE COMPETITION
          </SportsbookButton>
        </div>
      )}
    </div>
  )
}
