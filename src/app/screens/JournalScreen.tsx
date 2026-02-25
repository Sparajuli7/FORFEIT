import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { Plus, BookOpen, Users } from 'lucide-react'
import { useAuthStore, useGroupStore } from '@/stores'
import { getMyBets } from '@/lib/api/bets'
import { BET_CATEGORIES } from '@/lib/utils/constants'
import {
  loadJournals,
  createJournal,
  type JournalCollection,
} from '@/lib/utils/journalStorage'
import { loadPinned, togglePin, PIN_BETS_KEY, PIN_GROUPS_KEY } from '@/lib/utils/pinStorage'
import { CircleGrid } from '../components/CircleGrid'
import type { BetWithSides } from '@/stores/betStore'

// ---------------------------------------------------------------------------
// Emoji options for new journals
// ---------------------------------------------------------------------------

const JOURNAL_EMOJIS = [
  '📓', '📔', '📒', '📝', '🏆', '🎯', '🎲', '🃏',
  '🏀', '⚽', '🏈', '🎰', '💰', '🔥', '⚡', '💯',
  '👑', '🌟', '🎖️', '🏅', '🤝', '💪', '🎪', '🦁',
]

// ---------------------------------------------------------------------------
// Create journal bottom-sheet
// ---------------------------------------------------------------------------

