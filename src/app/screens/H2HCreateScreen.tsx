import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { ChevronLeft, Search } from 'lucide-react'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'motion/react'
import { createH2HBet } from '@/lib/api/h2h'
import { getAllGroupMembersForUser, getGroupMembersWithProfiles } from '@/lib/api/groups'
import { getApprovedPunishments, getPunishmentStats } from '@/lib/api/punishments'
import { createPunishment } from '@/lib/api/punishments'
import { QUICK_TEMPLATES, BET_CATEGORIES, STAKE_PRESETS } from '@/lib/utils/constants'
import { formatMoney } from '@/lib/utils/formatters'
import type { BetCategory, StakeType, PunishmentCard, PunishmentDifficulty, PunishmentCategory } from '@/lib/database.types'
import type { GroupMemberWithProfile } from '@/lib/api/groups'
import { useGroupStore } from '@/stores'
import { PrimaryButton } from '../components/PrimaryButton'
import { PlayingCardPunishment } from '../components/PlayingCardPunishment'
import { Calendar } from '../components/ui/calendar'
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

const H2H_SUGGESTIONS = [
  'Who drinks more this weekend?',
  'Most miles run in a week',
  'Who can wake up earlier for 5 days?',
  'Who hits the gym more times?',
  'Who spends less on takeout?',
  'Who posts more stories?',
  'Who reads more pages?',
  'Who meditates more?',
]

const TIMEFRAME_PRESETS = [
  { id: 'today', label: 'Today Only', getDeadline: () => {
    const d = new Date()
    d.setHours(23, 59, 59, 999)
    return d
  }},
  { id: 'weekend', label: 'This Weekend', getDeadline: () => {
    const d = new Date()
    const day = d.getDay()
    const daysUntilSunday = day === 0 ? 0 : 7 - day
    d.setDate(d.getDate() + daysUntilSunday)
    d.setHours(23, 59, 59, 999)
    return d
  }},
  { id: 'week', label: 'Next 7 Days', getDeadline: () => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    d.setHours(23, 59, 59, 999)
    return d
  }},
]

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop'

