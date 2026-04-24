import { useCallback, useEffect, useState } from 'react'

export function usePathname() {
  const [pathname, setPathname] = useState(() => window.location.pathname || '/')

  useEffect(() => {
    const handlePopState = () => {
      setPathname(window.location.pathname || '/')
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  const navigate = useCallback((nextPath) => {
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath)
    }

    setPathname(nextPath)
  }, [])

  return {
    navigate,
    pathname,
  }
}
