import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router'
import { ChevronLeft, Shuffle } from 'lucide-react'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'motion/react'
import useEmblaCarousel from 'embla-carousel-react'
import { useBetStore, useGroupStore, useAuthStore } from '@/stores'
import { getApprovedPunishments, getPunishmentStats, createPunishment } from '@/lib/api/punishments'
import { QUICK_TEMPLATES, STAKE_PRESETS } from '@/lib/utils/constants'
import { formatMoney } from '@/lib/utils/formatters'
import { validateClaim } from '@/lib/utils/validators'
import { PrimaryButton } from '../components/PrimaryButton'
import { PlayingCardPunishment } from '../components/PlayingCardPunishment'
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
import { Input } from '../components/ui/input'
import type { PunishmentCard, PunishmentDifficulty, PunishmentCategory, Bet } from '@/lib/database.types'
import { getBetDetail } from '@/lib/api/bets'
import { FunContractModal } from '../components/FunContractModal'

export function BetCreationWizard() {
  const navigate = useNavigate()
  const location = useLocation()
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
  const profile = useAuthStore((s) => s.profile)

  const templateAppliedRef = useRef(false)
  const [step1Error, setStep1Error] = useState<string | null>(null)

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d
  })
  const [selectedTime, setSelectedTime] = useState('17:00')
  const [punishments, setPunishments] = useState<PunishmentCard[]>([])
  const [punishmentStats, setPunishmentStats] = useState<Record<string, { completionRate: number; timesAssigned: number }>>({})

  // Templates dialog
  const [templatesOpen, setTemplatesOpen] = useState(false)

  // Custom punishment dialog
  const [customPunishmentOpen, setCustomPunishmentOpen] = useState(false)
  const [customPunishmentText, setCustomPunishmentText] = useState('')
  const [customDifficulty, setCustomDifficulty] = useState<PunishmentDifficulty>('medium')
  const [customCategory, setCustomCategory] = useState<PunishmentCategory>('social')
  const [customIsCommunity, setCustomIsCommunity] = useState(true)

  // Fun contract
  const [createdBet, setCreatedBet] = useState<Bet | null>(null)
  const [contractOpen, setContractOpen] = useState(false)

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'center' })
  const [selectedPunishmentIndex, setSelectedPunishmentIndex] = useState(0)

  useEffect(() => {
    if (!emblaApi) return
    const onSelect = () => setSelectedPunishmentIndex(emblaApi.selectedScrollSnap())
    emblaApi.on('select', onSelect)
    return () => emblaApi.off('select', onSelect)
  }, [emblaApi])

  // Reset wizard every time this screen mounts so stale step/side state never leaks in
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { resetWizard() }, [])

  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  // Auto-select single group when on step 2
  useEffect(() => {
    if (currentStep === 2 && !wizard.selectedGroup && groups.length === 1) {
      updateWizardStep(2, { selectedGroup: groups[0] })
    }
  }, [currentStep, groups, wizard.selectedGroup, updateWizardStep])

  // Restore date/time state when navigating back to step 2
  useEffect(() => {
    if (currentStep === 2 && wizard.deadline) {
      const d = new Date(wizard.deadline)
      if (!isNaN(d.getTime())) {
        setSelectedDate(d)
        setSelectedTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`)
      }
    }
  }, [currentStep])

  // Load from template bet (Remix feature)
  const templateBetId = (location.state as { templateBetId?: string } | null)?.templateBetId
  const [templateBet, setTemplateBet] = useState<Bet | null>(null)
  // Fetch template bet once
  useEffect(() => {
    if (!templateBetId || templateBet) return
    getBetDetail(templateBetId).then(setTemplateBet).catch(() => {})
  }, [templateBetId, templateBet])
  // Apply template once bet is fetched and groups have loaded
  useEffect(() => {
    if (!templateBet || templateAppliedRef.current || groups.length === 0) return
    templateAppliedRef.current = true
    const group = groups.find((g) => g.id === templateBet.group_id) ?? null
    // Compute a fresh deadline: same duration as original, starting from now
    const created = new Date(templateBet.created_at).getTime()
    const deadlineMs = new Date(templateBet.deadline).getTime()
    const durationMs = Math.max(deadlineMs - created, 24 * 60 * 60 * 1000) // at least 24h
    const newDeadline = new Date(Date.now() + durationMs)
    setSelectedDate(newDeadline)
    setSelectedTime(`${String(newDeadline.getHours()).padStart(2, '0')}:${String(newDeadline.getMinutes()).padStart(2, '0')}`)
    loadWizardFromTemplate({ ...templateBet, deadline: newDeadline.toISOString() }, group)
  }, [templateBet, groups, loadWizardFromTemplate])

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

  const handleBack = () => {
    if (currentStep === 1) navigate(-1)
    else prevStep()
  }

  function computeDeadline(): Date | null {
    if (!selectedDate) return null
    const [h, m] = selectedTime.split(':').map(Number)
    const d = new Date(selectedDate)
    d.setHours(h, m, 0, 0)
    return d
  }

  const handleNext = () => {
    if (currentStep === 1) {
      const { valid } = validateClaim(wizard.claim)
      if (!valid) {
        setStep1Error('Enter a claim before continuing.')
        return
      }
      if (!wizard.creatorSide) {
        setStep1Error('Pick your side — Rider or Doubter.')
        return
      }
      setStep1Error(null)
      updateWizardStep(1, { claim: wizard.claim.trim() })
    }
    if (currentStep === 2) {
      const deadline = computeDeadline()
      if (!deadline || deadline <= new Date()) return
      if (!wizard.selectedGroup) return
      updateWizardStep(2, { deadline: deadline.toISOString() })
    }
    nextStep()
  }

  const handleDropIt = async () => {
    if (!wizard.stakeType) return
    if ((wizard.stakeType === 'money' || wizard.stakeType === 'both') && (!wizard.stakeMoney || wizard.stakeMoney <= 0)) return
    if ((wizard.stakeType === 'punishment' || wizard.stakeType === 'both') && !wizard.stakePunishment && !wizard.stakeCustomPunishment) return
    const bet = await createBet()
    if (bet) {
      setCreatedBet(bet)
      setContractOpen(true)
    }
  }

  const progressPct = (currentStep / 3) * 100
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
            {currentStep} of 3
          </span>
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

          {/* ─── Step 1 — The Claim ─── */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-[32px] font-extrabold text-white" style={{ letterSpacing: '-0.02em' }}>
                  What's the claim?
                </h2>
                <button
                  onClick={() => navigate('/compete/create')}
                  className="text-xs text-text-muted mt-1 underline underline-offset-2"
                >
                  Create a competition instead →
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

              <button
                onClick={() => setTemplatesOpen(true)}
                className="flex items-center gap-1.5 text-accent-green font-bold text-sm"
              >
                ✨ Browse Templates
              </button>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-text-muted mb-3">Pick your side</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => { updateWizardStep(1, { creatorSide: 'rider' }); setStep1Error(null) }}
                    className={`rounded-2xl p-4 flex flex-col items-center gap-2 border-2 transition-all btn-pressed ${
                      wizard.creatorSide === 'rider'
                        ? 'border-accent-green bg-accent-green/10'
                        : 'border-border-subtle bg-bg-elevated'
                    }`}
                  >
                    <span className="text-3xl">🤝</span>
                    <span className={`font-extrabold text-sm ${wizard.creatorSide === 'rider' ? 'text-accent-green' : 'text-text-primary'}`}>
                      Rider
                    </span>
                    <span className="text-[11px] text-text-muted text-center leading-tight">I believe this happens</span>
                  </button>
                  <button
                    onClick={() => { updateWizardStep(1, { creatorSide: 'doubter' }); setStep1Error(null) }}
                    className={`rounded-2xl p-4 flex flex-col items-center gap-2 border-2 transition-all btn-pressed ${
                      wizard.creatorSide === 'doubter'
                        ? 'border-accent-coral bg-accent-coral/10'
                        : 'border-border-subtle bg-bg-elevated'
                    }`}
                  >
                    <span className="text-3xl">💀</span>
                    <span className={`font-extrabold text-sm ${wizard.creatorSide === 'doubter' ? 'text-accent-coral' : 'text-text-primary'}`}>
                      Doubter
                    </span>
                    <span className="text-[11px] text-text-muted text-center leading-tight">I doubt this happens</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── Step 2 — Deadline + Group ─── */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-[32px] font-extrabold text-white" style={{ letterSpacing: '-0.02em' }}>
                When's the deadline?
              </h2>

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

              {computeDeadline() && (
                <p className="text-accent-green font-bold text-sm">
                  Expires {format(computeDeadline()!, "EEEE, MMM d 'at' h:mm a")}
                </p>
              )}

              <div>
                <label className="text-xs font-bold text-text-muted block mb-2">Group</label>
                <Select
                  value={wizard.selectedGroup?.id ?? ''}
                  onValueChange={(id) => {
                    const g = groups.find((x) => x.id === id)
                    updateWizardStep(2, { selectedGroup: g ?? null })
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
            </motion.div>
          )}

          {/* ─── Step 3 — Stakes ─── */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
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
                    onClick={() => updateWizardStep(3, { stakeType: t })}
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
                        updateWizardStep(3, {
                          stakeMoney: Math.min(5000, (wizard.stakeMoney ?? 0) + 500),
                        })
                      }
                      className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-bg-elevated border-2 border-border-subtle text-text-primary font-bold"
                    >
                      +
                    </button>
                    <button
                      onClick={() =>
                        updateWizardStep(3, {
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
                        onClick={() => updateWizardStep(3, { stakeMoney: cents })}
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
                      {punishments.map((p) => (
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
                        updateWizardStep(3, { stakePunishment: punishments[idx], stakeCustomPunishment: null })
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
                      onClick={() => updateWizardStep(3, { stakePunishment: currentPunishment, stakeCustomPunishment: null })}
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

              {error && <p className="text-destructive text-sm">{error}</p>}

              <PrimaryButton
                onClick={handleDropIt}
                disabled={isLoading || !wizard.stakeType}
              >
                {isLoading ? 'Creating...' : 'Drop It 🔥'}
              </PrimaryButton>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Bottom CTA for steps 1–2 */}
      {currentStep < 3 && (
        <div className="px-6 pb-8 pt-4 border-t border-border-subtle bg-bg-primary shrink-0">
          {step1Error && currentStep === 1 && (
            <p className="text-destructive text-sm font-semibold mb-3 text-center">{step1Error}</p>
          )}
          <PrimaryButton onClick={handleNext}>Next</PrimaryButton>
        </div>
      )}

      {/* Browse Templates dialog */}
      <Dialog open={templatesOpen} onOpenChange={setTemplatesOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>✨ Quick Templates</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            {QUICK_TEMPLATES.map((t) => (
              <button
                key={t}
                onClick={() => {
                  updateWizardStep(1, { claim: t })
                  setTemplatesOpen(false)
                }}
                className="w-full text-left p-3 rounded-xl bg-bg-elevated text-text-primary text-sm hover:bg-accent-green/20 hover:text-accent-green transition-colors"
              >
                {t}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Custom punishment dialog */}
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
                    updateWizardStep(3, { stakePunishment: card, stakeCustomPunishment: null })
                  } catch {
                    updateWizardStep(3, { stakeCustomPunishment: text, stakePunishment: null })
                  }
                } else {
                  updateWizardStep(3, { stakeCustomPunishment: null, stakePunishment: null })
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

      {/* Fun Contract modal */}
      {createdBet && (
        <FunContractModal
          open={contractOpen}
          onClose={() => {
            setContractOpen(false)
            resetWizard()
          }}
          title={wizard.claim}
          wager={{
            money: wizard.stakeMoney,
            punishment: wizard.stakeCustomPunishment ?? wizard.stakePunishment?.text ?? null,
          }}
          validUntil={createdBet.deadline}
          participants={
            profile
              ? [{ id: profile.id, name: profile.display_name, avatarUrl: profile.avatar_url }]
              : []
          }
          groupName={wizard.selectedGroup?.name}
          detailPath={`/bet/${createdBet.id}`}
        />
      )}
    </div>
  )
}
