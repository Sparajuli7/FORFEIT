import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { ChevronLeft } from 'lucide-react'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'motion/react'
import { createCompetition } from '@/lib/api/competitions'
import { getGroupMembersWithProfiles } from '@/lib/api/groups'
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

  // Step 1
  const [title, setTitle] = useState('')
  const [templatesOpen, setTemplatesOpen] = useState(false)

  // Step 2
  const [metricTemplate, setMetricTemplate] = useState(0)
  const [metricFill, setMetricFill] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<{ id: string; name: string } | null>(null)
  const [groupMembers, setGroupMembers] = useState<GroupMemberWithProfile[]>([])
  const [participants, setParticipants] = useState<GroupMemberWithProfile[]>([])

  const [startDate, setStartDate] = useState<Date>(() => new Date())
  const [endDate, setEndDate] = useState<Date>(() => {
    const d = new Date()
    d.setMonth(d.getMonth() + 1)
    return d
  })

  // Step 3
  const [scoringMethod, setScoringMethod] = useState<'self_reported' | 'group_verified'>('self_reported')
  const [stakeType, setStakeType] = useState<StakeType>('money')
  const [stakeMoney, setStakeMoney] = useState(2000)
  const [stakePunishmentId, setStakePunishmentId] = useState<string | null>(null)
  const [stakeCustomPunishment, setStakeCustomPunishment] = useState<string | null>(null)
  const [punishments, setPunishments] = useState<{ id: string; text: string }[]>([])
  const [customPunishmentOpen, setCustomPunishmentOpen] = useState(false)
  const [customPunishmentText, setCustomPunishmentText] = useState('')
  const [isPublic, setIsPublic] = useState(true)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fun contract
  const [createdComp, setCreatedComp] = useState<Competition | null>(null)
  const [contractOpen, setContractOpen] = useState(false)

  const metric =
    METRIC_TEMPLATES[metricTemplate].prefix +
    (metricFill || METRIC_TEMPLATES[metricTemplate].placeholder) +
    METRIC_TEMPLATES[metricTemplate].suffix

  const toDateString = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  const todayStr = toDateString(new Date())
  const activeDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  // Auto-select single group
  useEffect(() => {
    if (!selectedGroup && groups.length === 1) {
      const g = groups[0]
      setSelectedGroup({ id: g.id, name: g.name })
    }
  }, [groups, selectedGroup])

  // When group changes, auto-add all members
  useEffect(() => {
    if (selectedGroup?.id) {
      getGroupMembersWithProfiles(selectedGroup.id).then((members) => {
        setGroupMembers(members)
        setParticipants(members)
      })
    } else {
      setGroupMembers([])
      setParticipants([])
    }
  }, [selectedGroup?.id])

  useEffect(() => {
    getApprovedPunishments().then((p) =>
      setPunishments(p.map((x) => ({ id: x.id, text: x.text }))),
    )
  }, [])

  const handleBack = () => {
    if (step === 1) navigate(-1)
    else setStep((s) => s - 1)
  }

  const handleStep1Next = () => {
    if (!title.trim()) return
    setStep(2)
  }

  const handleStep2Next = () => {
    if (!selectedGroup) {
      setError('Please select a group.')
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
    if (!title.trim()) {
      setError('Please add a title.')
      return
    }
    if (!selectedGroup) {
      setError('Please select a group.')
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
        groupId: selectedGroup.id,
        category: 'fitness',
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

          {/* ─── Step 1 — Title ─── */}
          {step === 1 && (
            <motion.div
              key="s1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-[32px] font-extrabold text-white" style={{ letterSpacing: '-0.02em' }}>
                  Competition title
                </h2>
                <button
                  onClick={() => navigate('/bet/create')}
                  className="text-xs text-text-muted mt-1 underline underline-offset-2"
                >
                  Personal challenge instead →
                </button>
              </div>

              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 140))}
                placeholder="e.g. Most Gym Sessions — February"
                className="h-12 bg-bg-elevated"
                maxLength={140}
              />
              <p className="text-xs text-text-muted -mt-4">{title.length}/140</p>

              <button
                onClick={() => setTemplatesOpen(true)}
                className="flex items-center gap-1.5 text-accent-green font-bold text-sm"
              >
                ✨ Browse Templates
              </button>

              <PrimaryButton onClick={handleStep1Next} disabled={!title.trim()}>
                Next
              </PrimaryButton>
            </motion.div>
          )}

          {/* ─── Step 2 — Metric + Group + Dates ─── */}
          {step === 2 && (
            <motion.div
              key="s2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-[32px] font-extrabold text-white" style={{ letterSpacing: '-0.02em' }}>
                Set the challenge
              </h2>

              {/* Metric structure chips */}
              <div>
                <p className="text-xs font-bold text-text-muted uppercase mb-2">Structure</p>
                <div className="flex flex-wrap gap-2">
                  {METRIC_TEMPLATES.map((t, i) => (
                    <button
                      key={i}
                      onClick={() => setMetricTemplate(i)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold ${
                        metricTemplate === i ? 'bg-accent-green text-white' : 'bg-bg-elevated text-text-muted'
                      }`}
                    >
                      {t.prefix.trim()}…{t.suffix}
                    </button>
                  ))}
                </div>
              </div>

              {/* Metric fill */}
              <div>
                <label className="text-xs font-bold text-text-muted block mb-2">Metric</label>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-text-muted text-sm">{METRIC_TEMPLATES[metricTemplate].prefix}</span>
                  <Input
                    value={metricFill}
                    onChange={(e) => setMetricFill(e.target.value)}
                    placeholder={METRIC_TEMPLATES[metricTemplate].placeholder}
                    className="flex-1 min-w-[120px] h-10"
                  />
                  <span className="text-text-muted text-sm">{METRIC_TEMPLATES[metricTemplate].suffix}</span>
                </div>
              </div>

              {/* Group selector */}
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

                {/* Avatar cluster + member count */}
                {participants.length > 0 && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex -space-x-2">
                      {participants.slice(0, 4).map((p) => (
                        <div
                          key={p.user_id}
                          className="w-8 h-8 rounded-full border-2 border-bg-primary overflow-hidden bg-bg-elevated"
                        >
                          <img
                            src={p.profile.avatar_url ?? ''}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                      {participants.length > 4 && (
                        <div className="w-8 h-8 rounded-full border-2 border-bg-primary bg-bg-elevated flex items-center justify-center text-[10px] font-bold text-text-muted">
                          +{participants.length - 4}
                        </div>
                      )}
                    </div>
                    <span className="text-sm text-text-muted">
                      {participants.length} member{participants.length !== 1 ? 's' : ''} added
                    </span>
                  </div>
                )}
              </div>

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

              {error && <p className="text-destructive text-sm">{error}</p>}

              <PrimaryButton onClick={handleStep2Next} disabled={!selectedGroup}>
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

              {/* Punishment chips */}
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
                    onClick={() => setCustomPunishmentOpen(true)}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-bg-elevated text-accent-green"
                  >
                    Custom +
                  </button>
                  {stakeCustomPunishment && (
                    <div className="w-full text-xs text-accent-green font-medium px-1">
                      Custom: {stakeCustomPunishment}
                    </div>
                  )}
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

      {/* Competition Templates dialog */}
      <Dialog open={templatesOpen} onOpenChange={setTemplatesOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>✨ Competition Templates</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            {COMPETITION_TEMPLATES.map((t) => (
              <button
                key={t.title}
                onClick={() => {
                  setTitle(t.title)
                  setMetricTemplate(t.metricTemplateIdx)
                  setMetricFill(t.fill)
                  setTemplatesOpen(false)
                }}
                className="w-full text-left p-3 rounded-xl bg-bg-elevated text-text-primary text-sm hover:bg-accent-green/20 hover:text-accent-green transition-colors"
              >
                {t.title}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Custom punishment dialog */}
      <Dialog open={customPunishmentOpen} onOpenChange={setCustomPunishmentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Custom Punishment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              value={customPunishmentText}
              onChange={(e) => setCustomPunishmentText(e.target.value.slice(0, 120))}
              placeholder="e.g. Loser buys everyone dinner..."
              className="h-12"
            />
            <p className="text-xs text-text-muted">{customPunishmentText.length}/120</p>
            <PrimaryButton
              onClick={() => {
                const text = customPunishmentText.trim()
                if (text) {
                  setStakePunishmentId(null)
                  setStakeCustomPunishment(text)
                }
                setCustomPunishmentOpen(false)
                setCustomPunishmentText('')
              }}
              disabled={!customPunishmentText.trim()}
            >
              Use Punishment
            </PrimaryButton>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fun Contract modal */}
      {createdComp && (
        <FunContractModal
          open={contractOpen}
          onClose={() => {
            setContractOpen(false)
          }}
          title={title}
          wager={{
            money: stakeType === 'money' || stakeType === 'both' ? stakeMoney : null,
            punishment:
              stakeCustomPunishment ??
              (stakePunishmentId ? punishments.find((p) => p.id === stakePunishmentId)?.text ?? null : null),
          }}
          validUntil={endDate.toISOString()}
          participants={participants.map((m) => ({
            id: m.user_id,
            name: m.profile.display_name,
            avatarUrl: m.profile.avatar_url,
          }))}
          groupName={selectedGroup?.name}
          detailPath={`/compete/${createdComp.id}`}
        />
      )}
    </div>
  )
}
