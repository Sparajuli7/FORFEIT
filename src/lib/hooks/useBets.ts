import { useEffect, useCallback } from 'react'
import { useBetStore } from '@/stores'
import { formatCountdown } from '@/lib/utils/formatters'

export function useBets(groupId?: string) {
  const bets = useBetStore((s) => s.bets)
  const activeBet = useBetStore((s) => s.activeBet)
  const activeBetSides = useBetStore((s) => s.activeBetSides)
  const isLoading = useBetStore((s) => s.isLoading)
  const error = useBetStore((s) => s.error)
  const filters = useBetStore((s) => s.filters)
  const wizard = useBetStore((s) => s.wizard)
  const currentStep = useBetStore((s) => s.currentStep)

  const fetchBets = useBetStore((s) => s.fetchBets)
  const fetchBetDetail = useBetStore((s) => s.fetchBetDetail)
  const createBet = useBetStore((s) => s.createBet)
  const joinBet = useBetStore((s) => s.joinBet)
  const setFilters = useBetStore((s) => s.setFilters)
  const clearFilters = useBetStore((s) => s.clearFilters)
  const resetWizard = useBetStore((s) => s.resetWizard)
  const updateWizardStep = useBetStore((s) => s.updateWizardStep)
  const nextStep = useBetStore((s) => s.nextStep)
  const prevStep = useBetStore((s) => s.prevStep)
  const clearError = useBetStore((s) => s.clearError)

  useEffect(() => {
    if (groupId) {
      fetchBets(groupId)
    }
  }, [groupId, filters, fetchBets])

  const refetch = useCallback(() => {
    if (groupId) fetchBets(groupId)
  }, [groupId, fetchBets])

  const betsWithCountdown = bets.map((bet) => ({
    ...bet,
    countdown: formatCountdown(new Date(bet.deadline)),
  }))

  return {
    bets: betsWithCountdown,
    activeBet,
    activeBetSides,
    isLoading,
    error,
    filters,
    wizard,
    currentStep,
    fetchBets,
    fetchBetDetail,
    createBet,
    joinBet,
    setFilters,
    clearFilters,
    resetWizard,
    updateWizardStep,
    nextStep,
    prevStep,
    clearError,
    refetch,
  }
}
