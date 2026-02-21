import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router'
import { ChevronLeft, Shuffle } from 'lucide-react'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'motion/react'
import useEmblaCarousel from 'embla-carousel-react'
import { useBetStore } from '@/stores'
import { useGroupStore } from '@/stores'
import { getApprovedPunishments, getPunishmentStats } from '@/lib/api/punishments'
import { QUICK_TEMPLATES, BET_CATEGORIES, STAKE_PRESETS } from '@/lib/utils/constants'
import { formatMoney } from '@/lib/utils/formatters'
import { validateClaim } from '@/lib/utils/validators'
import { PrimaryButton } from '../components/PrimaryButton'
import { PlayingCardPunishment } from '../components/PlayingCardPunishment'
import { Calendar } from '../components/ui/calendar'
import { Slider } from '../components/ui/slider'
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
import { Input } from '../components/ui/input'
import type { BetCategory, BetType, PunishmentCard, PunishmentDifficulty, PunishmentCategory } from '@/lib/database.types'
import { createPunishment } from '@/lib/api/punishments'
import { getBetDetail } from '@/lib/api/bets'

function detectCategory(text: string): BetCategory | null {
  const lower = text.toLowerCase()
  if (/\b(gym|workout|run|exercise|fitness|squat|push.?up|5k|marathon)\b/.test(lower)) return 'fitness'
  if (/\b(money|dollar|pay|cash|bet|stake)\b/.test(lower)) return 'money'
  if (/\b(social|party|drink|alcohol|smoke|post|story|tiktok)\b/.test(lower)) return 'social'
  return null
}

const QUICK_SLIDER_STEPS = 24
const QUICK_MIN_MINS = 15
const QUICK_MAX_MINS = 6 * 60

