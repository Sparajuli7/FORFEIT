import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { ChevronLeft } from 'lucide-react'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'motion/react'
import { createCompetition } from '@/lib/api/competitions'
import { getGroupMembersWithProfiles, getAllGroupMembersForUser } from '@/lib/api/groups'
import { getApprovedPunishments } from '@/lib/api/punishments'
import { STAKE_PRESETS, COMPETITION_TEMPLATES } from '@/lib/utils/constants'
import { formatMoney } from '@/lib/utils/formatters'
import type { StakeType } from '@/lib/database.types'
import type { GroupMemberWithProfile } from '@/lib/api/groups'
import { useGroupStore } from '@/stores'
import { PrimaryButton } from '../components/PrimaryButton'
import { Input } from '../components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import { FunContractModal } from '../components/FunContractModal'
import type { Competition } from '@/stores'

// Builds the challenge text from a COMPETITION_TEMPLATE entry
const METRIC_STRUCTURES = [
  (fill: string) => `Who can ${fill} the most?`,
  (fill: string) => `Who can ${fill} the fastest?`,
  (fill: string) => `Who can ${fill} the least?`,
  (fill: string) => `Most ${fill} wins`,
  (fill: string) => `Highest ${fill} wins`,
]

export function CompetitionCreateScreen() {
  const navigate = useNavigate()
  const groups = useGroupStore((s) => s.groups)
  const fetchGroups = useGroupStore((s) => s.fetchGroups)

  const [step, setStep] = useState(1)

  // ── Step 1 ──────────────────────────────────────────────────────────────────
  const [title, setTitle] = useState('')
  const [metric, setMetric] = useState('')          // freeform, user writes it
  const [templatesOpen, setTemplatesOpen] = useState(false)

  // ── Step 2 ──────────────────────────────────────────────────────────────────
  const [addMode, setAddMode] = useState<'whole_group' | 'select_members' | 'friends'>('whole_group')
  const [selectedGroup, setSelectedGroup] = useState<{ id: string; name: string } | null>(null)
  const [groupMembers, setGroupMembers] = useState<GroupMemberWithProfile[]>([])
  const [friendsList, setFriendsList] = useState<GroupMemberWithProfile[]>([])
  const [participants, setParticipants] = useState<GroupMemberWithProfile[]>([])
  const [competitionGroupId, setCompetitionGroupId] = useState<string | null>(null)

  const [startDate, setStartDate] = useState<Date>(() => new Date())
  const [endDate, setEndDate] = useState<Date>(() => {
    const d = new Date()
    d.setMonth(d.getMonth() + 1)
    return d
  })

  // ── Step 3 ──────────────────────────────────────────────────────────────────
  const [scoringMethod, setScoringMethod] = useState<'self_reported' | 'group_verified'>('self_reported')
  const [stakeType, setStakeType] = useState<StakeType>('money')
  const [stakeMoney, setStakeMoney] = useState(2000)
  const [stakePunishmentId, setStakePunishmentId] = useState<string | null>(null)
  const [punishments, setPunishments] = useState<{ id: string; text: string }[]>([])
  const [punishmentText, setPunishmentText] = useState('')
  const [punishmentEdited, setPunishmentEdited] = useState(false)
  const [isPublic, setIsPublic] = useState(true)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fun contract
  const [createdComp, setCreatedComp] = useState<Competition | null>(null)
  const [contractOpen, setContractOpen] = useState(false)

  // The group ID used when creating the competition
  const resolvedGroupId = addMode === 'friends' ? competitionGroupId : selectedGroup?.id

  const toDateString = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  const todayStr = toDateString(new Date())
  const activeDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

  useEffect(() => { fetchGroups() }, [fetchGroups])

  // Load group members when group changes
  useEffect(() => {
    if (selectedGroup?.id) {
      getGroupMembersWithProfiles(selectedGroup.id).then(setGroupMembers)
    } else {
      setGroupMembers([])
    }
  }, [selectedGroup?.id])

  // Load friends when mode switches to friends
  useEffect(() => {
    if (addMode === 'friends') {
      getAllGroupMembersForUser().then(setFriendsList)
    }
  }, [addMode])

  useEffect(() => {
    getApprovedPunishments().then((p) => {
      const mapped = p.map((x) => ({ id: x.id, text: x.text }))
      setPunishments(mapped)
      // Seed the punishment input with a random punishment if user hasn't edited yet
      if (mapped.length > 0 && !punishmentEdited) {
        const random = mapped[Math.floor(Math.random() * mapped.length)]
        setPunishmentText(random.text)
        setStakePunishmentId(random.id)
      }
    })
  }, [])

  // ── Participant helpers ──────────────────────────────────────────────────────
  const toggleParticipant = (m: GroupMemberWithProfile) => {
    setParticipants((prev) =>
      prev.some((p) => p.user_id === m.user_id)
        ? prev.filter((p) => p.user_id !== m.user_id)
        : [...prev, m],
    )
  }

  const addWholeGroup = () => {
    if (!groupMembers.length) return
    setParticipants((prev) => {
      const existing = new Set(prev.map((p) => p.user_id))
      return [...prev, ...groupMembers.filter((m) => !existing.has(m.user_id))]
    })
  }

  const randomizePunishment = () => {
    if (punishments.length === 0) return
    const random = punishments[Math.floor(Math.random() * punishments.length)]
    setPunishmentText(random.text)
    setStakePunishmentId(random.id)
    setPunishmentEdited(false)
  }

  const memberList = addMode !== 'friends' ? groupMembers : friendsList

  // ── Navigation ───────────────────────────────────────────────────────────────
  const handleBack = () => {
    if (step === 1) navigate(-1)
    else setStep((s) => s - 1)
  }

  const handleStep1Next = () => {
    if (!title.trim() || !metric.trim()) return
    setError(null)
    setStep(2)
  }

  const handleStep2Next = () => {
    if (participants.length === 0) {
      setError('Add at least one participant.')
      return
    }
    if (addMode === 'friends' && !competitionGroupId) {
      setError('Select a group to post this competition to.')
      return
    }
    if (!resolvedGroupId) {
      setError('Select a group.')
      return
    }
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)
    if (end <= new Date()) {
      setError('End date must be in the future.')
      return
    }
    setError(null)
    setStep(3)
  }

  const handleSubmit = async () => {
    if (!resolvedGroupId) { setError('Select a group.'); return }
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)
    if (end <= new Date()) { setError('End date must be in the future.'); return }
    if ((stakeType === 'money' || stakeType === 'both') && (!stakeMoney || stakeMoney <= 0)) {
      setError('Please set a money stake.'); return
    }
    if ((stakeType === 'punishment' || stakeType === 'both') && !stakePunishmentId && !punishmentText.trim()) {
      setError('Please enter a punishment.'); return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      const comp = await createCompetition({
        title: title.trim(),
        groupId: resolvedGroupId,
        category: 'fitness',
        metric: metric.trim() || title.trim(),
        participantIds: participants.map((p) => p.user_id),
        startDate: startDate.toISOString(),
        deadline: end.toISOString(),
        scoringMethod,
        stakeType,
        stakeMoney: stakeType === 'money' || stakeType === 'both' ? stakeMoney : undefined,
        stakePunishmentId: stakePunishmentId ?? undefined,
        stakeCustomPunishment: stakePunishmentId ? null : punishmentText.trim() || null,
        isPublic,
      })
      setCreatedComp(comp)
      setContractOpen(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create competition')
    } finally {
      setIsSubmitting(false)
    }
  }

  const progressPct = (step / 3) * 100

  return (
    <div className="h-full bg-bg-primary grain-texture flex flex-col">
      {/* Header */}
      <div className="px-6 pt-8 pb-4 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <button onClick={handleBack} className="text-text-primary p-1 -m-1">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-xs font-bold text-text-muted tabular-nums">{step} of 3</span>
        </div>
        <div className="h-1 bg-bg-elevated rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-accent-green"
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-8">
        <AnimatePresence mode="wait">

          {/* ─── Step 1 — Title + Challenge ─── */}
          {step === 1 && (
            <motion.div
              key="s1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div>
                <h2 className="text-[32px] font-extrabold text-white" style={{ letterSpacing: '-0.02em' }}>
                  Set the competition
                </h2>
                <button
                  onClick={() => navigate('/bet/create')}
                  className="text-xs text-text-muted mt-1 underline underline-offset-2"
                >
                  Personal challenge instead →
                </button>
              </div>

              {/* Title */}
              <div>
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-2">
                  Competition name
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, 80))}
                  placeholder="e.g. Most Gym Sessions — February"
                  className="h-12 bg-bg-elevated"
                  maxLength={80}
                />
                <p className="text-right text-xs text-text-muted mt-1">{title.length}/80</p>
              </div>

              {/* Challenge — freeform */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                    The challenge
                  </label>
                  <button
                    onClick={() => setTemplatesOpen(true)}
                    className="text-xs font-bold text-accent-green flex items-center gap-1"
                  >
                    ✨ Browse structures
                  </button>
                </div>
                <textarea
                  value={metric}
                  onChange={(e) => setMetric(e.target.value.slice(0, 200))}
                  placeholder="Describe the challenge… e.g. Who can do the most gym sessions this month?"
                  className="w-full h-28 rounded-xl bg-bg-elevated border border-border-subtle p-4 text-text-primary placeholder:text-text-muted resize-none text-sm"
                  maxLength={200}
                />
                <p className="text-right text-xs text-text-muted mt-1">{metric.length}/200</p>
              </div>

              <PrimaryButton onClick={handleStep1Next} disabled={!title.trim() || !metric.trim()}>
                Next
              </PrimaryButton>
            </motion.div>
          )}

          {/* ─── Step 2 — Participants + Dates ─── */}
          {step === 2 && (
            <motion.div
              key="s2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-[32px] font-extrabold text-white" style={{ letterSpacing: '-0.02em' }}>
                Who's competing?
              </h2>

              {/* ── Three-tab participant source selector ── */}
              <div>
                <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Add participants</p>
                <div className="grid grid-cols-3 gap-1 bg-bg-elevated p-1 rounded-xl">
                  {(
                    [
                      { mode: 'whole_group', icon: '👥', label: 'Entire Group' },
                      { mode: 'select_members', icon: '✓', label: 'Pick Members' },
                      { mode: 'friends', icon: '👤', label: 'Friends' },
                    ] as const
                  ).map(({ mode, icon, label }) => (
                    <button
                      key={mode}
                      onClick={() => {
                        setAddMode(mode)
                        setParticipants([])
                      }}
                      className={`py-2.5 rounded-lg text-center transition-all ${
                        addMode === mode
                          ? 'bg-bg-card text-text-primary shadow-sm'
                          : 'text-text-muted hover:text-text-primary'
                      }`}
                    >
                      <span className="block text-base leading-none mb-1">{icon}</span>
                      <span className="text-[10px] font-black uppercase tracking-wide leading-none">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Entire group ── */}
              {addMode === 'whole_group' && (
                <>
                  <div>
                    <label className="text-xs font-bold text-text-muted block mb-2">Group to challenge</label>
                    <Select
                      value={selectedGroup?.id ?? ''}
                      onValueChange={(id) => {
                        const g = groups.find((x) => x.id === id)
                        setSelectedGroup(g ? { id: g.id, name: g.name } : null)
                        setParticipants([])
                      }}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Select group" />
                      </SelectTrigger>
                      <SelectContent>
                        {groups.map((g) => (
                          <SelectItem key={g.id} value={g.id}>
                            {g.avatar_emoji} {g.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedGroup && (
                    <button
                      onClick={addWholeGroup}
                      disabled={groupMembers.length === 0}
                      className="w-full py-3 rounded-xl font-bold text-sm bg-accent-green/20 text-accent-green border border-accent-green/40 disabled:opacity-50"
                    >
                      {groupMembers.length > 0
                        ? `Add all ${groupMembers.length} members`
                        : 'Loading members…'}
                    </button>
                  )}
                </>
              )}

              {/* ── Select members from group ── */}
              {addMode === 'select_members' && (
                <>
                  <div>
                    <label className="text-xs font-bold text-text-muted block mb-2">Group</label>
                    <Select
                      value={selectedGroup?.id ?? ''}
                      onValueChange={(id) => {
                        const g = groups.find((x) => x.id === id)
                        setSelectedGroup(g ? { id: g.id, name: g.name } : null)
                        setParticipants([])
                      }}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Select group" />
                      </SelectTrigger>
                      <SelectContent>
                        {groups.map((g) => (
                          <SelectItem key={g.id} value={g.id}>
                            {g.avatar_emoji} {g.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedGroup && (
                    <div>
                      <p className="text-xs font-bold text-text-muted uppercase mb-2">
                        Members — {participants.length} selected
                      </p>
                      <div className="space-y-2 max-h-52 overflow-y-auto">
                        {groupMembers.map((m) => {
                          const selected = participants.some((p) => p.user_id === m.user_id)
                          return (
                            <button
                              key={m.user_id}
                              onClick={() => toggleParticipant(m)}
                              className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                                selected
                                  ? 'border-accent-green bg-accent-green/10'
                                  : 'border-border-subtle bg-bg-card'
                              }`}
                            >
                              <div className="w-9 h-9 rounded-full overflow-hidden bg-bg-elevated shrink-0">
                                <img src={m.profile.avatar_url ?? ''} alt="" className="w-full h-full object-cover" />
                              </div>
                              <span className="font-bold text-text-primary text-sm flex-1 text-left">
                                {m.profile.display_name}
                              </span>
                              <span className={`text-sm font-black ${selected ? 'text-accent-green' : 'text-border-subtle'}`}>
                                {selected ? '✓' : '+'}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ── Individual participants (friends list) ── */}
              {addMode === 'friends' && (
                <>
                  <div>
                    <label className="text-xs font-bold text-text-muted block mb-2">Post competition to group</label>
                    <Select
                      value={competitionGroupId ?? ''}
                      onValueChange={(id) => setCompetitionGroupId(id || null)}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Select group" />
                      </SelectTrigger>
                      <SelectContent>
                        {groups.map((g) => (
                          <SelectItem key={g.id} value={g.id}>
                            {g.avatar_emoji} {g.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-text-muted uppercase mb-2">
                      Friends — {participants.length} selected
                    </p>
                    <div className="space-y-2 max-h-52 overflow-y-auto">
                      {friendsList.length === 0 ? (
                        <p className="text-sm text-text-muted py-4 text-center">Loading friends…</p>
                      ) : (
                        friendsList.map((m) => {
                          const selected = participants.some((p) => p.user_id === m.user_id)
                          return (
                            <button
                              key={m.user_id}
                              onClick={() => toggleParticipant(m)}
                              className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                                selected
                                  ? 'border-accent-green bg-accent-green/10'
                                  : 'border-border-subtle bg-bg-card'
                              }`}
                            >
                              <div className="w-9 h-9 rounded-full overflow-hidden bg-bg-elevated shrink-0">
                                <img src={m.profile.avatar_url ?? ''} alt="" className="w-full h-full object-cover" />
                              </div>
                              <span className="font-bold text-text-primary text-sm flex-1 text-left">
                                {m.profile.display_name}
                              </span>
                              <span className={`text-sm font-black ${selected ? 'text-accent-green' : 'text-border-subtle'}`}>
                                {selected ? '✓' : '+'}
                              </span>
                            </button>
                          )
                        })
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* ── Selected participants chip strip ── */}
              {participants.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
                    Competing ({participants.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {participants.map((p) => (
                      <button
                        key={p.user_id}
                        onClick={() => toggleParticipant(p)}
                        className="flex items-center gap-1.5 bg-accent-green/15 text-accent-green text-xs font-bold px-2.5 py-1 rounded-full border border-accent-green/30"
                      >
                        {p.profile.display_name}
                        <span className="text-accent-green/60 text-[10px] font-black">×</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Dates ── */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-text-muted uppercase block mb-2">Start date</label>
                  <input
                    type="date"
                    value={toDateString(startDate)}
                    min={todayStr}
                    onChange={(e) => {
                      const d = new Date(e.target.value + 'T00:00:00')
                      if (isNaN(d.getTime())) return
                      setStartDate(d)
                      if (d >= endDate) {
                        const newEnd = new Date(d)
                        newEnd.setDate(newEnd.getDate() + 7)
                        setEndDate(newEnd)
                      }
                    }}
                    className="w-full h-12 px-4 rounded-xl bg-bg-elevated text-text-primary border border-border-subtle text-sm font-bold appearance-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-text-muted uppercase block mb-2">End date</label>
                  <input
                    type="date"
                    value={toDateString(endDate)}
                    min={toDateString(new Date(startDate.getTime() + 86400000))}
                    onChange={(e) => {
                      const d = new Date(e.target.value + 'T00:00:00')
                      if (isNaN(d.getTime())) return
                      setEndDate(d)
                    }}
                    className="w-full h-12 px-4 rounded-xl bg-bg-elevated text-text-primary border border-border-subtle text-sm font-bold appearance-none"
                  />
                </div>

                {/* Duration summary */}
                <div className="bg-bg-card rounded-xl border border-border-subtle p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-text-muted">From</p>
                      <p className="text-sm font-bold text-text-primary">{format(startDate, 'MMM d, yyyy')}</p>
                    </div>
                    <span className="text-text-muted">→</span>
                    <div className="text-right">
                      <p className="text-xs text-text-muted">To</p>
                      <p className="text-sm font-bold text-text-primary">{format(endDate, 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border-subtle text-center">
                    <span className="text-sm font-bold text-accent-green">
                      {(() => {
                        const days = activeDays
                        if (days < 7) return `${days} day${days !== 1 ? 's' : ''}`
                        const weeks = Math.floor(days / 7)
                        const remaining = days % 7
                        return `${weeks} week${weeks !== 1 ? 's' : ''}${remaining > 0 ? ` ${remaining} day${remaining !== 1 ? 's' : ''}` : ''}`
                      })()}
                    </span>
                  </div>
                </div>
              </div>

              {error && <p className="text-destructive text-sm">{error}</p>}

              <PrimaryButton
                onClick={handleStep2Next}
                disabled={participants.length === 0 || (addMode === 'friends' && !competitionGroupId)}
              >
                Next
              </PrimaryButton>
            </motion.div>
          )}

          {/* ─── Step 3 — Stakes + Scoring + Privacy ─── */}
          {step === 3 && (
            <motion.div
              key="s3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted">
                Prize / punishment stake
              </h2>

              {/* Stake type */}
              <div className="flex gap-2">
                {(['money', 'punishment', 'both'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setStakeType(t)}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm ${
                      stakeType === t ? 'bg-accent-green text-white' : 'bg-bg-elevated text-text-muted'
                    }`}
                  >
                    {t === 'money' ? '💵 Money' : t === 'punishment' ? '🔥 Punishment' : '💵🔥 Both'}
                  </button>
                ))}
              </div>

              {/* Money presets */}
              {(stakeType === 'money' || stakeType === 'both') && (
                <div className="flex gap-2 flex-wrap">
                  {STAKE_PRESETS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setStakeMoney(c)}
                      className={`px-4 py-2 rounded-full font-bold text-sm ${
                        stakeMoney === c ? 'bg-accent-green text-white' : 'bg-bg-elevated text-text-primary'
                      }`}
                    >
                      {formatMoney(c)}
                    </button>
                  ))}
                </div>
              )}

              {/* Punishment text input */}
              {(stakeType === 'punishment' || stakeType === 'both') && (
                <div className="space-y-3">
                  <div className="relative">
                    <textarea
                      value={punishmentText}
                      onChange={(e) => {
                        const val = e.target.value.slice(0, 120)
                        setPunishmentText(val)
                        setPunishmentEdited(true)
                        // User is typing custom text
                        setStakePunishmentId(null)
                      }}
                      placeholder="Enter a punishment for the loser..."
                      className={`w-full h-24 rounded-xl bg-bg-elevated border border-border-subtle p-4 text-sm resize-none ${
                        punishmentEdited ? 'text-text-primary' : 'text-text-muted'
                      }`}
                      onFocus={() => {
                        if (!punishmentEdited) {
                          // Select all text so user can easily overwrite
                          const el = document.activeElement as HTMLTextAreaElement
                          el?.select()
                        }
                      }}
                      maxLength={120}
                    />
                    <p className="text-right text-xs text-text-muted mt-1">{punishmentText.length}/120</p>
                  </div>
                  <button
                    onClick={randomizePunishment}
                    className="w-full py-2.5 rounded-xl border border-border-subtle text-text-muted text-sm font-bold flex items-center justify-center gap-2"
                  >
                    🎲 Randomize punishment
                  </button>
                </div>
              )}

              {/* Scoring method */}
              <div>
                <p className="text-xs font-bold text-text-muted uppercase mb-2">Scoring method</p>
                <div className="flex gap-2">
                  {([
                    { id: 'self_reported', label: 'Self-reported' },
                    { id: 'group_verified', label: 'Group verified' },
                  ] as const).map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => setScoringMethod(id)}
                      className={`flex-1 py-3 rounded-xl font-bold text-sm ${
                        scoringMethod === id ? 'bg-accent-green text-white' : 'bg-bg-elevated text-text-muted'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Public/Private */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-text-primary">Public competition</span>
                  <p className="text-xs text-text-muted mt-0.5">
                    {isPublic ? 'Visible on participant profiles' : 'Only participants can see this'}
                  </p>
                </div>
                <button
                  onClick={() => setIsPublic(!isPublic)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${isPublic ? 'bg-accent-green' : 'bg-bg-elevated'}`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${isPublic ? 'left-6' : 'left-1'}`}
                  />
                </button>
              </div>

              {error && <p className="text-destructive text-sm">{error}</p>}

              <PrimaryButton onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Competition 🏆'}
              </PrimaryButton>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ─── Challenge structure templates dialog ─── */}
      <Dialog open={templatesOpen} onOpenChange={setTemplatesOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>✨ Challenge structures</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-text-muted -mt-2 mb-3">
            Pick a starting format — then edit it to fit your competition.
          </p>
          <div className="space-y-2">
            {COMPETITION_TEMPLATES.map((t) => {
              const challengeText = METRIC_STRUCTURES[t.metricTemplateIdx]?.(t.fill) ?? t.fill
              return (
                <button
                  key={t.title}
                  onClick={() => {
                    setMetric(challengeText)
                    setTemplatesOpen(false)
                  }}
                  className="w-full text-left p-3 rounded-xl bg-bg-elevated hover:bg-accent-green/20 hover:text-accent-green transition-colors group"
                >
                  <p className="font-bold text-sm text-text-primary group-hover:text-accent-green">
                    {challengeText}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">{t.title}</p>
                </button>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Fun Contract modal ─── */}
      {createdComp && (
        <FunContractModal
          open={contractOpen}
          onClose={() => setContractOpen(false)}
          title={title}
          wager={{
            money: stakeType === 'money' || stakeType === 'both' ? stakeMoney : null,
            punishment: punishmentText.trim() || null,
          }}
          validUntil={endDate.toISOString()}
          participants={participants.map((m) => ({
            id: m.user_id,
            name: m.profile.display_name,
            avatarUrl: m.profile.avatar_url,
          }))}
          groupName={
            addMode !== 'friends'
              ? selectedGroup?.name
              : groups.find((g) => g.id === competitionGroupId)?.name
          }
          detailPath={`/compete/${createdComp.id}`}
        />
      )}
    </div>
  )
}