function CreateModal({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (col: JournalCollection) => void
}) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('📓')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80)
  }, [])

  const submit = () => {
    if (!name.trim()) return
    onCreate(createJournal(name, emoji))
  }

  return (
    <div
      className="absolute inset-0 z-50 flex items-end bg-black/60"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full bg-bg-primary rounded-t-3xl px-6 pt-5 pb-10 border-t border-border-subtle">
        <div className="w-10 h-1 rounded-full bg-border-subtle mx-auto mb-5" />
        <h2 className="text-lg font-black text-text-primary mb-4">New Journal</h2>
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Journal name…"
          maxLength={40}
          className="w-full h-11 rounded-xl bg-bg-elevated border border-border-subtle px-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-green/60 mb-4"
        />
        <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-2">Icon</p>
        <div className="flex flex-wrap gap-2 mb-5">
          {JOURNAL_EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => setEmoji(e)}
              className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                emoji === e
                  ? 'bg-accent-green/20 ring-2 ring-accent-green'
                  : 'bg-bg-elevated hover:bg-bg-card'
              }`}
            >
              {e}
            </button>
          ))}
        </div>
        <button
          onClick={submit}
          disabled={!name.trim()}
          className="w-full h-12 rounded-xl bg-accent-green text-white font-bold text-sm disabled:opacity-40"
        >
          Create Journal
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export function JournalScreen() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const groups = useGroupStore((s) => s.groups)
  const fetchGroups = useGroupStore((s) => s.fetchGroups)
  const groupsLoading = useGroupStore((s) => s.isLoading)

  const [journals, setJournals] = useState<JournalCollection[]>([])
  const [personalBets, setPersonalBets] = useState<BetWithSides[]>([])
  const [betsLoading, setBetsLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    fetchGroups()
    setJournals(loadJournals())
  }, [fetchGroups])

  useEffect(() => {
    if (!user?.id) { setBetsLoading(false); return }
    setBetsLoading(true)
    getMyBets(user.id)
      .then(setPersonalBets)
      .catch(() => setPersonalBets([]))
      .finally(() => setBetsLoading(false))
  }, [user?.id])

  const handleCreated = (col: JournalCollection) => {
    setJournals((prev) => [col, ...prev])
    setShowCreate(false)
    navigate(`/journal/${col.id}`)
  }

  return (
    <div className="relative h-full bg-bg-primary overflow-y-auto pb-8">
      {/* ── Header ── */}
      <div className="px-6 pt-6 pb-5 border-b border-border-subtle">
        <h1 className="text-2xl font-black text-text-primary">Journal</h1>
        <p className="text-text-muted text-sm mt-0.5">Your bets, groups &amp; collections</p>
      </div>

      {/* ══════════════════════════════════════
          SECTION 1 — My Journals
          ══════════════════════════════════════ */}
      <div className="px-6 pt-5 pb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" /> My Journals
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1 text-[11px] font-bold text-accent-green"
          >
            <Plus className="w-3.5 h-3.5" /> New
          </button>
        </div>

        {journals.length === 0 ? (
          <button
            onClick={() => setShowCreate(true)}
            className="w-full py-6 rounded-2xl border-2 border-dashed border-border-subtle flex flex-col items-center justify-center gap-1.5 text-text-muted hover:bg-bg-elevated transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="text-xs font-bold">Create your first journal</span>
          </button>
        ) : (
          <CircleGrid
            items={journals.map((col) => ({
              id: col.id,
              icon: col.emoji,
              label: col.name,
              sublabel: `${col.bet_ids.length} bet${col.bet_ids.length !== 1 ? 's' : ''}`,
            }))}
            onItemClick={(id) => navigate(`/journal/${id}`)}
          />
        )}
      </div>

      {/* ══════════════════════════════════════
          SECTION 2 — Groups (auto-journals)
          ══════════════════════════════════════ */}
      <div className="px-6 pt-1 pb-4 border-t border-border-subtle mt-1">
        <div className="flex items-center justify-between mb-3 pt-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> Groups
          </p>
          <button
            onClick={() => navigate('/group/join')}
            className="text-[11px] font-bold text-accent-green"
          >
            + Join
          </button>
        </div>

        {groupsLoading && groups.length === 0 ? (
          <div className="grid grid-cols-3 gap-y-5 gap-x-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <div className="w-[72px] h-[72px] rounded-full bg-bg-card border border-border-subtle animate-pulse" />
                <div className="w-12 h-3 rounded bg-bg-card animate-pulse" />
              </div>
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="bg-bg-card rounded-2xl border border-border-subtle p-4 flex items-center gap-3">
            <span className="text-2xl">👥</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-text-primary">No groups yet</p>
              <p className="text-[11px] text-text-muted">Create or join a group to track bets together.</p>
            </div>
            <button
              onClick={() => navigate('/group/create')}
              className="px-3 py-1.5 rounded-lg bg-accent-green/20 text-accent-green text-xs font-bold border border-accent-green/40 shrink-0"
            >
              Create
            </button>
          </div>
        ) : (
          <CircleGrid
            items={groups.map((g) => ({
              id: g.id,
              icon: g.avatar_emoji,
              label: g.name,
            }))}
            onItemClick={(id) => navigate(`/journal/group/${id}`)}
          />
        )}
      </div>

      {/* ══════════════════════════════════════
          SECTION 3 — Personal History
          ══════════════════════════════════════ */}
      <div className="px-6 pt-1 border-t border-border-subtle mt-1">
        <div className="pt-4 mb-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
            Personal History
          </p>
          <p className="text-[11px] text-text-muted mt-0.5">Every bet you've ever been in</p>
        </div>

        {betsLoading ? (
          <div className="grid grid-cols-3 gap-y-5 gap-x-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <div className="w-[72px] h-[72px] rounded-full bg-bg-card border border-border-subtle animate-pulse" />
                <div className="w-14 h-3 rounded bg-bg-card animate-pulse" />
              </div>
            ))}
          </div>
        ) : personalBets.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-text-muted text-sm">No bets yet — start one from Home.</p>
          </div>
        ) : (
          <CircleGrid
            items={personalBets.map((bet) => {
              const category = BET_CATEGORIES[bet.category]
              return {
                id: bet.id,
                icon: category?.emoji ?? '🎯',
                label: bet.title,
                sublabel: bet.status === 'active' ? '🟢 Live' : bet.status === 'completed' ? '✅ Done' : bet.status.replace(/_/g, ' '),
              }
            })}
            onItemClick={(id) => navigate(`/bet/${id}`)}
            labelLines={2}
          />
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <CreateModal onClose={() => setShowCreate(false)} onCreate={handleCreated} />
      )}
    </div>
  )
}
