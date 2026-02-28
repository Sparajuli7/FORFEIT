import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router'
import { ChevronLeft, Shuffle, BookOpen } from 'lucide-react'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'motion/react'
import type { DateRange } from 'react-day-picker'
import { createCompetition } from '@/lib/api/competitions'
import { getGroupMembersWithProfiles, getAllGroupMembersForUser } from '@/lib/api/groups'
import { getApprovedPunishments, createPunishment } from '@/lib/api/punishments'
import { getBetDetail } from '@/lib/api/bets'
import { STAKE_PRESETS, COMPETITION_TEMPLATES } from '@/lib/utils/constants'
import { formatMoney } from '@/lib/utils/formatters'
import type { StakeType, PunishmentCard, Bet } from '@/lib/database.types'
import type { GroupMemberWithProfile } from '@/lib/api/groups'
import { useGroupStore, useAuthStore } from '@/stores'
import { PrimaryButton } from '../components/PrimaryButton'
import { Input } from '../components/ui/input'
import { Calendar } from '../components/ui/calendar'
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

const METRIC_STRUCTURES = [
  (fill: string) => `Who can ${fill} the most?`,
  (fill: string) => `Who can ${fill} the fastest?`,
  (fill: string) => `Who can ${fill} the least?`,
  (fill: string) => `Most ${fill} wins`,
  (fill: string) => `Highest ${fill} wins`,
]

type AddMode = 'whole_group' | 'select_members' | 'friends' | 'solo' | 'one_v_one'

