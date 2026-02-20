import { useCallback } from 'react'
import { useAuthStore } from '@/stores'

export function useAuth() {
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isLoading = useAuthStore((s) => s.isLoading)
  const isNewUser = useAuthStore((s) => s.isNewUser)
  const error = useAuthStore((s) => s.error)

  const initialize = useAuthStore((s) => s.initialize)
  const signUp = useAuthStore((s) => s.signUp)
  const signIn = useAuthStore((s) => s.signIn)
  const signOut = useAuthStore((s) => s.signOut)
  const updateProfile = useAuthStore((s) => s.updateProfile)
  const setProfile = useAuthStore((s) => s.setProfile)
  const clearError = useAuthStore((s) => s.clearError)

  const login = useCallback(
    async (email: string, password: string) => {
      await signIn(email, password)
    },
    [signIn],
  )

  const logout = useCallback(async () => {
    await signOut()
  }, [signOut])

  return {
    user,
    profile,
    isAuthenticated,
    isLoading,
    isNewUser,
    error,
    initialize,
    signUp,
    login,
    logout,
    updateProfile,
    setProfile,
    clearError,
  }
}
