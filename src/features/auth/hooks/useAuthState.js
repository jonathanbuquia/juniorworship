import { useEffect, useState } from 'react'
import { fetchAdminStatus } from '../../../services/api/authService.js'
import { applySupabaseSession, fetchProfileById, signOutSupabaseSession } from '../../../services/profileService.js'
import { hasSupabaseEnv, supabase } from '../../../lib/supabase.js'

const LOCAL_SESSION_STORAGE_KEY = 'aquarium-local-admin-session'
const LOCAL_ADMIN_PROFILE = {
  display_name: 'Teacher',
  gold: 0,
  id: 'local-admin',
  login_name: 'local',
  role: 'admin',
}
const LOCAL_ADMIN_SESSION = {
  access_token: 'local-admin',
  refresh_token: 'local-admin',
  token_type: 'bearer',
  user: {
    id: LOCAL_ADMIN_PROFILE.id,
    user_metadata: {
      profile: LOCAL_ADMIN_PROFILE,
    },
  },
}

function getLocalProfileFromSession(session) {
  return session?.user?.user_metadata?.profile ?? null
}

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
      window.localStorage.setItem(LOCAL_SESSION_STORAGE_KEY, JSON.stringify(LOCAL_ADMIN_SESSION))
      setSession(LOCAL_ADMIN_SESSION)
      setProfile(LOCAL_ADMIN_PROFILE)
      setHasAdmin(true)

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
      if (!hasSupabaseEnv) {
        setProfile(getLocalProfileFromSession(session))
      } else {
        setProfile(null)
      }
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
  }, [session, sessionUserId])

  const applySession = async (nextSession) => {
    if (hasSupabaseEnv && supabase) {
      await applySupabaseSession(supabase, nextSession)
      return
    }

    if (!nextSession) {
      window.localStorage.setItem(LOCAL_SESSION_STORAGE_KEY, JSON.stringify(LOCAL_ADMIN_SESSION))
      setSession(LOCAL_ADMIN_SESSION)
      setProfile(LOCAL_ADMIN_PROFILE)
      return
    }

    window.localStorage.setItem(LOCAL_SESSION_STORAGE_KEY, JSON.stringify(nextSession))
    setSession(nextSession)
    setProfile(getLocalProfileFromSession(nextSession))
  }

  const signOut = async () => {
    if (hasSupabaseEnv && supabase) {
      await signOutSupabaseSession(supabase)
      return
    }

    window.localStorage.setItem(LOCAL_SESSION_STORAGE_KEY, JSON.stringify(LOCAL_ADMIN_SESSION))
    setSession(LOCAL_ADMIN_SESSION)
    setProfile(LOCAL_ADMIN_PROFILE)
  }

  return {
    adminStatusError,
    applySession,
    authLoading,
    hasAdmin,
    hasSupabaseEnv,
    profile,
    profileError,
    profileLoading,
    session,
    setHasAdmin,
    setProfile,
    signOut,
    supabase,
  }
}
