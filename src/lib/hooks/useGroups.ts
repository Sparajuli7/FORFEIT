import { useEffect, useCallback } from 'react'
import { useGroupStore } from '@/stores'

export function useGroups() {
  const groups = useGroupStore((s) => s.groups)
  const activeGroup = useGroupStore((s) => s.activeGroup)
  const members = useGroupStore((s) => s.members)
  const isLoading = useGroupStore((s) => s.isLoading)
  const error = useGroupStore((s) => s.error)

  const fetchGroups = useGroupStore((s) => s.fetchGroups)
  const createGroup = useGroupStore((s) => s.createGroup)
  const joinGroupByCode = useGroupStore((s) => s.joinGroupByCode)
  const fetchMembers = useGroupStore((s) => s.fetchMembers)
  const setActiveGroup = useGroupStore((s) => s.setActiveGroup)
  const leaveGroup = useGroupStore((s) => s.leaveGroup)
  const clearError = useGroupStore((s) => s.clearError)

  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  const refetch = useCallback(() => {
    fetchGroups()
  }, [fetchGroups])

  return {
    groups,
    activeGroup,
    members,
    isLoading,
    error,
    fetchGroups,
    createGroup,
    joinGroupByCode,
    fetchMembers,
    setActiveGroup,
    leaveGroup,
    clearError,
    refetch,
  }
}