export function H2HCreateScreen() {
  const navigate = useNavigate()
  const groups = useGroupStore((s) => s.groups)
  const fetchGroups = useGroupStore((s) => s.fetchGroups)

  const [step, setStep] = useState(1)
  const [selectedOpponent, setSelectedOpponent] = useState<GroupMemberWithProfile | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<{ id: string; name: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [recentFriends, setRecentFriends] = useState<GroupMemberWithProfile[]>([])
  const [groupMembers, setGroupMembers] = useState<GroupMemberWithProfile[]>([])

  const [challengeText, setChallengeText] = useState('')
  const [category, setCategory] = useState<BetCategory | null>(null)
  const [deadline, setDeadline] = useState<Date | null>(() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    d.setHours(23, 59, 59, 999)
    return d
  })
  const [selectedTime, setSelectedTime] = useState('23:59')

  const [stakeType, setStakeType] = useState<StakeType>('punishment')
  const [stakeMoney, setStakeMoney] = useState<number>(2000)
  const [stakePunishment, setStakePunishment] = useState<PunishmentCard | null>(null)
  const [stakeCustomPunishment, setStakeCustomPunishment] = useState<string | null>(null)

  const [punishments, setPunishments] = useState<PunishmentCard[]>([])
  const [punishmentStats, setPunishmentStats] = useState<Record<string, { completionRate: number; timesAssigned: number }>>({})
  const [customPunishmentOpen, setCustomPunishmentOpen] = useState(false)
  const [customPunishmentText, setCustomPunishmentText] = useState('')
  const [customDifficulty, setCustomDifficulty] = useState<PunishmentDifficulty>('medium')
  const [customCategory, setCustomCategory] = useState<PunishmentCategory>('social')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchGroups()
    getAllGroupMembersForUser().then(setRecentFriends)
  }, [fetchGroups])

  useEffect(() => {
    if (selectedGroup?.id) {
      getGroupMembersWithProfiles(selectedGroup.id).then(setGroupMembers)
    } else {
      setGroupMembers([])
    }
  }, [selectedGroup?.id])

  useEffect(() => {
    getApprovedPunishments().then(setPunishments)
  }, [])

  useEffect(() => {
    if (punishments.length === 0) return
    Promise.all(
      punishments.map((p) =>
        getPunishmentStats(p.id).then((s) => ({ id: p.id, ...s })),
      ),
    ).then((stats) => {
      const map: Record<string, { completionRate: number; timesAssigned: number }> = {}
      stats.forEach((s) => {
        map[s.id] = { completionRate: s.completionRate, timesAssigned: s.timesAssigned }
      })
      setPunishmentStats(map)
    })
  }, [punishments])

  const allMembers = [...recentFriends, ...groupMembers]
  const seen = new Set<string>()
  const deduped = allMembers.filter((m) => {
    if (seen.has(m.user_id)) return false
    seen.add(m.user_id)
    return true
  })

  const displayList = searchQuery.trim()
    ? deduped.filter((m) =>
        m.profile.display_name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : deduped.slice(0, 10)

  const handleBack = () => {
    if (step === 1) navigate(-1)
    else setStep((s) => s - 1)
  }

  const computeDeadline = (): Date | null => {
    if (!deadline) return null
    const d = new Date(deadline)
    const [h, m] = selectedTime.split(':').map(Number)
    d.setHours(h, m, 0, 0)
    return d
  }

  const handleSubmit = async () => {
    if (!selectedOpponent || !selectedGroup || !challengeText.trim() || !category || !computeDeadline()) {
      setError('Please complete all fields.')
      return
    }
    const dl = computeDeadline()!
    if (dl <= new Date()) {
      setError('Deadline must be in the future.')
      return
    }
    if ((stakeType === 'money' || stakeType === 'both') && (!stakeMoney || stakeMoney <= 0)) {
      setError('Please set a money stake.')
      return
    }
    if ((stakeType === 'punishment' || stakeType === 'both') && !stakePunishment && !stakeCustomPunishment) {
      setError('Please select or create a punishment.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      const bet = await createH2HBet({
        group_id: selectedGroup.id,
        title: challengeText.trim().slice(0, 140),
        category,
        deadline: dl.toISOString(),
        stake_type: stakeType,
        stake_money: stakeType === 'money' || stakeType === 'both' ? stakeMoney : null,
        stake_punishment_id: stakePunishment?.id ?? null,
        stake_custom_punishment: stakeCustomPunishment,
        h2h_opponent_id: selectedOpponent.user_id,
      })
      navigate(`/bet/${bet.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create challenge')
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
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-8">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-[32px] font-extrabold text-white" style={{ letterSpacing: '-0.02em' }}>
                CHALLENGE WHO?
              </h2>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search friends..."
                  className="pl-10 h-12 bg-bg-elevated"
                />
              </div>

              <div>
                <p className="text-xs font-bold text-text-muted uppercase mb-2">Recent friends</p>
                <div className="space-y-2">
                  {displayList.map((m) => (
                    <button
                      key={m.user_id}
                      onClick={() => {
                        setSelectedOpponent(m)
                        const g = groups.find((x) => x.id === m.group_id)
                        setSelectedGroup(g ? { id: g.id, name: g.name } : { id: m.group_id, name: '' })
                        setStep(2)
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                        selectedOpponent?.user_id === m.user_id
                          ? 'border-accent-green bg-accent-green/10'
                          : 'border-border-subtle bg-bg-card hover:bg-bg-elevated'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-bg-elevated">
                        <img
                          src={m.profile.avatar_url ?? DEFAULT_AVATAR}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="font-bold text-text-primary">{m.profile.display_name}</span>
                    </button>
                  ))}
                </div>
                {displayList.length === 0 && (
                  <p className="text-text-muted text-sm">No friends found. Join a group first.</p>
                )}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-[32px] font-extrabold text-white" style={{ letterSpacing: '-0.02em' }}>
                What's the challenge?
              </h2>

              <div>
                <textarea
                  value={challengeText}
                  onChange={(e) => setChallengeText(e.target.value.slice(0, 140))}
                  placeholder="e.g. Who drinks more this weekend?"
                  className="w-full h-32 rounded-xl bg-bg-elevated border border-border-subtle p-4 text-text-primary placeholder:text-text-muted resize-none"
                  maxLength={140}
                />
                <p className="text-right text-xs text-text-muted mt-1">{challengeText.length}/140</p>
              </div>

              <div>
                <p className="text-xs font-bold text-text-muted uppercase mb-2">Suggestions</p>
                <div className="flex flex-wrap gap-2">
                  {H2H_SUGGESTIONS.map((t) => (
                    <button
                      key={t}
                      onClick={() => setChallengeText(t)}
                      className="px-3 py-1.5 rounded-full bg-bg-elevated text-text-muted text-xs font-medium hover:bg-accent-green/20 hover:text-accent-green"
                    >
                      {t.length > 28 ? t.slice(0, 28) + '…' : t}
                    </button>
                  ))}
                </div>
              </div>

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

              <PrimaryButton
                onClick={() => {
                  if (challengeText.trim() && category) setStep(3)
                }}
                disabled={!challengeText.trim() || !category}
              >
                Next
              </PrimaryButton>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-[32px] font-extrabold text-white" style={{ letterSpacing: '-0.02em' }}>
                Timeframe
              </h2>

              <div className="flex flex-wrap gap-2">
                {TIMEFRAME_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setDeadline(p.getDeadline())
                      setSelectedTime('23:59')
                    }}
                    className="px-4 py-2 rounded-xl font-bold text-sm bg-bg-elevated text-text-muted hover:bg-accent-green hover:text-white"
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <Calendar
                mode="single"
                selected={deadline ?? undefined}
                onSelect={(d) => setDeadline(d ?? null)}
                disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
              />
              <div>
                <label className="text-xs font-bold text-text-muted block mb-2">End time</label>
                <Input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="h-12"
                />
              </div>

              {computeDeadline() && (
                <p className="text-accent-green font-bold text-sm">
                  Expires {format(computeDeadline()!, 'EEEE, MMM d \'at\' h:mm a')}
                </p>
              )}

              <PrimaryButton onClick={() => setStep(4)}>Next</PrimaryButton>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted">
                SET THE STAKES
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
                <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 text-center">
                  <div className="flex gap-2 justify-center flex-wrap">
                    {STAKE_PRESETS.map((cents) => (
                      <button
                        key={cents}
                        onClick={() => setStakeMoney(cents)}
                        className={`px-4 py-2 rounded-full font-bold text-sm ${
                          stakeMoney === cents ? 'bg-accent-green text-white' : 'bg-bg-elevated text-text-primary'
                        }`}
                      >
                        {formatMoney(cents)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(stakeType === 'punishment' || stakeType === 'both') && (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {punishments.slice(0, 5).map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setStakePunishment(p)
                          setStakeCustomPunishment(null)
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-bold ${
                          stakePunishment?.id === p.id ? 'bg-accent-green text-white' : 'bg-bg-elevated text-text-muted'
                        }`}
                      >
                        {p.text.slice(0, 30)}…
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setCustomPunishmentOpen(true)}
                    className="text-accent-green font-bold text-sm"
                  >
                    Create Your Own +
                  </button>
                </div>
              )}

              <PrimaryButton onClick={() => setStep(5)}>Review</PrimaryButton>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-[32px] font-extrabold text-white" style={{ letterSpacing: '-0.02em' }}>
                Challenge slip
              </h2>

              <div className="border-2 border-dashed border-gold/50 rounded-2xl p-6 bg-bg-card space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-muted">CHALLENGE</span>
                  <span className="text-xs font-bold text-gold">H2H</span>
                </div>
                <p className="text-text-primary font-bold text-lg">{challengeText}</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-bg-elevated">
                    <img
                      src={selectedOpponent?.profile.avatar_url ?? DEFAULT_AVATAR}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="font-bold text-text-primary">vs {selectedOpponent?.profile.display_name}</span>
                </div>
                <div className="text-xs text-text-muted space-y-1">
                  <p>{BET_CATEGORIES[category!]?.emoji} {BET_CATEGORIES[category!]?.label}</p>
                  <p>Expires {computeDeadline() && format(computeDeadline()!, 'EEEE, MMM d \'at\' h:mm a')}</p>
                  <p>
                    Stake:{' '}
                    {stakeMoney ? formatMoney(stakeMoney) : stakeCustomPunishment || stakePunishment?.text || '—'}
                  </p>
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

              {error && <p className="text-destructive text-sm">{error}</p>}

              <PrimaryButton
                onClick={handleSubmit}
                disabled={isSubmitting || !selectedGroup}
              >
                {isSubmitting ? 'Creating...' : 'Send Challenge'}
              </PrimaryButton>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Dialog open={customPunishmentOpen} onOpenChange={setCustomPunishmentOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create your own punishment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                Punishment text
              </label>
              <Input
                value={customPunishmentText}
                onChange={(e) => setCustomPunishmentText(e.target.value.slice(0, 120))}
                placeholder="e.g. Post an embarrassing throwback..."
                className="mb-1"
              />
              <p className="text-xs text-text-muted">{customPunishmentText.length}/120</p>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                Difficulty
              </label>
              <div className="flex gap-2">
                {(['mild', 'medium', 'savage'] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setCustomDifficulty(d)}
                    className={`flex-1 py-2 rounded-xl font-bold text-xs uppercase ${
                      customDifficulty === d ? 'bg-accent-green text-white' : 'bg-bg-elevated text-text-muted'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                Category
              </label>
              <div className="flex flex-wrap gap-2">
                {(['physical', 'social', 'financial', 'humiliating'] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCustomCategory(c)}
                    className={`px-3 py-2 rounded-xl font-bold text-xs ${
                      customCategory === c ? 'bg-accent-green text-white' : 'bg-bg-elevated text-text-muted'
                    }`}
                  >
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <PrimaryButton
              onClick={async () => {
                const text = customPunishmentText.trim()
                if (text) {
                  try {
                    const card = await createPunishment({
                      text,
                      category: customCategory,
                      difficulty: customDifficulty,
                      is_community: true,
                    })
                    setStakePunishment(card)
                    setStakeCustomPunishment(null)
                  } catch {
                    setStakeCustomPunishment(text)
                    setStakePunishment(null)
                  }
                }
                setCustomPunishmentOpen(false)
                setCustomPunishmentText('')
              }}
            >
              {customPunishmentText.trim() ? 'Create & Use' : 'Use as custom text'}
            </PrimaryButton>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
