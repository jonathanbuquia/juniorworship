import { useCallback, useEffect, useState } from 'react'

const COMPACT_NAV_BREAKPOINT = 980

export function useResponsiveNavigation() {
  const [navCollapsed, setNavCollapsed] = useState(false)
  const [isCompactNav, setIsCompactNav] = useState(() => window.innerWidth <= COMPACT_NAV_BREAKPOINT)
  const [navDrawerOpen, setNavDrawerOpen] = useState(() => window.innerWidth > COMPACT_NAV_BREAKPOINT)

  useEffect(() => {
    const handleResize = () => {
      const nextIsCompactNav = window.innerWidth <= COMPACT_NAV_BREAKPOINT

      setIsCompactNav((current) => {
        if (current !== nextIsCompactNav) {
          setNavDrawerOpen(!nextIsCompactNav)
        }

        return nextIsCompactNav
      })
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const closeCompactNav = useCallback(() => {
    setNavDrawerOpen(false)
  }, [])

  const toggleNavigation = useCallback(() => {
    if (isCompactNav) {
      setNavDrawerOpen((current) => !current)
      return
    }

    setNavCollapsed((current) => !current)
  }, [isCompactNav])

  return {
    closeCompactNav,
    isCompactNav,
    navCollapsed,
    navDrawerOpen,
    toggleNavigation,
  }
}
