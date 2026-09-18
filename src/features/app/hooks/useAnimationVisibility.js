import { useEffect } from 'react'

export function useAnimationVisibility() {
  useEffect(() => {
    const update = () => {
      document.documentElement.classList.toggle('animations-paused', document.hidden)
    }
    update()
    document.addEventListener('visibilitychange', update)
    return () => {
      document.removeEventListener('visibilitychange', update)
      document.documentElement.classList.remove('animations-paused')
    }
  }, [])
}