export function CompetitionCreateScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const groups = useGroupStore((s) => s.groups)
  const fetchGroups = useGroupStore((s) => s.fetchGroups)
  const currentProfile = useAuthStore((s) => s.profile)

  const [step, setStep] = useState(1)

  // ── Step 1 ──────────────────────────────────────────────────────────────────
  const [title, setTitle] = useState('')
  const [metric, setMetric] = useState('')
  const [creatorSide, setCreatorSide] = useState<'rider' | 'doubter' | null>(null)
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [step1Error, setStep1Error] = useState<string | null>(null)

  // ── Step 2 ──────────────────────────────────────────────────────────────────
  const [addMode, setAddMode] = useState<AddMode>('whole_group')
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
  const [stakeType, setStakeType] = useState<StakeType>('punishment')
  const [stakeMoney, setStakeMoney] = useState(2000)
  const [stakePunishmentId, setStakePunishmentId] = useState<string | null>(null)
  const [selectedPunishmentCard, setSelectedPunishmentCard] = useState<PunishmentCard | null>(null)
  const [punishments, setPunishments] = useState<PunishmentCard[]>([])
  const [punishmentText, setPunishmentText] = useState('')
  const [punishmentEdited, setPunishmentEdited] = useState(false)
  const [moneyInput, setMoneyInput] = useState('20.00')
  const [isPublic, setIsPublic] = useState(true)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // ── Template / Remix ─────────────────────────────────────────────────────────
  const templateBetId = (location.state as { templateBetId?: string } | null)?.templateBetId
  const [templateBet, setTemplateBet] = useState<Bet | null>(null)
  const templateAppliedRef = useRef(false)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdComp, setCreatedComp] = useState<Bet | null>(null)
  const [contractOpen, setContractOpen] = useState(false)

  // The group ID used when creating the competition
  const resolvedGroupId: string | null =
    addMode === 'friends' || addMode === 'solo' || addMode === 'one_v_one'
      ? competitionGroupId
      : selectedGroup?.id ?? null

  const activeDays = Math.round(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  )

  // ── Effects ──────────────────────────────────────────────────────────────────

  useEffect(() => { fetchGroups() }, [fetchGroups])

  useEffect(() => {
    if (selectedGroup?.id) {
      getGroupMembersWithProfiles(selectedGroup.id).then(setGroupMembers)
    } else {
      setGroupMembers([])
    }
  }, [selectedGroup?.id])

  useEffect(() => {
    if (addMode === 'friends' || addMode === 'one_v_one') {
      getAllGroupMembersForUser().then(setFriendsList)
    }
  }, [addMode])

  // Auto-populate current user as sole participant for solo mode
  useEffect(() => {
    if (addMode === 'solo' && currentProfile) {
      setParticipants([{
        group_id: '',
        user_id: currentProfile.id,
        role: 'member',
        joined_at: new Date().toISOString(),
        profile: {
          id: currentProfile.id,
          display_name: currentProfile.display_name,
          avatar_url: currentProfile.avatar_url ?? null,
        },
      }])
    }
  }, [addMode, currentProfile])

  useEffect(() => {
    getApprovedPunishments().then((p) => {
      setPunishments(p)
      if (p.length > 0 && !punishmentEdited) {
        const random = p[Math.floor(Math.random() * p.length)]
        setPunishmentText(random.text)
        setStakePunishmentId(random.id)
        setSelectedPunishmentCard(random)
      }
    })
  }, [])

  // Fetch template bet for remix
  useEffect(() => {
    if (!templateBetId) return
    getBetDetail(templateBetId).then(setTemplateBet).catch(() => {})
  }, [templateBetId])

  // Apply template once loaded
  useEffect(() => {
    if (!templateBet || templateAppliedRef.current) return
    templateAppliedRef.current = true
    setTitle(templateBet.title.slice(0, 80))
    setMetric((templateBet.comp_metric ?? templateBet.description ?? '').slice(0, 200))
    setStakeType(templateBet.stake_type)
    if (templateBet.stake_money) {
      setStakeMoney(templateBet.stake_money)
      setMoneyInput((templateBet.stake_money / 100).toFixed(2))
    }
    if (templateBet.stake_custom_punishment) {
      setPunishmentText(templateBet.stake_custom_punishment)
      setPunishmentEdited(true)
      setStakePunishmentId(null)
      setSelectedPunishmentCard(null)
    }
    // Compute new date range: same duration as original, starting from now
    const created = new Date(templateBet.created_at).getTime()
    const deadlineMs = new Date(templateBet.deadline).getTime()
    const durationMs = Math.max(deadlineMs - created, 24 * 60 * 60 * 1000)
    const newEnd = new Date(Date.now() + durationMs)
    setStartDate(new Date())
    setEndDate(newEnd)
    // Pre-fill creator's side if bet_sides are present on the fetched bet
    const betWithSides = templateBet as Bet & {
      bet_sides?: Array<{ user_id: string; side: 'rider' | 'doubter' }>
    }
    const prevSide = betWithSides.bet_sides?.find((s) => s.user_id === currentProfile?.id)?.side ?? null
    if (prevSide) setCreatorSide(prevSide)
  }, [templateBet, currentProfile?.id])

  // ── Participant helpers ───────────────────────────────────────────────────────

  const toggleParticipant = (m: GroupMemberWithProfile) => {
    if (addMode === 'one_v_one') {
      // Single-select: replace or deselect
      setParticipants((prev) =>
        prev.some((p) => p.user_id === m.user_id) ? [] : [m],
      )
      return
    }
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
    if (!punishments.length) return
    const random = punishments[Math.floor(Math.random() * punishments.length)]
    setPunishmentText(random.text)
    setStakePunishmentId(random.id)
    setSelectedPunishmentCard(random)
    setPunishmentEdited(false)
  }

  const savePunishmentToLibrary = async () => {
    const text = punishmentText.trim()
    if (!text || isSaving) return
    setIsSaving(true)
    try {
      const card = await createPunishment({
        text,
        category: 'social',
        difficulty: 'medium',
        times_assigned: 0,
        times_completed: 0,
        times_disputed: 0,
        is_community: false,
      })
      setPunishments((prev) => [...prev, card])
      setStakePunishmentId(card.id)
      setSelectedPunishmentCard(card)
    } catch {
      // Text remains valid even if library save fails
    } finally {
      setIsSaving(false)
    }
  }

  // ── Navigation ────────────────────────────────────────────────────────────────

  const handleBack = () => {
    if (step === 1) navigate(-1)
    else setStep((s) => s - 1)
  }

  const handleStep1Next = () => {
    if (!title.trim()) { setStep1Error('Enter a competition name.'); return }
    if (!metric.trim()) { setStep1Error('Describe the challenge.'); return }
    if (!creatorSide) { setStep1Error('Pick your side — Rider or Doubter.'); return }
    setStep1Error(null)
    setStep(2)
  }

  const handleStep2Next = () => {
    if (addMode === 'one_v_one') {
      if (participants.length !== 1) { setError('Select exactly 1 opponent.'); return }
      if (!competitionGroupId) { setError('Select a group to post this to.'); return }
    } else if (addMode === 'friends') {
      if (participants.length === 0) { setError('Add at least one participant.'); return }
      if (!competitionGroupId) { setError('Select a group to post this to.'); return }
    } else if (addMode !== 'solo') {
      // whole_group or select_members
      if (participants.length === 0) { setError('Add at least one participant.'); return }
      if (!selectedGroup) { setError('Select a group.'); return }
    }
    // solo: group is optional at this step (caught in handleSubmit since DB requires group_id)
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)
    if (end <= new Date()) { setError('End date must be in the future.'); return }
    setError(null)
    setStep(3)
  }

  const handleSubmit = async () => {
    if (!resolvedGroupId) {
      setError(
        addMode === 'solo'
          ? 'Pick a group to share your solo challenge with.'
          : 'Select a group.',
      )
      return
    }
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)
    if (end <= new Date()) { setError('End date must be in the future.'); return }
    if ((stakeType === 'money' || stakeType === 'both') && (!stakeMoney || stakeMoney <= 0)) {
      setError('Please set a money stake.'); return
    }
    if ((stakeType === 'punishment' || stakeType === 'both') && !punishmentText.trim()) {
      setError('Please enter a punishment.'); return
    }

    const participantIds =
      addMode === 'solo' ? [] :
      addMode === 'one_v_one' ? [participants[0].user_id] :
      participants.map((p) => p.user_id)

    setIsSubmitting(true)
    setError(null)
    try {
      const comp = await createCompetition({
        title: title.trim(),
        groupId: resolvedGroupId,
        category: 'fitness',
        metric: metric.trim() || title.trim(),
        participantIds,
        startDate: startDate.toISOString(),
        deadline: end.toISOString(),
        scoringMethod,
        stakeType,
        stakeMoney: stakeType === 'money' || stakeType === 'both' ? stakeMoney : undefined,
        stakePunishmentId: stakePunishmentId ?? undefined,
        stakeCustomPunishment: stakePunishmentId ? null : punishmentText.trim() || null,
        isPublic,
        creatorSide: creatorSide ?? 'rider',
      })
      setCreatedComp(comp)
      setContractOpen(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create challenge')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Derived values ────────────────────────────────────────────────────────────

  const progressPct = (step / 3) * 100

  const step2Heading =
    addMode === 'one_v_one' ? 'Challenge someone' :
    addMode === 'solo' ? 'Solo challenge' :
    "Who's competing?"

  const submitLabel =
    addMode === 'solo' || addMode === 'one_v_one' ? 'Drop It 🔥' : 'Create Competition 🏆'

  const modalParticipants = (() => {
    const base = participants.map((m) => ({
      id: m.user_id,
      name: m.profile.display_name,
      avatarUrl: m.profile.avatar_url,
    }))
    if (addMode === 'one_v_one' && currentProfile) {
      return [...base, {
        id: currentProfile.id,
        name: currentProfile.display_name,
        avatarUrl: currentProfile.avatar_url,
      }]
    }
    return base
  })()

  const modalGroupName =
    addMode === 'friends' || addMode === 'solo' || addMode === 'one_v_one'
      ? groups.find((g) => g.id === competitionGroupId)?.name
      : selectedGroup?.name

  // ── Render ────────────────────────────────────────────────────────────────────

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

          {/* ─── Step 1 — What's the challenge? ─── */}
          {step === 1 && (
            <motion.div
              key="s1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <h2 className="text-[32px] font-extrabold text-white" style={{ letterSpacing: '-0.02em' }}>
                What's the challenge?
              </h2>

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

              {/* Challenge description */}
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

              {/* Rider / Doubter side picker */}
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-text-muted mb-3">
                  Pick your side
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => { setCreatorSide('rider'); setStep1Error(null) }}
                    className={`rounded-2xl p-4 flex flex-col items-center gap-2 border-2 transition-all ${
                      creatorSide === 'rider'
                        ? 'border-accent-green bg-accent-green/10'
                        : 'border-border-subtle bg-bg-elevated'
                    }`}
                  >
                    <span className="text-3xl">🤝</span>
                    <span className={`font-extrabold text-sm ${creatorSide === 'rider' ? 'text-accent-green' : 'text-text-primary'}`}>
                      Rider
                    </span>
                    <span className="text-[11px] text-text-muted text-center leading-tight">
                      I believe this happens
                    </span>
                  </button>
                  <button
                    onClick={() => { setCreatorSide('doubter'); setStep1Error(null) }}
                    className={`rounded-2xl p-4 flex flex-col items-center gap-2 border-2 transition-all ${
                      creatorSide === 'doubter'
                        ? 'border-accent-coral bg-accent-coral/10'
                        : 'border-border-subtle bg-bg-elevated'
                    }`}
                  >
                    <span className="text-3xl">💀</span>
                    <span className={`font-extrabold text-sm ${creatorSide === 'doubter' ? 'text-accent-coral' : 'text-text-primary'}`}>
                      Doubter
                    </span>
                    <span className="text-[11px] text-text-muted text-center leading-tight">
                      I doubt this happens
                    </span>
                  </button>
                </div>
              </div>

              {step1Error && (
                <p className="text-destructive text-sm font-semibold">{step1Error}</p>
              )}

              <PrimaryButton
                onClick={handleStep1Next}
                disabled={!title.trim() || !metric.trim() || !creatorSide}
              >
                Next
              </PrimaryButton>
            </motion.div>
          )}

          {/* ─── Step 2 — Who's competing + When? ─── */}
          {step === 2 && (
            <motion.div
              key="s2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-[32px] font-extrabold text-white" style={{ letterSpacing: '-0.02em' }}>
                {step2Heading}
              </h2>

              {/* ── Participation type tabs ── */}
              <div>
                <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                  Participation type
                </p>
                <div className="grid grid-cols-3 gap-1 bg-bg-elevated p-1 rounded-xl">
                  {([
                    { mode: 'whole_group', icon: '👥', label: 'Entire Group' },
                    { mode: 'select_members', icon: '✓', label: 'Pick Members' },
                    { mode: 'friends', icon: '👤', label: 'Friends' },
                    { mode: 'solo', icon: '🏃', label: 'Solo' },
                    { mode: 'one_v_one', icon: '⚔️', label: '1v1' },
                  ] as const).map(({ mode, icon, label }) => (
                    <button
                      key={mode}
                      onClick={() => { setAddMode(mode); setParticipants([]) }}
                      className={`py-2.5 rounded-lg text-center transition-all ${
                        addMode === mode
                          ? 'bg-bg-card text-text-primary shadow-sm'
                          : 'text-text-muted hover:text-text-primary'
                      }`}
                    >
                      <span className="block text-base leading-none mb-1">{icon}</span>
                      <span className="text-[10px] font-black uppercase tracking-wide leading-none">
                        {label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Source group (whole_group / select_members) ── */}
              {(addMode === 'whole_group' || addMode === 'select_members') && (
                <div>
                  <label className="text-xs font-bold text-text-muted block mb-2">
                    {addMode === 'whole_group' ? 'Group to challenge' : 'Group'}
                  </label>
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
              )}

              {/* ── Post-to group (friends / solo / one_v_one) ── */}
              {(addMode === 'friends' || addMode === 'solo' || addMode === 'one_v_one') && (
                <div>
                  <label className="text-xs font-bold text-text-muted block mb-2">
                    {addMode === 'solo'
                      ? <>Share to group <span className="font-normal text-text-muted">(optional)</span></>
                      : 'Post competition to group'}
                  </label>
                  {/* TODO: solo group can be truly optional once schema allows null group_id */}
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
              )}

              {/* ── whole_group: add-all button ── */}
              {addMode === 'whole_group' && selectedGroup && (
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

              {/* ── select_members: checkable list ── */}
              {addMode === 'select_members' && selectedGroup && (
                <div>
                  <p className="text-xs font-bold text-text-muted uppercase mb-2">
                    Members — {participants.length} selected
                  </p>
                  <div className="space-y-2 max-h-52 overflow-y-auto">
                    {groupMembers.map((m) => {
                      const sel = participants.some((p) => p.user_id === m.user_id)
                      return (
                        <button
                          key={m.user_id}
                          onClick={() => toggleParticipant(m)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                            sel ? 'border-accent-green bg-accent-green/10' : 'border-border-subtle bg-bg-card'
                          }`}
                        >
                          <div className="w-9 h-9 rounded-full overflow-hidden bg-bg-elevated shrink-0">
                            <img src={m.profile.avatar_url ?? ''} alt="" className="w-full h-full object-cover" />
                          </div>
                          <span className="font-bold text-text-primary text-sm flex-1 text-left">
                            {m.profile.display_name}
                          </span>
                          <span className={`text-sm font-black ${sel ? 'text-accent-green' : 'text-border-subtle'}`}>
                            {sel ? '✓' : '+'}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ── friends: multi-select ── */}
              {addMode === 'friends' && (
                <div>
                  <p className="text-xs font-bold text-text-muted uppercase mb-2">
                    Friends — {participants.length} selected
                  </p>
                  <div className="space-y-2 max-h-52 overflow-y-auto">
                    {friendsList.length === 0 ? (
                      <p className="text-sm text-text-muted py-4 text-center">Loading friends…</p>
                    ) : (
                      friendsList.map((m) => {
                        const sel = participants.some((p) => p.user_id === m.user_id)
                        return (
                          <button
                            key={m.user_id}
                            onClick={() => toggleParticipant(m)}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                              sel ? 'border-accent-green bg-accent-green/10' : 'border-border-subtle bg-bg-card'
                            }`}
                          >
                            <div className="w-9 h-9 rounded-full overflow-hidden bg-bg-elevated shrink-0">
                              <img src={m.profile.avatar_url ?? ''} alt="" className="w-full h-full object-cover" />
                            </div>
                            <span className="font-bold text-text-primary text-sm flex-1 text-left">
                              {m.profile.display_name}
                            </span>
                            <span className={`text-sm font-black ${sel ? 'text-accent-green' : 'text-border-subtle'}`}>
                              {sel ? '✓' : '+'}
                            </span>
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>
              )}

              {/* ── one_v_one: single-select opponent ── */}
              {addMode === 'one_v_one' && (
                <div>
                  <p className="text-xs font-bold text-text-muted uppercase mb-2">
                    Pick your opponent{participants.length === 1 && ' ✓'}
                  </p>
                  <div className="space-y-2 max-h-52 overflow-y-auto">
                    {friendsList.length === 0 ? (
                      <p className="text-sm text-text-muted py-4 text-center">Loading friends…</p>
                    ) : (
                      friendsList.map((m) => {
                        const sel = participants.some((p) => p.user_id === m.user_id)
                        return (
                          <button
                            key={m.user_id}
                            onClick={() => toggleParticipant(m)}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                              sel ? 'border-accent-green bg-accent-green/10' : 'border-border-subtle bg-bg-card'
                            }`}
                          >
                            <div className="w-9 h-9 rounded-full overflow-hidden bg-bg-elevated shrink-0">
                              <img src={m.profile.avatar_url ?? ''} alt="" className="w-full h-full object-cover" />
                            </div>
                            <span className="font-bold text-text-primary text-sm flex-1 text-left">
                              {m.profile.display_name}
                            </span>
                            <span className={`text-sm font-black ${sel ? 'text-accent-green' : 'text-border-subtle'}`}>
                              {sel ? '⚔️' : '+'}
                            </span>
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>
              )}

              {/* ── solo: current user card ── */}
              {addMode === 'solo' && (
                <div className="bg-bg-card rounded-xl border border-border-subtle p-4 flex items-center gap-3">
                  {currentProfile?.avatar_url && (
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-bg-elevated shrink-0">
                      <img src={currentProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-bold text-text-primary">
                      {currentProfile?.display_name ?? 'You'}
                    </p>
                    <p className="text-xs text-text-muted">Solo challenger</p>
                  </div>
                  <span className="ml-auto text-lg">🏃</span>
                </div>
              )}

              {/* ── Selected participant chips ── */}
              {participants.length > 0 && addMode !== 'solo' && (
                <div>
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
                    {addMode === 'one_v_one'
                      ? `Competing (You + ${participants.length})`
                      : `Competing (${participants.length})`}
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

              {/* ── Calendar date range picker ── */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-text-muted uppercase tracking-wider">
                  Competition dates
                </p>
                <div className="bg-bg-elevated rounded-xl overflow-hidden">
                  <Calendar
                    mode="range"
                    selected={{ from: startDate, to: endDate }}
                    onSelect={(range: DateRange | undefined) => {
                      if (!range?.from) return
                      setStartDate(range.from)
                      if (range.to) {
                        setEndDate(range.to)
                      } else {
                        const newEnd = new Date(range.from)
                        newEnd.setDate(newEnd.getDate() + 7)
                        setEndDate(newEnd)
                      }
                    }}
                    disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  />
                </div>
                <div className="bg-bg-card rounded-xl border border-border-subtle p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-text-muted">From</p>
                      <p className="text-sm font-bold text-text-primary">
                        {format(startDate, 'MMM d, yyyy')}
                      </p>
                    </div>
                    <span className="text-text-muted">→</span>
                    <div className="text-right">
                      <p className="text-xs text-text-muted">To</p>
                      <p className="text-sm font-bold text-text-primary">
                        {format(endDate, 'MMM d, yyyy')}
                      </p>
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
                disabled={
                  (addMode === 'one_v_one' && participants.length !== 1) ||
                  (['whole_group', 'select_members', 'friends'].includes(addMode) && participants.length === 0) ||
                  (['friends', 'one_v_one'].includes(addMode) && !competitionGroupId)
                }
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
                Set the stakes
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

              {/* Money input + presets */}
              {(stakeType === 'money' || stakeType === 'both') && (
                <div className="space-y-4">
                  <div className="bg-bg-card border border-border-subtle rounded-2xl p-6">
                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-3">
                      Stake amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-text-muted">
                        $
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={moneyInput}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9.]/g, '')
                          setMoneyInput(raw)
                          const dollars = parseFloat(raw)
                          if (!isNaN(dollars) && dollars >= 0) {
                            setStakeMoney(Math.round(dollars * 100))
                          }
                        }}
                        onBlur={() => {
                          const dollars = parseFloat(moneyInput)
                          if (!isNaN(dollars) && dollars >= 0) {
                            setMoneyInput(dollars.toFixed(2))
                          } else {
                            setMoneyInput('0.00')
                            setStakeMoney(0)
                          }
                        }}
                        className="w-full h-16 pl-12 pr-4 rounded-xl bg-bg-elevated border border-border-subtle text-3xl font-black text-text-primary tabular-nums text-center"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {STAKE_PRESETS.map((c) => (
                      <button
                        key={c}
                        onClick={() => { setStakeMoney(c); setMoneyInput((c / 100).toFixed(2)) }}
                        className={`px-4 py-2 rounded-full font-bold text-sm ${
                          stakeMoney === c ? 'bg-accent-green text-white' : 'bg-bg-elevated text-text-primary'
                        }`}
                      >
                        {formatMoney(c)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Rich punishment card */}
              {(stakeType === 'punishment' || stakeType === 'both') && (
                <div className="space-y-4">
                  <div className="bg-bg-elevated dark:bg-bg-card rounded-2xl border-2 border-border-subtle p-6 min-h-[200px] flex flex-col relative overflow-hidden">
                    <div className="text-center text-4xl mb-4">🔥</div>
                    <textarea
                      value={punishmentText}
                      onChange={(e) => {
                        const val = e.target.value.slice(0, 120)
                        setPunishmentText(val)
                        setPunishmentEdited(true)
                        setStakePunishmentId(null)
                        setSelectedPunishmentCard(null)
                      }}
                      onFocus={() => {
                        if (!punishmentEdited) {
                          const el = document.activeElement as HTMLTextAreaElement
                          el?.select()
                        }
                      }}
                      placeholder="Enter a punishment for the loser..."
                      className="w-full flex-1 bg-transparent text-center font-bold text-base leading-snug resize-none border-none outline-none text-text-primary"
                      maxLength={120}
                    />
                    <p className="text-right text-xs text-text-muted mt-2">
                      {punishmentText.length}/120
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={randomizePunishment}
                      className="flex-1 py-3 rounded-xl border-2 border-border-subtle text-text-primary font-bold flex items-center justify-center gap-2"
                    >
                      <Shuffle className="w-4 h-4" />
                      Randomize 🎲
                    </button>
                    <button
                      onClick={savePunishmentToLibrary}
                      disabled={!punishmentText.trim() || isSaving}
                      className="flex-1 py-3 rounded-xl bg-accent-green text-white font-bold text-sm disabled:opacity-50"
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                  </div>

                  <button
                    onClick={() => setLibraryOpen(true)}
                    className="w-full py-2.5 rounded-xl border border-border-subtle text-text-muted text-sm font-bold flex items-center justify-center gap-2"
                  >
                    <BookOpen className="w-4 h-4" />
                    Punishment Library
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
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    isPublic ? 'bg-accent-green' : 'bg-bg-elevated'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      isPublic ? 'left-6' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {error && <p className="text-destructive text-sm">{error}</p>}

              <PrimaryButton onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : submitLabel}
              </PrimaryButton>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ─── Browse structures dialog ─── */}
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

      {/* ─── Punishment library dialog ─── */}
      <Dialog open={libraryOpen} onOpenChange={setLibraryOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>🔥 Punishment Library</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            {punishments.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-4">
                No saved punishments yet.
              </p>
            ) : (
              punishments.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setPunishmentText(p.text)
                    setStakePunishmentId(p.id)
                    setSelectedPunishmentCard(p)
                    setPunishmentEdited(false)
                    setLibraryOpen(false)
                  }}
                  className={`w-full text-left p-3 rounded-xl text-sm transition-colors ${
                    selectedPunishmentCard?.id === p.id
                      ? 'bg-accent-green/20 text-accent-green border border-accent-green/40'
                      : 'bg-bg-elevated text-text-primary hover:bg-accent-green/10 hover:text-accent-green'
                  }`}
                >
                  {p.text}
                </button>
              ))
            )}
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
          participants={modalParticipants}
          groupName={modalGroupName}
          detailPath={`/compete/${createdComp.id}`}
        />
      )}
    </div>
  )
}
