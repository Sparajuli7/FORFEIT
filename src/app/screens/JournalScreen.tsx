import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { Plus, BookOpen, Trash2, ChevronRight } from 'lucide-react'
import {
  loadJournals,
  createJournal,
  deleteJournal,
  type JournalCollection,
} from '@/lib/utils/journalStorage'

// ---------------------------------------------------------------------------
// Emoji options for new journals
// ---------------------------------------------------------------------------

const JOURNAL_EMOJIS = [
  '📓', '📔', '📒', '📝', '🏆', '🎯', '🎲', '🃏',
  '🏀', '⚽', '🏈', '🎰', '💰', '🔥', '⚡', '💯',
  '👑', '🌟', '🎖️', '🏅', '🤝', '💪', '🎪', '🦁',
]

// ---------------------------------------------------------------------------
// Create-journal modal (inline overlay)
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

  const handleCreate = () => {
    if (!name.trim()) return
    const col = createJournal(name, emoji)
    onCreate(col)
  }

  return (
    <div
      className="absolute inset-0 z-50 flex items-end bg-black/60"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full bg-bg-primary rounded-t-3xl px-6 pt-5 pb-10 border-t border-border-subtle">
        {/* Drag handle */}
        <div className="w-10 h-1 rounded-full bg-border-subtle mx-auto mb-5" />

        <h2 className="text-lg font-black text-text-primary mb-4">New Journal</h2>

        {/* Name */}
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          placeholder="Journal name…"
          maxLength={40}
          className="w-full h-11 rounded-xl bg-bg-elevated border border-border-subtle px-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-green/60 mb-4"
        />

        {/* Emoji picker */}
        <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-2">
          Pick an icon
        </p>
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
          onClick={handleCreate}
          disabled={!name.trim()}
          className="w-full h-12 rounded-xl bg-accent-green text-white font-bold text-sm disabled:opacity-40 transition-opacity"
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
  const [journals, setJournals] = useState<JournalCollection[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  useEffect(() => {
    setJournals(loadJournals())
  }, [])

  const handleCreated = (col: JournalCollection) => {
    setJournals((prev) => [col, ...prev])
    setShowCreate(false)
    // Navigate straight into the new collection so user can add bets
    navigate(`/journal/${col.id}`)
  }

  const handleDelete = (id: string) => {
    deleteJournal(id)
    setJournals((prev) => prev.filter((c) => c.id !== id))
    setConfirmDelete(null)
  }

  return (
    <div className="relative h-full bg-bg-primary flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-border-subtle shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-text-primary">Journal</h1>
          <p className="text-text-muted text-sm mt-0.5">Your curated bet collections</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent-green/20 text-accent-green text-sm font-bold border border-accent-green/40 active:scale-95 transition-transform"
        >
          <Plus className="w-4 h-4" />
          New
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {journals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full pb-16">
            <BookOpen className="w-16 h-16 text-text-muted/30 mb-4" strokeWidth={1} />
            <p className="text-text-primary font-bold text-lg mb-1">No journals yet</p>
            <p className="text-text-muted text-sm text-center mb-6">
              Create a journal and curate any bets<br />from your groups or personal challenges.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-accent-green text-white font-bold text-sm"
            >
              <Plus className="w-4 h-4" />
              Create your first journal
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {journals.map((col) => (
              <div key={col.id} className="relative">
                <button
                  onClick={() => navigate(`/journal/${col.id}`)}
                  className="w-full bg-bg-card rounded-2xl border border-border-subtle p-4 text-left hover:bg-bg-elevated transition-colors active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{col.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-text-primary truncate">{col.name}</p>
                      <p className="text-[11px] text-text-muted mt-0.5">
                        {col.bet_ids.length === 0
                          ? 'No bets yet — tap to add'
                          : `${col.bet_ids.length} bet${col.bet_ids.length !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
                  </div>
                </button>

                {/* Delete button */}
                {confirmDelete === col.id ? (
                  <div className="absolute right-0 top-0 h-full flex items-center gap-2 pr-3">
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="text-xs text-text-muted font-bold px-2 py-1 rounded-lg bg-bg-elevated"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDelete(col.id)}
                      className="text-xs text-accent-coral font-bold px-2 py-1 rounded-lg bg-accent-coral/10"
                    >
                      Delete
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(col.id)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-lg text-text-muted hover:text-accent-coral hover:bg-accent-coral/10 transition-colors"
                    aria-label="Delete journal"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <CreateModal onClose={() => setShowCreate(false)} onCreate={handleCreated} />
      )}
    </div>
  )
}
