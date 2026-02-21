import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { ChevronLeft } from 'lucide-react'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'motion/react'
import { createCompetition } from '@/lib/api/competitions'
import { getGroupMembersWithProfiles, getAllGroupMembersForUser } from '@/lib/api/groups'
import { getApprovedPunishments } from '@/lib/api/punishments'
import { STAKE_PRESETS, BET_CATEGORIES } from '@/lib/utils/constants'
import { formatMoney } from '@/lib/utils/formatters'
import type { BetCategory, StakeType } from '@/lib/database.types'
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

const METRIC_TEMPLATES = [
  { prefix: 'Who can ', suffix: ' the most?', placeholder: 'do push-ups' },
  { prefix: 'Who can ', suffix: ' the fastest?', placeholder: 'run a mile' },
  { prefix: 'Who can ', suffix: ' the least?', placeholder: 'eat takeout' },
  { prefix: 'Most ', suffix: ' wins', placeholder: 'gym sessions' },
  { prefix: 'Highest ', suffix: ' wins', placeholder: 'step count' },
]

export function CompetitionCreateScreen() {
  const navigate = useNavigate()
  const groups = useGroupStore((s) => s.groups)
  const fetchGroups = useGroupStore((s) => s.fetchGroups)

  const [step, setStep] = useState(1)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<BetCategory>('fitness')
  const [metricTemplate, setMetricTemplate] = useState(0)
  const [metricFill, setMetricFill] = useState('')
  const [participantSource, setParticipantSource] = useState<'groups' | 'friends'>('groups')
  const [groupSelectMode, setGroupSelectMode] = useState<'whole' | 'individuals'>('individuals')
  const [selectedGroup, setSelectedGroup] = useState<{ id: string; name: string } | null>(null)
  const [participants, setParticipants] = useState<GroupMemberWithProfile[]>([])
  const [groupMembers, setGroupMembers] = useState<GroupMemberWithProfile[]>([])
  const [friendsList, setFriendsList] = useState<GroupMemberWithProfile[]>([])
  const [competitionGroupId, setCompetitionGroupId] = useState<string | null>(null)

  const [startDate, setStartDate] = useState<Date>(() => new Date())
  const [endDate, setEndDate] = useState<Date>(() => {
    const d = new Date()
    d.setMonth(d.getMonth() + 1)
    return d
  })
  const [recurrence, setRecurrence] = useState(false)

  const [scoringMethod, setScoringMethod] = useState<'self_reported' | 'group_verified'>('self_reported')

  const [stakeType, setStakeType] = useState<StakeType>('money')
  const [stakeMoney, setStakeMoney] = useState(2000)
  const [stakePunishmentId, setStakePunishmentId] = useState<string | null>(null)
  const [stakeCustomPunishment, setStakeCustomPunishment] = useState<string | null>(null)
  const [punishments, setPunishments] = useState<{ id: string; text: string }[]>([])

  const [isPublic, setIsPublic] = useState(true)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const metric =
    METRIC_TEMPLATES[metricTemplate].prefix +
    (metricFill || METRIC_TEMPLATES[metricTemplate].placeholder) +
    METRIC_TEMPLATES[metricTemplate].suffix

  // Helper: Date <-> YYYY-MM-DD string for native date inputs
  const toDateString = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  const todayStr = toDateString(new Date())

  // Duration presets that set endDate relative to startDate
  const DURATION_PRESETS = [
    { label: '1 week', days: 7 },
    { label: '2 weeks', days: 14 },
    { label: '1 month', days: 30 },
    { label: '3 months', days: 90 },
  ]
  const activeDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  useEffect(() => {
    if (selectedGroup?.id) {
      getGroupMembersWithProfiles(selectedGroup.id).then(setGroupMembers)
    } else {
      setGroupMembers([])
    }
  }, [selectedGroup?.id])

  useEffect(() => {
    if (participantSource === 'friends') {
      getAllGroupMembersForUser().then(setFriendsList)
    }
  }, [participantSource])

  useEffect(() => {
    getApprovedPunishments().then((p) =>
      setPunishments(p.map((x) => ({ id: x.id, text: x.text }))),
    )
  }, [])

  const toggleParticipant = (m: GroupMemberWithProfile) => {
    setParticipants((prev) =>
      prev.some((p) => p.user_id === m.user_id)
        ? prev.filter((p) => p.user_id !== m.user_id)
        : [...prev, m],
    )
  }

  const addWholeGroup = () => {
    if (!selectedGroup || groupMembers.length === 0) return
    setParticipants((prev) => {
      const existingIds = new Set(prev.map((p) => p.user_id))
      const toAdd = groupMembers.filter((m) => !existingIds.has(m.user_id))
      return [...prev, ...toAdd]
    })
  }

  const resolvedGroupId = participantSource === 'friends' ? competitionGroupId : selectedGroup?.id

  const handleBack = () => {
    if (step === 1) navigate(-1)
    else setStep((s) => s - 1)
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Please add a title.')
      return
    }
    if (!resolvedGroupId) {
      setError(participantSource === 'friends' ? 'Please select a group to post this competition to.' : 'Please select a group and add participants.')
      return
    }
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)
    if (end <= new Date()) {
      setError('End date must be in the future.')
      return
    }
    if ((stakeType === 'money' || stakeType === 'both') && (!stakeMoney || stakeMoney <= 0)) {
      setError('Please set a money stake.')
      return
    }
    if ((stakeType === 'punishment' || stakeType === 'both') && !stakePunishmentId && !stakeCustomPunishment) {
      setError('Please select a punishment.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      const comp = await createCompetition({
        title: title.trim(),
        groupId: resolvedGroupId,
        category,
        metric,
        participantIds: participants.map((p) => p.user_id),
        startDate: startDate.toISOString(),
        deadline: end.toISOString(),
        scoringMethod,
        stakeType,
        stakeMoney: stakeType === 'money' || stakeType === 'both' ? stakeMoney : undefined,
        stakePunishmentId: stakePunishmentId ?? undefined,
        stakeCustomPunishment: stakeCustomPunishment,
        isPublic,
      })
      navigate(`/compete/${comp.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create competition')
    } finally {
      setIsSubmitting(false)
    }
  }

  const progressPct = (step / 5) * 100

  return (
    <div className="h-full bg-bg-primary grain-texture flex flex-col">
      <div className="px-6 pt-8 pb-4 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <button onClick={handleBack} className="text-text-primary p-1 -m-1">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-xs font-bold text-text-muted tabular-nums">{step} of 5</span>
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
          {step === 1 && (
            <motion.div
              key="s1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-[32px] font-extrabold text-white" style={{ letterSpacing: '-0.02em' }}>
                Competition title
              </h2>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 140))}
                placeholder="e.g. Most Gym Sessions — February"
                className="h-12 bg-bg-elevated"
                maxLength={140}
              />
              <p className="text-xs text-text-muted">{title.length}/140</p>

              <div>
                <p className="text-xs font-bold text-text-muted uppercase mb-2">Category</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.entries(BET_CATEGORIES) as [BetCategory, { label: string; emoji: string }][]).map(
                    ([key, { label, emoji }]) => (
                      <button
                        key={key}
                        onClick={() => setCategory(key)}
                        className={`px-4 py-2 rounded-xl font-bold text-sm ${
                          category === key ? 'bg-accent-green text-white' : 'bg-bg-elevated text-text-muted'
                        }`}
                      >
                        {emoji} {label}
                      </button>
                    ),
                  )}
                </div>
              </div>

              <PrimaryButton onClick={() => setStep(2)} disabled={!title.trim()}>
                Next
              </PrimaryButton>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="s2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-[32px] font-extrabold text-white" style={{ letterSpacing: '-0.02em' }}>
                Who can ___ the most/fastest/least?
              </h2>

              <div className="flex flex-wrap gap-2">
                {METRIC_TEMPLATES.map((t, i) => (
                  <button
                    key={i}
                    onClick={() => setMetricTemplate(i)}
                    className={`px-3 py-2 rounded-xl text-sm font-bold ${
                      metricTemplate === i ? 'bg-accent-green text-white' : 'bg-bg-elevated text-text-muted'
                    }`}
                  >
                    {t.prefix.trim()}…{t.suffix}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-xs font-bold text-text-muted block mb-2">Metric</label>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-text-muted">{METRIC_TEMPLATES[metricTemplate].prefix}</span>
                  <Input
                    value={metricFill}
                    onChange={(e) => setMetricFill(e.target.value)}
                    placeholder={METRIC_TEMPLATES[metricTemplate].placeholder}
                    className="flex-1 min-w-[120px] h-10"
                  />
                  <span className="text-text-muted">{METRIC_TEMPLATES[metricTemplate].suffix}</span>
                </div>
              </div>

              <div className="border-t border-border-subtle pt-4">
                <p className="text-xs text-text-muted mb-3">Or make this a personal challenge instead</p>
                <button
                  onClick={() => navigate('/bet/create')}
                  className="w-full py-3 rounded-xl font-bold text-sm bg-bg-elevated text-accent-green border border-accent-green/40 hover:bg-accent-green/10 transition-colors"
                >
                  Personal Challenge
                </button>
              </div>

              <PrimaryButton onClick={() => setStep(3)}>Next</PrimaryButton>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="s3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-[32px] font-extrabold text-white" style={{ letterSpacing: '-0.02em' }}>
                Participants
              </h2>

              <div>
                <p className="text-xs font-bold text-text-muted uppercase mb-2">Add from</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setParticipantSource('groups')}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm ${
                      participantSource === 'groups' ? 'bg-accent-green text-white' : 'bg-bg-elevated text-text-muted'
                    }`}
                  >
                    Within groups
                  </button>
                  <button
                    onClick={() => setParticipantSource('friends')}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm ${
                      participantSource === 'friends' ? 'bg-accent-green text-white' : 'bg-bg-elevated text-text-muted'
                    }`}
                  >
                    List of friends
                  </button>
                </div>
              </div>

              {participantSource === 'groups' && (
                <>
                  <div>
                    <p className="text-xs font-bold text-text-muted uppercase mb-2">Select by</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setGroupSelectMode('whole')}
                        className={`flex-1 py-3 rounded-xl font-bold text-sm ${
                          groupSelectMode === 'whole' ? 'bg-accent-green text-white' : 'bg-bg-elevated text-text-muted'
                        }`}
                      >
                        Whole group
                      </button>
                      <button
                        onClick={() => setGroupSelectMode('individuals')}
                        className={`flex-1 py-3 rounded-xl font-bold text-sm ${
                          groupSelectMode === 'individuals' ? 'bg-accent-green text-white' : 'bg-bg-elevated text-text-muted'
                        }`}
                      >
                        Individual members
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-text-muted block mb-2">Group</label>
                    <Select
                      value={selectedGroup?.id ?? ''}
                      onValueChange={(id) => {
                        const g = groups.find((x) => x.id === id)
                        setSelectedGroup(g ? { id: g.id, name: g.name } : null)
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

                  {groupSelectMode === 'whole' ? (
                    <div>
                      <p className="text-xs font-bold text-text-muted uppercase mb-2">
                        Add entire group at once ({participants.length} participants selected total)
                      </p>
                      <button
                        onClick={addWholeGroup}
                        disabled={!selectedGroup || groupMembers.length === 0}
                        className="w-full py-3 rounded-xl font-bold text-sm bg-accent-green/20 text-accent-green border border-accent-green/40 disabled:opacity-50"
                      >
                        Add whole group {selectedGroup ? `(${groupMembers.length} members)` : ''}
                      </button>
                      {participants.length > 0 && (
                        <p className="text-xs text-text-muted mt-2">
                          You can change the group above and add another whole group.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-bold text-text-muted uppercase mb-2">
                        Select participants ({participants.length} selected)
                      </p>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {groupMembers.map((m) => {
                          const selected = participants.some((p) => p.user_id === m.user_id)
                          return (
                            <button
                              key={m.user_id}
                              onClick={() => toggleParticipant(m)}
                              className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                                selected ? 'border-accent-green bg-accent-green/10' : 'border-border-subtle bg-bg-card'
                              }`}
                            >
                              <div className="w-10 h-10 rounded-full overflow-hidden bg-bg-elevated">
                                <img
                                  src={m.profile.avatar_url ?? ''}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <span className="font-bold text-text-primary">{m.profile.display_name}</span>
                              {selected && <span className="text-accent-green ml-auto">✓</span>}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

              {participantSource === 'friends' && (
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
                      Select friends ({participants.length} selected)
                    </p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {friendsList.map((m) => {
                        const selected = participants.some((p) => p.user_id === m.user_id)
                        return (
                          <button
                            key={m.user_id}
                            onClick={() => toggleParticipant(m)}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                              selected ? 'border-accent-green bg-accent-green/10' : 'border-border-subtle bg-bg-card'
                            }`}
                          >
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-bg-elevated">
                              <img
                                src={m.profile.avatar_url ?? ''}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <span className="font-bold text-text-primary">{m.profile.display_name}</span>
                            {selected && <span className="text-accent-green ml-auto">✓</span>}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}

              <PrimaryButton
                onClick={() => setStep(4)}
                disabled={
                  participants.length === 0 ||
                  (participantSource === 'friends' && !competitionGroupId)
                }
              >
                Next
              </PrimaryButton>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="s4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-[32px] font-extrabold text-white" style={{ letterSpacing: '-0.02em' }}>
                Timeframe
              </h2>

              {/* Start date */}
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

              {/* End date */}
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

              {/* Quick duration presets */}
              <div>
                <p className="text-xs font-bold text-text-muted uppercase mb-2">Quick set duration</p>
                <div className="flex flex-wrap gap-2">
                  {DURATION_PRESETS.map((preset) => (
                    <button
                      key={preset.days}
                      onClick={() => {
                        const newEnd = new Date(startDate)
                        newEnd.setDate(newEnd.getDate() + preset.days)
                        setEndDate(newEnd)
                      }}
                      className={`px-4 py-2 rounded-full font-bold text-sm transition-colors ${
                        activeDays === preset.days
                          ? 'bg-accent-green text-white'
                          : 'bg-bg-elevated text-text-muted'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
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

              <div className="flex items-center justify-between">
                <span className="text-sm text-text-primary">Recurring</span>
                <button
                  onClick={() => setRecurrence(!recurrence)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${recurrence ? 'bg-accent-green' : 'bg-bg-elevated'}`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${recurrence ? 'left-6' : 'left-1'}`}
                  />
                </button>
              </div>

              <div>
                <p className="text-xs font-bold text-text-muted uppercase mb-2">Scoring method</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setScoringMethod('self_reported')}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm ${
                      scoringMethod === 'self_reported' ? 'bg-accent-green text-white' : 'bg-bg-elevated text-text-muted'
                    }`}
                  >
                    Self-reported with proof
                  </button>
                  <button
                    onClick={() => setScoringMethod('group_verified')}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm ${
                      scoringMethod === 'group_verified' ? 'bg-accent-green text-white' : 'bg-bg-elevated text-text-muted'
                    }`}
                  >
                    Group verified
                  </button>
                </div>
              </div>

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

              <PrimaryButton onClick={() => setStep(5)}>Next</PrimaryButton>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div
              key="s5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted">
                Prize / punishment stake
              </h2>

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

              {(stakeType === 'punishment' || stakeType === 'both') && (
                <div className="flex flex-wrap gap-2">
                  {punishments.slice(0, 6).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setStakePunishmentId(p.id)
                        setStakeCustomPunishment(null)
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-bold ${
                        stakePunishmentId === p.id ? 'bg-accent-green text-white' : 'bg-bg-elevated text-text-muted'
                      }`}
                    >
                      {p.text.slice(0, 35)}…
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      setStakePunishmentId(null)
                      const text = prompt('Enter custom punishment:')
                      setStakeCustomPunishment(text?.trim() || null)
                    }}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-bg-elevated text-accent-green"
                  >
                    Custom +
                  </button>
                </div>
              )}

              {error && <p className="text-destructive text-sm">{error}</p>}

              <PrimaryButton onClick={handleSubmit} disabled={isSubmitting || !resolvedGroupId}>
                {isSubmitting ? 'Creating...' : 'Create Competition'}
              </PrimaryButton>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