export function BetCreationWizard() {
  const navigate = useNavigate()
  const currentStep = useBetStore((s) => s.currentStep)
  const wizard = useBetStore((s) => s.wizard)
  const updateWizardStep = useBetStore((s) => s.updateWizardStep)
  const nextStep = useBetStore((s) => s.nextStep)
  const prevStep = useBetStore((s) => s.prevStep)
  const createBet = useBetStore((s) => s.createBet)
  const resetWizard = useBetStore((s) => s.resetWizard)
  const loadWizardFromTemplate = useBetStore((s) => s.loadWizardFromTemplate)
  const error = useBetStore((s) => s.error)
  const isLoading = useBetStore((s) => s.isLoading)

  const groups = useGroupStore((s) => s.groups)
  const fetchGroups = useGroupStore((s) => s.fetchGroups)
  const location = useLocation()
  const templateAppliedRef = useRef(false)

  const [claimMode, setClaimMode] = useState<'personal' | 'challenge'>('personal')
  const [quickSliderValue, setQuickSliderValue] = useState(8)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d
  })
  const [selectedTime, setSelectedTime] = useState('17:00')
  const [punishments, setPunishments] = useState<PunishmentCard[]>([])
  const [punishmentStats, setPunishmentStats] = useState<Record<string, { completionRate: number; timesAssigned: number }>>({})
  const [customPunishmentOpen, setCustomPunishmentOpen] = useState(false)
  const [customPunishmentText, setCustomPunishmentText] = useState('')
  const [customDifficulty, setCustomDifficulty] = useState<PunishmentDifficulty>('medium')
  const [customCategory, setCustomCategory] = useState<PunishmentCategory>('social')
  const [customIsCommunity, setCustomIsCommunity] = useState(true)
  const [showSuccess, setShowSuccess] = useState(false)

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'center' })
  const [selectedPunishmentIndex, setSelectedPunishmentIndex] = useState(0)

  useEffect(() => {
    if (!emblaApi) return
    const onSelect = () => setSelectedPunishmentIndex(emblaApi.selectedScrollSnap())
    emblaApi.on('select', onSelect)
    return () => emblaApi.off('select', onSelect)
  }, [emblaApi])

  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  const templateBetId = (location.state as { templateBetId?: string } | null)?.templateBetId
  useEffect(() => {
    if (!templateBetId || templateAppliedRef.current) return
    templateAppliedRef.current = true
    getBetDetail(templateBetId)
      .then((bet) => {
        const group = groups.find((g) => g.id === bet.group_id) ?? null
        loadWizardFromTemplate(bet, group)
      })
      .catch(() => {})
  }, [templateBetId, groups, loadWizardFromTemplate])

  useEffect(() => {
    if (currentStep === 5 && !wizard.selectedGroup && groups.length === 1) {
      updateWizardStep(5, { selectedGroup: groups[0] })
    }
  }, [currentStep, groups, wizard.selectedGroup, updateWizardStep])

  useEffect(() => {
    if (currentStep === 3 && wizard.deadline && wizard.betType !== 'quick') {
      const d = new Date(wizard.deadline)
      setSelectedDate(d)
      setSelectedTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`)
    }
  }, [currentStep])

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

  useEffect(() => {
    const detected = wizard.claim ? detectCategory(wizard.claim) : null
    if (detected && !wizard.category) {
      updateWizardStep(currentStep, { category: detected })
    }
  }, [wizard.claim])

  const handleBack = () => {
    if (currentStep === 1) navigate(-1)
    else prevStep()
  }

  const handleNext = () => {
    if (currentStep === 1) {
      const { valid, error: err } = validateClaim(wizard.claim)
      if (!valid) return
      updateWizardStep(1, { claim: wizard.claim.trim() })
    }
    if (currentStep === 2) {
      if (!wizard.category || !wizard.betType) return
    }
    if (currentStep === 3) {
      const deadline = computeDeadline()
      if (!deadline || deadline <= new Date()) return
      updateWizardStep(3, { deadline: deadline.toISOString() })
    }
    if (currentStep === 4) {
      if (!wizard.stakeType) return
      if ((wizard.stakeType === 'money' || wizard.stakeType === 'both') && (!wizard.stakeMoney || wizard.stakeMoney <= 0)) return
      if ((wizard.stakeType === 'punishment' || wizard.stakeType === 'both') && !wizard.stakePunishment && !wizard.stakeCustomPunishment) return
    }
    nextStep()
  }

  function computeDeadline(): Date | null {
    if (wizard.betType === 'quick') {
      const mins = QUICK_MIN_MINS + (quickSliderValue / QUICK_SLIDER_STEPS) * (QUICK_MAX_MINS - QUICK_MIN_MINS)
      const d = new Date()
      d.setMinutes(d.getMinutes() + Math.round(mins))
      return d
    }
    if (!selectedDate) return null
    const [h, m] = selectedTime.split(':').map(Number)
    const d = new Date(selectedDate)
    d.setHours(h, m, 0, 0)
    return d
  }

  const handleDropIt = async () => {
    if (!wizard.selectedGroup) return
    const deadline = wizard.deadline ?? computeDeadline()?.toISOString()
    if (!deadline) return
    updateWizardStep(5, { deadline, selectedGroup: wizard.selectedGroup })
    const bet = await createBet()
    if (bet) {
      setShowSuccess(true)
      setTimeout(() => {
        resetWizard()
        navigate(`/bet/${bet.id}`)
      }, 1200)
    }
  }

  const progressPct = (currentStep / 5) * 100
  const currentPunishment = punishments[selectedPunishmentIndex]

  return (
    <div className="h-full bg-bg-primary grain-texture flex flex-col">
      {/* Progress bar */}
      <div className="px-6 pt-8 pb-4 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <button onClick={handleBack} className="text-text-primary p-1 -m-1">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-xs font-bold text-text-muted tabular-nums">
            {currentStep} of 5
          </span>
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
          {/* Step 1 — The Claim */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-[32px] font-extrabold text-white" style={{ letterSpacing: '-0.02em' }}>
                What's the claim?
              </h2>

              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setClaimMode('personal')}
                  className={`flex-1 py-3 rounded-full font-semibold ${
                    claimMode === 'personal' ? 'bg-accent-green text-white' : 'bg-bg-elevated text-text-muted'
                  }`}
                >
                  Personal Resolution
                </button>
                <button
                  onClick={() => {
                    setClaimMode('challenge')
                    navigate('/compete/create')
                  }}
                  className={`flex-1 py-3 rounded-full font-semibold ${
                    claimMode === 'challenge' ? 'bg-accent-green text-white' : 'bg-bg-elevated text-text-muted'
                  }`}
                >
                  Challenge Someone
                </button>
              </div>

              <div>
                <textarea
                  value={wizard.claim}
                  onChange={(e) => updateWizardStep(1, { claim: e.target.value.slice(0, 140) })}
                  placeholder="I will..."
                  className="w-full h-32 rounded-xl bg-bg-elevated border border-border-subtle p-4 text-text-primary placeholder:text-text-muted resize-none"
                  maxLength={140}
                />
                <p className="text-right text-xs text-text-muted mt-1">
                  {wizard.claim.length}/140
                </p>
              </div>

              <div>
                <p className="text-xs font-bold text-text-muted uppercase tracking-wide mb-2">Quick templates</p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_TEMPLATES.map((t) => (
                    <button
                      key={t}
                      onClick={() => updateWizardStep(1, { claim: t })}
                      className="px-3 py-1.5 rounded-full bg-bg-elevated text-text-muted text-xs font-medium hover:bg-accent-green/20 hover:text-accent-green"
                    >
                      {t.slice(0, 30)}...
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2 — Category + Type */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <h2 className="text-[32px] font-extrabold text-white" style={{ letterSpacing: '-0.02em' }}>
                Category & type
              </h2>

              <div>
                <p className="text-xs font-bold text-text-muted uppercase mb-2">Category</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.entries(BET_CATEGORIES) as [BetCategory, { label: string; emoji: string }][]).map(
                    ([key, { label, emoji }]) => (
                      <button
                        key={key}
                        onClick={() => updateWizardStep(2, { category: key })}
                        className={`px-4 py-2 rounded-xl font-bold text-sm ${
                          wizard.category === key ? 'bg-accent-green text-white' : 'bg-bg-elevated text-text-muted'
                        }`}
                      >
                        {emoji} {label}
                      </button>
                    ),
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-text-muted uppercase mb-2">Type</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'long' as BetType, label: 'Long' },
                    { id: 'quick' as BetType, label: 'Quick' },
                    { id: 'competition' as BetType, label: 'Competition' },
                  ].map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => updateWizardStep(2, { betType: id })}
                      className={`px-4 py-2 rounded-xl font-bold text-sm ${
                        wizard.betType === id ? 'bg-accent-green text-white' : 'bg-bg-elevated text-text-muted'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3 — Deadline */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-[32px] font-extrabold text-white" style={{ letterSpacing: '-0.02em' }}>
                When's the deadline?
              </h2>

              {wizard.betType === 'quick' ? (
                <>
                  <div className="space-y-4">
                    <Slider
                      value={[quickSliderValue]}
                      onValueChange={([v]) => setQuickSliderValue(v ?? 0)}
                      min={0}
                      max={QUICK_SLIDER_STEPS}
                      step={1}
                      className="w-full"
                    />
                    <p className="text-center text-text-primary font-bold">
                      {Math.round(QUICK_MIN_MINS + (quickSliderValue / QUICK_SLIDER_STEPS) * (QUICK_MAX_MINS - QUICK_MIN_MINS))} minutes
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  />
                  <div>
                    <label className="text-xs font-bold text-text-muted block mb-2">Time</label>
                    <Input
                      type="time"
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      className="h-12"
                    />
                  </div>
                </>
              )}

              {computeDeadline() && (
                <p className="text-accent-green font-bold text-sm">
                  Expires {format(computeDeadline()!, 'EEEE, MMM d \'at\' h:mm a')}
                </p>
              )}
            </motion.div>
          )}

          {/* Step 4 — Stakes */}
          {currentStep === 4 && (
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
                    onClick={() => updateWizardStep(4, { stakeType: t })}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm ${
                      wizard.stakeType === t ? 'bg-accent-green text-white' : 'bg-bg-elevated text-text-muted'
                    }`}
                  >
                    {t === 'money' ? '💵 Money' : t === 'punishment' ? '🔥 Punishment' : '💵🔥 Both'}
                  </button>
                ))}
              </div>

              {(wizard.stakeType === 'money' || wizard.stakeType === 'both') && (
                <div className="bg-bg-card border border-border-subtle rounded-2xl p-8 text-center">
                  <div className="relative w-40 h-40 mx-auto mb-6">
                    <div className="absolute inset-0 rounded-full bg-accent-green flex items-center justify-center border-8 border-bg-primary shadow-2xl">
                      <span className="text-5xl font-black text-white tabular-nums">
                        {formatMoney(wizard.stakeMoney ?? 0)}
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        updateWizardStep(4, {
                          stakeMoney: Math.min(5000, (wizard.stakeMoney ?? 0) + 500),
                        })
                      }
                      className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-bg-elevated border-2 border-border-subtle text-text-primary font-bold"
                    >
                      +
                    </button>
                    <button
                      onClick={() =>
                        updateWizardStep(4, {
                          stakeMoney: Math.max(0, (wizard.stakeMoney ?? 0) - 500),
                        })
                      }
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-10 h-10 rounded-full bg-bg-elevated border-2 border-border-subtle text-text-primary font-bold"
                    >
                      −
                    </button>
                  </div>
                  <div className="flex gap-2 justify-center">
                    {STAKE_PRESETS.map((cents) => (
                      <button
                        key={cents}
                        onClick={() => updateWizardStep(4, { stakeMoney: cents })}
                        className={`px-4 py-2 rounded-full font-bold text-sm ${
                          wizard.stakeMoney === cents ? 'bg-accent-green text-white' : 'bg-bg-elevated text-text-primary'
                        }`}
                      >
                        {formatMoney(cents)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(wizard.stakeType === 'punishment' || wizard.stakeType === 'both') && (
                <div className="space-y-4">
                  <div ref={emblaRef} className="overflow-hidden">
                    <div className="flex gap-4">
                      {punishments.map((p, i) => (
                        <div key={p.id} className="flex-[0_0_100%] min-w-0">
                          <PlayingCardPunishment
                            punishment={p.text}
                            difficulty={p.difficulty as PunishmentDifficulty}
                            category={p.category ? p.category.charAt(0).toUpperCase() + p.category.slice(1) : undefined}
                            completionRate={punishmentStats[p.id]?.completionRate}
                            timesAssigned={punishmentStats[p.id]?.timesAssigned}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const idx = Math.floor(Math.random() * punishments.length)
                        setSelectedPunishmentIndex(idx)
                        emblaApi?.scrollTo(idx)
                        updateWizardStep(4, { stakePunishment: punishments[idx], stakeCustomPunishment: null })
                      }}
                      className="flex-1 py-3 rounded-xl border-2 border-border-subtle text-text-primary font-bold flex items-center justify-center gap-2"
                    >
                      <Shuffle className="w-4 h-4" />
                      Randomize 🎲
                    </button>
                    <button
                      onClick={() => setCustomPunishmentOpen(true)}
                      className="flex-1 py-3 rounded-xl text-accent-green font-bold text-sm"
                    >
                      Create Your Own +
                    </button>
                  </div>
                  {currentPunishment && (
                    <button
                      onClick={() => updateWizardStep(4, { stakePunishment: currentPunishment, stakeCustomPunishment: null })}
                      className="w-full py-2 rounded-xl bg-accent-green/20 text-accent-green font-bold text-sm"
                    >
                      Select this card
                    </button>
                  )}
                  {wizard.stakeCustomPunishment && (
                    <p className="text-sm text-accent-green font-medium">
                      Custom: {wizard.stakeCustomPunishment}
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* Step 5 — Review */}
          {currentStep === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-[32px] font-extrabold text-white" style={{ letterSpacing: '-0.02em' }}>
                Review & launch
              </h2>

              <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 space-y-3">
                <p className="text-text-primary font-bold">{wizard.claim}</p>
                <p className="text-xs text-text-muted">
                  {BET_CATEGORIES[wizard.category!]?.emoji} {BET_CATEGORIES[wizard.category!]?.label} · {wizard.betType}
                </p>
                <p className="text-xs text-text-muted">
                  Expires {wizard.deadline && format(new Date(wizard.deadline), 'EEEE, MMM d \'at\' h:mm a')}
                </p>
                <p className="text-xs text-text-muted">
                  Stake: {wizard.stakeMoney ? formatMoney(wizard.stakeMoney) : wizard.stakeCustomPunishment || wizard.stakePunishment?.text || '—'}
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-text-muted block mb-2">Group</label>
                <Select
                  value={wizard.selectedGroup?.id ?? ''}
                  onValueChange={(id) => {
                    const g = groups.find((x) => x.id === id)
                    updateWizardStep(5, { selectedGroup: g ?? null })
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
                onClick={handleDropIt}
                disabled={isLoading || !wizard.selectedGroup || showSuccess}
              >
                {showSuccess ? '✓ Dropped!' : isLoading ? 'Creating...' : 'Drop It'}
              </PrimaryButton>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom CTA for steps 1-4 */}
      {currentStep < 5 && (
        <div className="px-6 pb-8 pt-4 border-t border-border-subtle bg-bg-primary shrink-0">
          <PrimaryButton onClick={handleNext}>
            {currentStep === 4 ? 'Continue' : 'Next'}
          </PrimaryButton>
        </div>
      )}

      {/* Custom punishment modal */}
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

            <div className="flex items-center justify-between">
              <span className="text-sm text-text-primary">Community</span>
              <button
                onClick={() => setCustomIsCommunity(!customIsCommunity)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  customIsCommunity ? 'bg-accent-green' : 'bg-bg-elevated'
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    customIsCommunity ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>
            <p className="text-xs text-text-muted">
              {customIsCommunity ? 'Others can use this punishment' : 'Keep private (only you can use it)'}
            </p>

            {customPunishmentText.trim() && (
              <div className="border border-border-subtle rounded-xl p-4 bg-bg-elevated">
                <p className="text-xs font-bold text-text-muted mb-2">Preview</p>
                <PlayingCardPunishment
                  punishment={customPunishmentText.trim()}
                  difficulty={customDifficulty}
                  category={customCategory.charAt(0).toUpperCase() + customCategory.slice(1)}
                />
              </div>
            )}

            <PrimaryButton
              onClick={async () => {
                const text = customPunishmentText.trim()
                if (text) {
                  try {
                    const card = await createPunishment({
                      text,
                      category: customCategory,
                      difficulty: customDifficulty,
                      is_community: customIsCommunity,
                    })
                    updateWizardStep(4, { stakePunishment: card, stakeCustomPunishment: null })
                  } catch {
                    updateWizardStep(4, { stakeCustomPunishment: text, stakePunishment: null })
                  }
                } else {
                  updateWizardStep(4, { stakeCustomPunishment: null, stakePunishment: null })
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

      {/* Success overlay */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-accent-green/90 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 15 }}
              className="text-6xl font-black text-white"
            >
              ✓ Dropped!
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
