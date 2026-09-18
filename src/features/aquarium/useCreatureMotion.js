import { useEffect } from 'react'
import { subscribeCreatureAnimation } from './animationClock.js'
import { useCreaturePresentation } from './useCreaturePresentation.js'

function randomBetween(min, max) {
  return min + Math.random() * (max - min)
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function normalizeVelocity(x, y, speed) {
  const magnitude = Math.hypot(x, y) || 1

  return {
    vx: (x / magnitude) * speed,
    vy: (y / magnitude) * speed,
  }
}

function turnVelocity(vx, vy, speed, intensity = 1) {
  const currentAngle = Math.atan2(vy, vx)
  const angle = currentAngle + randomBetween(-0.95, 0.95) * intensity
  const verticalStretch = randomBetween(0.72, 0.96)

  return {
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed * verticalStretch,
  }
}

export function useCreatureMotion({
  tankSize,
  width,
  height,
  startX,
  startY,
  speed,
  directionX,
  directionY,
  minY = 14,
  maxYInset = 0.24,
  pauseChance = 0.24,
  pauseMin = 0.45,
  pauseMax = 1.35,
  decisionMin = 1.1,
  decisionMax = 3.1,
  initialDecisionMin = 0.9,
  initialDecisionMax = 2.4,
  initialPauseMin = 0.2,
  initialPauseMax = 0.7,
  bounceVerticalJitter = 14,
  fixedY = null,
  startOverride = null,
  restartKey = 0,
  motionType = 'fish',
  tiltFactor = 1,
  dragPosition = null,
}) {
  const { elementRef, paint, getPosition } = useCreaturePresentation({
    type: motionType, tiltFactor, dragPosition, directionX,
  })

  useEffect(() => {
    if (!tankSize.width || !tankSize.height) {
      return undefined
    }

    const bounds = {
      minX: 10,
      maxX: Math.max(10, tankSize.width - width - 10),
      minY: fixedY ?? minY,
      maxY: fixedY ?? Math.max(minY, tankSize.height - tankSize.height * maxYInset - height),
    }
    const start = normalizeVelocity(directionX, directionY, speed)
    const startPosition = startOverride
      ? {
          x: clamp(startOverride.x, bounds.minX, bounds.maxX),
          y: fixedY ?? clamp(startOverride.y, bounds.minY, bounds.maxY),
        }
      : {
          x: bounds.minX + (bounds.maxX - bounds.minX) * startX,
          y: bounds.minY + (bounds.maxY - bounds.minY) * startY,
        }
    const state = {
      x: startPosition.x,
      y: startPosition.y,
      vx: start.vx,
      vy: start.vy,
      speed,
      decisionIn: randomBetween(initialDecisionMin, initialDecisionMax),
      pauseLeft: randomBetween(initialPauseMin, initialPauseMax),
      tilt: 0,
      gazeX: 0,
      gazeY: 0,
      glanceIn: randomBetween(0.45, 1.4),
    }

    const update = (delta) => {
      let paused = false

      if (state.pauseLeft > 0) {
        state.pauseLeft -= delta
        paused = true
      } else {
        state.x += state.vx * delta
        if (fixedY == null) {
          state.y += state.vy * delta
        }
      }

      state.decisionIn -= delta
      state.glanceIn -= delta

      if (state.decisionIn <= 0) {
        if (Math.random() < pauseChance) {
          state.pauseLeft = randomBetween(pauseMin, pauseMax)
        } else {
          const variedSpeed = speed * randomBetween(0.84, 1.18)
          const turned = turnVelocity(state.vx, state.vy, variedSpeed, randomBetween(0.65, 1.2))
          state.vx = turned.vx
          state.vy = turned.vy
        }

        state.decisionIn = randomBetween(decisionMin, decisionMax)
      }

      if (state.glanceIn <= 0) {
        const lookAheadX = paused ? randomBetween(-0.18, 0.18) : clamp(state.vx / Math.max(speed, 1), -1, 1) * 0.62
        const lookAheadY =
          fixedY == null
            ? paused
              ? randomBetween(-0.28, 0.22)
              : clamp(state.vy / Math.max(speed, 1), -1, 1) * 0.5
            : randomBetween(-0.08, 0.08)

        state.gazeX = lookAheadX + randomBetween(-0.14, 0.14)
        state.gazeY = lookAheadY + randomBetween(-0.12, 0.12)
        state.glanceIn = randomBetween(0.35, 1.15)
      }

      let bounced = false

      if (state.x <= bounds.minX) {
        state.x = bounds.minX
        state.vx = Math.abs(state.vx)
        state.vy += randomBetween(-bounceVerticalJitter, bounceVerticalJitter)
        bounced = true
      } else if (state.x >= bounds.maxX) {
        state.x = bounds.maxX
        state.vx = -Math.abs(state.vx)
        state.vy += randomBetween(-bounceVerticalJitter, bounceVerticalJitter)
        bounced = true
      }

      if (state.y <= bounds.minY) {
        state.y = bounds.minY
        state.vy = Math.abs(state.vy)
        bounced = true
      } else if (state.y >= bounds.maxY) {
        state.y = bounds.maxY
        state.vy = -Math.abs(state.vy)
        bounced = true
      }

      if (bounced) {
        const redirectedSpeed = clamp(Math.hypot(state.vx, state.vy), speed * 0.82, speed * 1.2)
        const redirected = normalizeVelocity(state.vx, state.vy, redirectedSpeed)
        state.vx = redirected.vx
        state.vy = fixedY == null ? redirected.vy : 0
        state.decisionIn = randomBetween(0.8, 2)
      }

      if (fixedY != null) {
        state.y = bounds.minY
        state.vy = 0
      }

      const targetTilt =
        fixedY != null
          ? 0
          : paused
            ? state.tilt * 0.7
            : clamp((state.vy / Math.max(Math.abs(state.vx), 18)) * 30, -16, 16)
      state.tilt += (targetTilt - state.tilt) * 0.14

      paint({
        x: state.x,
        y: state.y,
        facing: state.vx >= 0 ? 1 : -1,
        tilt: state.tilt,
        paused,
        eyeX: clamp(state.gazeX, -0.7, 0.7),
        eyeY: clamp(state.gazeY, -0.65, 0.65),
      })
    }

    update(0)
    return subscribeCreatureAnimation(update)
  }, [
    paint,
    bounceVerticalJitter,
    decisionMax,
    decisionMin,
    directionX,
    directionY,
    height,
    initialDecisionMax,
    initialDecisionMin,
    initialPauseMax,
    initialPauseMin,
    maxYInset,
    minY,
    pauseChance,
    pauseMax,
    pauseMin,
    speed,
    startX,
    startY,
    tankSize.height,
    tankSize.width,
    width,
    fixedY,
    restartKey,
    startOverride,
  ])

  return { elementRef, getPosition }
}
