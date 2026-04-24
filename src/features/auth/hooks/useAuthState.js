import { useEffect, useState } from 'react'
import { fetchAdminStatus } from '../../../services/api/authService.js'
import { applySupabaseSession, fetchProfileById, signOutSupabaseSession } from '../../../services/profileService.js'
import { hasSupabaseEnv, supabase } from '../../../lib/supabase.js'

export function useAuthState() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const [hasAdmin, setHasAdmin] = useState(false)
  const [adminStatusError, setAdminStatusError] = useState('')
  const [profileError, setProfileError] = useState('')
  const sessionUserId = session?.user?.id ?? ''

  useEffect(() => {
    if (!hasSupabaseEnv || !supabase) {
      setAuthLoading(false)
      return undefined
    }

    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session ?? null)
        setAuthLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null)
      setAuthLoading(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!hasSupabaseEnv) {
      return
    }

    let cancelled = false

    const loadAdminStatus = async () => {
      try {
        const data = await fetchAdminStatus()

        if (!cancelled) {
          setHasAdmin(Boolean(data.hasAdmin))
          setAdminStatusError('')
        }
      } catch (error) {
        if (!cancelled) {
          setAdminStatusError(error.message)
        }
      }
    }

    loadAdminStatus()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!sessionUserId || !supabase) {
      setProfile(null)
      setProfileLoading(false)
      return
    }

    let cancelled = false

    const loadProfile = async () => {
      setProfileLoading(true)

      try {
        const data = await fetchProfileById(supabase, sessionUserId)

        if (!cancelled) {
          setProfile(data)
          setProfileError('')
        }
      } catch (error) {
        if (!cancelled) {
          setProfile(null)
          setProfileError(error.message)
        }
      } finally {
        if (!cancelled) {
          setProfileLoading(false)
        }
      }
    }

    loadProfile()

    return () => {
      cancelled = true
    }
  }, [sessionUserId])

  return {
    adminStatusError,
    applySession: (nextSession) => applySupabaseSession(supabase, nextSession),
    authLoading,
    hasAdmin,
    hasSupabaseEnv,
    profile,
    profileError,
    profileLoading,
    session,
    setHasAdmin,
    setProfile,
    signOut: () => signOutSupabaseSession(supabase),
    supabase,
  }
}
