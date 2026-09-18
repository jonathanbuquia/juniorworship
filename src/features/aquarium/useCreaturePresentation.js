import { useCallback, useLayoutEffect, useRef } from 'react'

export function useCreaturePresentation({ type, tiltFactor, dragPosition, directionX }) {
  const elementRef = useRef(null)
  const motionRef = useRef(null)
  const optionsRef = useRef({ type, tiltFactor, dragPosition })
  const poseRef = useRef({ x: 0, y: 0, facing: directionX >= 0 ? 1 : -1, tilt: 0, paused: false, eyeX: 0, eyeY: 0 })

  const paint = useCallback((pose) => {
    poseRef.current = pose
    const element = elementRef.current
    if (!element) return

    const { type, tiltFactor, dragPosition } = optionsRef.current
    const position = dragPosition ?? pose
    // Transforms do not invalidate inherited styles throughout the illustration.
    element.style.transform = `translate3d(${position.x}px, ${position.y}px, 0)`
    if (motionRef.current) {
      const scale = type === 'squid' ? 'scale(var(--squid-art-scale)) ' : ''
      motionRef.current.style.transform = `${scale}scaleX(${pose.facing}) rotate(${pose.tilt * tiltFactor}deg)`
    }
    if (type === 'fish') {
      element.style.setProperty('--eye-x', pose.eyeX)
      element.style.setProperty('--eye-y', pose.eyeY)
    }
    element.classList.toggle('paused', pose.paused)
  }, [])

  // Reapply after React updates a class or a drag position, without restarting swimming.
  useLayoutEffect(() => {
    optionsRef.current = { type, tiltFactor, dragPosition }
    motionRef.current = elementRef.current?.querySelector(`.${type}-motion`) ?? null
    paint(poseRef.current)
  })

  return {
    elementRef,
    paint,
    getPosition: () => dragPosition ?? poseRef.current,
  }
}
