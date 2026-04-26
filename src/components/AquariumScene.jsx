import { useEffect, useRef, useState } from 'react'
import '../PixelAquarium.css'
import { findShopItemBySlug } from '../../shared/shopCatalog.js'

const BASE_FISH_WIDTH = 198
const BASE_FISH_HEIGHT = 126
const BASE_OCTOPUS_WIDTH = 152
const BASE_OCTOPUS_HEIGHT = 150
const BASE_JELLYFISH_WIDTH = 126
const BASE_JELLYFISH_HEIGHT = 164
const BASE_CRAB_WIDTH = 148
const BASE_CRAB_HEIGHT = 104
const BASE_PUFFER_WIDTH = 148
const BASE_PUFFER_HEIGHT = 136
const BASE_STINGRAY_WIDTH = 176
const BASE_STINGRAY_HEIGHT = 122
const BASE_TURTLE_WIDTH = 176
const BASE_TURTLE_HEIGHT = 138
const CORAL_WIDTH = 118
const CORAL_HEIGHT = 136
const creatureMessages = [
  'UMATTEND KA NG JUNIOR WORSHIP',
  'nagpray ka ba?',
  'ang ganda mo',
  'ano tara?',
  'ang OA mo',
  'Happy Yarn?',
  'hi friend!',
  'God bless you!',
  'swim swim!',
]
const coralDecorations = [
  { id: 'pink-coral', color: 'pink', startX: 0.14 },
  { id: 'green-coral', color: 'green', startX: 0.72 },
]
const EMPTY_AQUARIUM_STATE = {
  coralPositions: {},
  creatures: {},
}
const PURCHASED_FISH_DEFAULTS = [
  { directionX: 1, directionY: -0.18, scale: 0.92, speed: 54, startX: 0.16, startY: 0.24 },
  { directionX: -1, directionY: 0.14, scale: 0.82, speed: 48, startX: 0.66, startY: 0.36 },
  { directionX: 1, directionY: 0.22, scale: 0.98, speed: 58, startX: 0.28, startY: 0.56 },
  { directionX: -1, directionY: -0.16, scale: 0.88, speed: 52, startX: 0.74, startY: 0.62 },
  { directionX: 1, directionY: 0.12, scale: 0.8, speed: 46, startX: 0.46, startY: 0.42 },
]

function getTankContentScale(viewportWidth) {
  if (viewportWidth <= 520) {
    return 0.82
  }

  if (viewportWidth <= 700) {
    return 0.9
  }

  if (viewportWidth <= 900) {
    return 0.96
  }

  return 1
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min)
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function useTalkingBubble(messages = creatureMessages) {
  const [isTalking, setIsTalking] = useState(false)
  const [message, setMessage] = useState(messages[0])
  const hideTimerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current)
      }
    }
  }, [])

  const showMessage = () => {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current)
    }

    setMessage(messages[Math.floor(Math.random() * messages.length)])
    setIsTalking(true)
    hideTimerRef.current = window.setTimeout(() => {
      setIsTalking(false)
    }, 2600)
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      showMessage()
    }
  }

  return {
    handleKeyDown,
    isTalking,
    message,
    showMessage,
  }
}

function CreatureSpeechBubble({ message }) {
  return (
    <div className="creature-bubble" aria-hidden="true">
      {message}
    </div>
  )
}

function buildOwnedFishConfigs(ownedFish) {
  return ownedFish.flatMap((entry, entryIndex) => {
    const item = findShopItemBySlug(entry.slug)

    if (!item || !Number.isInteger(entry.quantity) || entry.quantity <= 0) {
      return []
    }

    return Array.from({ length: entry.quantity }, (_unused, index) => {
      const defaults = PURCHASED_FISH_DEFAULTS[(entryIndex + index) % PURCHASED_FISH_DEFAULTS.length]

      return {
        directionX: defaults.directionX,
        directionY: defaults.directionY,
        id: `${entry.slug}-${index + 1}`,
        palette: {
          accent: item.accentColor,
          eye: '#17324f',
          fin: item.finColor,
          light: item.detailColor,
          main: item.bodyColor,
          mouth: '#8b3f25',
        },
        scale: defaults.scale + ((entryIndex + index) % 3) * 0.04,
        speed: defaults.speed + ((entryIndex + index) % 2) * 4,
        startX: clamp(defaults.startX + index * 0.06, 0.12, 0.82),
        startY: clamp(defaults.startY + (index % 2 === 0 ? 0.04 : -0.03), 0.16, 0.68),
      }
    })
  })
}

function createAquariumStorageKey(playerId) {
  return playerId ? `aquarium-player:v2:${playerId}` : ''
}

function readAquariumState(playerId) {
  const storageKey = createAquariumStorageKey(playerId)

  if (!storageKey) {
    return EMPTY_AQUARIUM_STATE
  }

  try {
    const savedValue = window.localStorage.getItem(storageKey)

    if (!savedValue) {
      return EMPTY_AQUARIUM_STATE
    }

    const parsed = JSON.parse(savedValue)
    return {
      coralPositions: parsed.coralPositions ?? {},
      creatures: parsed.creatures ?? {},
    }
  } catch {
    return EMPTY_AQUARIUM_STATE
  }
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

function useCreatureMotion({
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
}) {
  const [pose, setPose] = useState(() => ({
    x: 0,
    y: 0,
    facing: directionX >= 0 ? 1 : -1,
    tilt: 0,
    paused: false,
    eyeX: 0,
    eyeY: 0,
  }))

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

    let frameId = 0
    let previousTime = performance.now()

    const update = (now) => {
      const delta = Math.min((now - previousTime) / 1000, 0.05)
      previousTime = now
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

      setPose({
        x: state.x,
        y: state.y,
        facing: state.vx >= 0 ? 1 : -1,
        tilt: state.tilt,
        paused,
        eyeX: clamp(state.gazeX, -0.7, 0.7),
        eyeY: clamp(state.gazeY, -0.65, 0.65),
      })

      frameId = window.requestAnimationFrame(update)
    }

    frameId = window.requestAnimationFrame(update)

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [
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

  return pose
}

function useDraggableSwimmer({
  tankRef,
  width,
  height,
  minY = 14,
  maxYInset = 0.24,
  persistedStart = null,
  disabled = false,
  onPersistPosition,
}) {
  const [dragState, setDragState] = useState(null)
  const [restartKey, setRestartKey] = useState(0)

  useEffect(() => {
    if (disabled || !dragState) {
      return undefined
    }

    const handlePointerMove = (event) => {
      const tank = tankRef.current

      if (!tank) {
        return
      }

      const rect = tank.getBoundingClientRect()
      const minX = 10
      const maxX = Math.max(minX, rect.width - width - 10)
      const boundedMinY = dragState.fixedY ?? minY
      const boundedMaxY =
        dragState.fixedY ?? Math.max(boundedMinY, rect.height - rect.height * maxYInset - height)
      const nextX = clamp(event.clientX - rect.left - dragState.offsetX, minX, maxX)
      const nextY = dragState.fixedY ?? clamp(event.clientY - rect.top - dragState.offsetY, boundedMinY, boundedMaxY)

      setDragState((previous) =>
        previous
          ? {
              ...previous,
              position: {
                x: nextX,
                y: nextY,
              },
            }
          : previous,
      )
    }

    const handlePointerUp = () => {
      setDragState((previous) => {
        if (!previous) {
          return previous
        }

        onPersistPosition?.(previous.position)
        setRestartKey((value) => value + 1)
        return null
      })
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [disabled, dragState, height, maxYInset, minY, onPersistPosition, tankRef, width])

  const startDragging = (event, currentPosition, fixedY = null) => {
    if (disabled) {
      return
    }

    const tank = tankRef.current

    if (!tank) {
      return
    }

    const rect = tank.getBoundingClientRect()

    setDragState({
      fixedY,
      offsetX: event.clientX - rect.left - currentPosition.x,
      offsetY: event.clientY - rect.top - currentPosition.y,
      position: currentPosition,
    })
  }

  return {
    dragging: dragState != null,
    dragPosition: dragState?.position ?? null,
    restartKey,
    startDragging,
    startOverride: persistedStart,
  }
}

function NaturalFish({ fish, movable = false, persistedStart, tankRef, tankSize, onPersistPosition }) {
  const draggable = useDraggableSwimmer({
    tankRef,
    width: BASE_FISH_WIDTH * fish.scale,
    height: BASE_FISH_HEIGHT * fish.scale,
    disabled: !movable,
    persistedStart,
    onPersistPosition,
  })
  const pose = useCreatureMotion({
    tankSize,
    width: BASE_FISH_WIDTH * fish.scale,
    height: BASE_FISH_HEIGHT * fish.scale,
    startX: fish.startX,
    startY: fish.startY,
    speed: fish.speed,
    directionX: fish.directionX,
    directionY: fish.directionY,
    restartKey: draggable.restartKey,
    startOverride: draggable.startOverride,
  })
  const displayPosition = draggable.dragPosition ?? pose
  const talking = useTalkingBubble()

  return (
    <div
      className={`fish-swim ${pose.paused ? 'paused' : ''} ${draggable.dragging ? 'dragging' : ''}`}
      style={{
        '--fish-scale': fish.scale,
        '--main': fish.palette.main,
        '--light': fish.palette.light,
        '--accent': fish.palette.accent,
        '--fin': fish.palette.fin,
        '--eye': fish.palette.eye,
        '--mouth': fish.palette.mouth,
        '--swim-x': `${displayPosition.x}px`,
        '--swim-y': `${displayPosition.y}px`,
        '--fish-facing': pose.facing,
        '--fish-tilt': `${pose.tilt}deg`,
        '--eye-x': pose.eyeX,
        '--eye-y': pose.eyeY,
      }}
      onClick={talking.showMessage}
      onKeyDown={talking.handleKeyDown}
      onPointerDown={movable ? (event) => draggable.startDragging(event, displayPosition) : undefined}
      role="button"
      tabIndex={0}
      aria-label="Cute fish"
    >
      {talking.isTalking ? <CreatureSpeechBubble message={talking.message} /> : null}
      <div className="fish-motion">
        <div className="fish-bob">
          <div className="fish-illustration">
            <div className="fish-tail" />
            <div className="fish-fin dorsal" />
            <div className="fish-fin side" />
            <div className="fish-fin belly" />
            <div className="fish-body">
              <div className="fish-face" />
              <div className="fish-eye">
                <span className="fish-pupil">
                  <span className="eye-spark" />
                </span>
              </div>
              <div className="fish-mouth" />
              <div className="fish-gill" />
              <div className="fish-highlight" />
              <div className="fish-stripe stripe-a" />
              <div className="fish-stripe stripe-b" />
              <div className="fish-stripe stripe-c" />
              <div className="fish-scale scale-a" />
              <div className="fish-scale scale-b" />
              <div className="fish-scale scale-c" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function CuteOctopus({ movable = false, persistedStart, tankRef, tankSize, onPersistPosition }) {
  const draggable = useDraggableSwimmer({
    tankRef,
    width: BASE_OCTOPUS_WIDTH,
    height: BASE_OCTOPUS_HEIGHT,
    minY: 30,
    maxYInset: 0.2,
    disabled: !movable,
    persistedStart,
    onPersistPosition,
  })
  const pose = useCreatureMotion({
    tankSize,
    width: BASE_OCTOPUS_WIDTH,
    height: BASE_OCTOPUS_HEIGHT,
    startX: 0.54,
    startY: 0.62,
    speed: 32,
    directionX: -1,
    directionY: -0.18,
    minY: 30,
    maxYInset: 0.2,
    pauseChance: 0.34,
    pauseMin: 0.7,
    pauseMax: 1.8,
    decisionMin: 1.6,
    decisionMax: 3.8,
    initialDecisionMin: 0.8,
    initialDecisionMax: 2,
    initialPauseMin: 0.5,
    initialPauseMax: 1.2,
    bounceVerticalJitter: 9,
    restartKey: draggable.restartKey,
    startOverride: draggable.startOverride,
  })
  const displayPosition = draggable.dragPosition ?? pose
  const talking = useTalkingBubble()

  return (
    <div
      className={`octopus-swim ${pose.paused ? 'paused' : ''} ${draggable.dragging ? 'dragging' : ''}`}
      style={{
        '--swim-x': `${displayPosition.x}px`,
        '--swim-y': `${displayPosition.y}px`,
        '--octopus-facing': pose.facing,
        '--octopus-tilt': `${pose.tilt * 0.6}deg`,
      }}
      onClick={talking.showMessage}
      onKeyDown={talking.handleKeyDown}
      onPointerDown={movable ? (event) => draggable.startDragging(event, displayPosition) : undefined}
      role="button"
      tabIndex={0}
      aria-label="Cute octopus"
    >
      {talking.isTalking ? <CreatureSpeechBubble message={talking.message} /> : null}
      <div className="octopus-bob">
        <div className="octopus-motion">
          <div className="octopus">
            <div className="octopus-head">
              <div className="octopus-blush octopus-blush-left" />
              <div className="octopus-blush octopus-blush-right" />
              <div className="octopus-eye octopus-eye-left">
                <span className="octopus-eye-spark" />
              </div>
              <div className="octopus-eye octopus-eye-right">
                <span className="octopus-eye-spark" />
              </div>
              <div className="octopus-mouth" />
              <div className="octopus-highlight" />
            </div>
            <div className="octopus-arms" aria-hidden="true">
              <span className="octopus-arm arm-a" />
              <span className="octopus-arm arm-b" />
              <span className="octopus-arm arm-c" />
              <span className="octopus-arm arm-d" />
              <span className="octopus-arm arm-e" />
              <span className="octopus-arm arm-f" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function CuteJellyfish({ movable = false, persistedStart, tankRef, tankSize, onPersistPosition }) {
  const draggable = useDraggableSwimmer({
    tankRef,
    width: BASE_JELLYFISH_WIDTH,
    height: BASE_JELLYFISH_HEIGHT,
    minY: 18,
    maxYInset: 0.18,
    disabled: !movable,
    persistedStart,
    onPersistPosition,
  })
  const pose = useCreatureMotion({
    tankSize,
    width: BASE_JELLYFISH_WIDTH,
    height: BASE_JELLYFISH_HEIGHT,
    startX: 0.28,
    startY: 0.18,
    speed: 28,
    directionX: 1,
    directionY: 0.2,
    minY: 18,
    maxYInset: 0.18,
    pauseChance: 0.4,
    pauseMin: 0.9,
    pauseMax: 2.1,
    decisionMin: 1.8,
    decisionMax: 4,
    initialDecisionMin: 0.8,
    initialDecisionMax: 2.2,
    initialPauseMin: 0.3,
    initialPauseMax: 1,
    bounceVerticalJitter: 7,
    restartKey: draggable.restartKey,
    startOverride: draggable.startOverride,
  })
  const displayPosition = draggable.dragPosition ?? pose
  const talking = useTalkingBubble()

  return (
    <div
      className={`jellyfish-swim ${pose.paused ? 'paused' : ''} ${draggable.dragging ? 'dragging' : ''}`}
      style={{
        '--swim-x': `${displayPosition.x}px`,
        '--swim-y': `${displayPosition.y}px`,
        '--jellyfish-facing': pose.facing,
        '--jellyfish-tilt': `${pose.tilt * 0.45}deg`,
      }}
      onPointerDown={movable ? (event) => draggable.startDragging(event, displayPosition) : undefined}
      onClick={talking.showMessage}
      onKeyDown={talking.handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label="Cute jellyfish"
    >
      {talking.isTalking ? <CreatureSpeechBubble message={talking.message} /> : null}
      <div className="jellyfish-bob">
        <div className="jellyfish-motion">
          <div className="jellyfish">
            <div className="jellyfish-bell">
              <div className="jellyfish-highlight" />
              <div className="jellyfish-eye jellyfish-eye-left">
                <span className="jellyfish-eye-spark" />
              </div>
              <div className="jellyfish-eye jellyfish-eye-right">
                <span className="jellyfish-eye-spark" />
              </div>
              <div className="jellyfish-mouth" />
              <div className="jellyfish-blush jellyfish-blush-left" />
              <div className="jellyfish-blush jellyfish-blush-right" />
            </div>
            <div className="jellyfish-frill" aria-hidden="true" />
            <div className="jellyfish-tentacles" aria-hidden="true">
              <span className="jellyfish-tentacle tentacle-a" />
              <span className="jellyfish-tentacle tentacle-b" />
              <span className="jellyfish-tentacle tentacle-c" />
              <span className="jellyfish-tentacle tentacle-d" />
              <span className="jellyfish-tentacle tentacle-e" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function CuteCrab({ movable = false, persistedStart, tankRef, tankSize, onPersistPosition }) {
  const crabFloorY = Math.max(110, tankSize.height - tankSize.height * 0.12 - BASE_CRAB_HEIGHT)
  const draggable = useDraggableSwimmer({
    tankRef,
    width: BASE_CRAB_WIDTH,
    height: BASE_CRAB_HEIGHT,
    minY: crabFloorY,
    maxYInset: 0.1,
    disabled: !movable,
    persistedStart,
    onPersistPosition,
  })
  const pose = useCreatureMotion({
    tankSize,
    width: BASE_CRAB_WIDTH,
    height: BASE_CRAB_HEIGHT,
    startX: 0.42,
    startY: 0.78,
    speed: 26,
    directionX: 1,
    directionY: 0,
    minY: crabFloorY,
    maxYInset: 0.1,
    pauseChance: 0.36,
    pauseMin: 0.8,
    pauseMax: 1.9,
    decisionMin: 1.3,
    decisionMax: 3.2,
    initialDecisionMin: 0.6,
    initialDecisionMax: 1.7,
    initialPauseMin: 0.2,
    initialPauseMax: 0.9,
    bounceVerticalJitter: 0,
    fixedY: crabFloorY,
    restartKey: draggable.restartKey,
    startOverride: draggable.startOverride,
  })
  const displayPosition = draggable.dragPosition ?? pose
  const talking = useTalkingBubble()

  return (
    <div
      className={`crab-swim ${pose.paused ? 'paused' : ''} ${draggable.dragging ? 'dragging' : ''}`}
      style={{
        '--swim-x': `${displayPosition.x}px`,
        '--swim-y': `${displayPosition.y}px`,
        '--crab-facing': pose.facing,
        '--crab-tilt': `${pose.tilt * 0.22}deg`,
      }}
      onPointerDown={movable ? (event) => draggable.startDragging(event, displayPosition, crabFloorY) : undefined}
      onClick={talking.showMessage}
      onKeyDown={talking.handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label="Cute crab"
    >
      {talking.isTalking ? <CreatureSpeechBubble message={talking.message} /> : null}
      <div className="crab-bob">
        <div className="crab-motion">
          <div className="crab">
            <div className="crab-claw claw-left" />
            <div className="crab-claw claw-right" />
            <div className="crab-body">
              <div className="crab-eye-stalk stalk-left">
                <span className="crab-eye">
                  <span className="crab-eye-spark" />
                </span>
              </div>
              <div className="crab-eye-stalk stalk-right">
                <span className="crab-eye">
                  <span className="crab-eye-spark" />
                </span>
              </div>
              <div className="crab-blush crab-blush-left" />
              <div className="crab-blush crab-blush-right" />
              <div className="crab-mouth" />
            </div>
            <div className="crab-legs" aria-hidden="true">
              <span className="crab-leg leg-a" />
              <span className="crab-leg leg-b" />
              <span className="crab-leg leg-c" />
              <span className="crab-leg leg-d" />
              <span className="crab-leg leg-e" />
              <span className="crab-leg leg-f" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function CutePufferfish({ movable = false, persistedStart, tankRef, tankSize, onPersistPosition }) {
  const draggable = useDraggableSwimmer({
    tankRef,
    width: BASE_PUFFER_WIDTH,
    height: BASE_PUFFER_HEIGHT,
    minY: 26,
    maxYInset: 0.22,
    disabled: !movable,
    persistedStart,
    onPersistPosition,
  })
  const pose = useCreatureMotion({
    tankSize,
    width: BASE_PUFFER_WIDTH,
    height: BASE_PUFFER_HEIGHT,
    startX: 0.56,
    startY: 0.34,
    speed: 34,
    directionX: -1,
    directionY: 0.16,
    minY: 26,
    maxYInset: 0.22,
    pauseChance: 0.28,
    pauseMin: 0.5,
    pauseMax: 1.4,
    decisionMin: 1.2,
    decisionMax: 3.2,
    initialDecisionMin: 0.8,
    initialDecisionMax: 2.2,
    initialPauseMin: 0.2,
    initialPauseMax: 0.7,
    bounceVerticalJitter: 8,
    restartKey: draggable.restartKey,
    startOverride: draggable.startOverride,
  })
  const displayPosition = draggable.dragPosition ?? pose
  const talking = useTalkingBubble()

  return (
    <div
      className={`puffer-swim ${pose.paused ? 'paused' : ''} ${draggable.dragging ? 'dragging' : ''}`}
      style={{
        '--swim-x': `${displayPosition.x}px`,
        '--swim-y': `${displayPosition.y}px`,
        '--puffer-facing': pose.facing,
        '--puffer-tilt': `${pose.tilt * 0.45}deg`,
      }}
      onPointerDown={movable ? (event) => draggable.startDragging(event, displayPosition) : undefined}
      onClick={talking.showMessage}
      onKeyDown={talking.handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label="Cute pufferfish"
    >
      {talking.isTalking ? <CreatureSpeechBubble message={talking.message} /> : null}
      <div className="puffer-bob">
        <div className="puffer-motion">
          <div className="pufferfish">
            <div className="puffer-tail" />
            <div className="puffer-fin dorsal" />
            <div className="puffer-fin side" />
            <div className="puffer-body">
              <div className="puffer-spots" aria-hidden="true">
                <span className="puffer-spot spot-a" />
                <span className="puffer-spot spot-b" />
                <span className="puffer-spot spot-c" />
                <span className="puffer-spot spot-d" />
              </div>
              <div className="puffer-eye puffer-eye-left">
                <span className="puffer-eye-spark" />
              </div>
              <div className="puffer-eye puffer-eye-right">
                <span className="puffer-eye-spark" />
              </div>
              <div className="puffer-cheek cheek-left" />
              <div className="puffer-cheek cheek-right" />
              <div className="puffer-mouth" />
              <div className="puffer-highlight" />
              <div className="puffer-spike spike-a" />
              <div className="puffer-spike spike-b" />
              <div className="puffer-spike spike-c" />
              <div className="puffer-spike spike-d" />
              <div className="puffer-spike spike-e" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function CuteStingray({ movable = false, persistedStart, tankRef, tankSize, onPersistPosition }) {
  const draggable = useDraggableSwimmer({
    tankRef,
    width: BASE_STINGRAY_WIDTH,
    height: BASE_STINGRAY_HEIGHT,
    minY: 34,
    maxYInset: 0.18,
    disabled: !movable,
    persistedStart,
    onPersistPosition,
  })
  const pose = useCreatureMotion({
    tankSize,
    width: BASE_STINGRAY_WIDTH,
    height: BASE_STINGRAY_HEIGHT,
    startX: 0.18,
    startY: 0.42,
    speed: 30,
    directionX: 1,
    directionY: -0.12,
    minY: 34,
    maxYInset: 0.18,
    pauseChance: 0.22,
    pauseMin: 0.4,
    pauseMax: 1.1,
    decisionMin: 1.5,
    decisionMax: 3.8,
    initialDecisionMin: 0.7,
    initialDecisionMax: 1.9,
    initialPauseMin: 0.1,
    initialPauseMax: 0.5,
    bounceVerticalJitter: 6,
    restartKey: draggable.restartKey,
    startOverride: draggable.startOverride,
  })
  const displayPosition = draggable.dragPosition ?? pose
  const talking = useTalkingBubble()

  return (
    <div
      className={`stingray-swim ${pose.paused ? 'paused' : ''} ${draggable.dragging ? 'dragging' : ''}`}
      style={{
        '--swim-x': `${displayPosition.x}px`,
        '--swim-y': `${displayPosition.y}px`,
        '--stingray-facing': pose.facing,
        '--stingray-tilt': `${pose.tilt * 0.35}deg`,
      }}
      onPointerDown={movable ? (event) => draggable.startDragging(event, displayPosition) : undefined}
      onClick={talking.showMessage}
      onKeyDown={talking.handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label="Cute stingray"
    >
      {talking.isTalking ? <CreatureSpeechBubble message={talking.message} /> : null}
      <div className="stingray-bob">
        <div className="stingray-motion">
          <div className="stingray">
            <div className="stingray-tail" />
            <div className="stingray-wing wing-left" />
            <div className="stingray-wing wing-right" />
            <div className="stingray-body">
              <div className="stingray-eye stingray-eye-left">
                <span className="stingray-eye-spark" />
              </div>
              <div className="stingray-eye stingray-eye-right">
                <span className="stingray-eye-spark" />
              </div>
              <div className="stingray-cheek cheek-left" />
              <div className="stingray-cheek cheek-right" />
              <div className="stingray-mouth" />
              <div className="stingray-highlight" />
              <div className="stingray-spots" aria-hidden="true">
                <span className="stingray-spot spot-a" />
                <span className="stingray-spot spot-b" />
                <span className="stingray-spot spot-c" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function CuteTurtle({ movable = false, persistedStart, tankRef, tankSize, onPersistPosition }) {
  const draggable = useDraggableSwimmer({
    tankRef,
    width: BASE_TURTLE_WIDTH,
    height: BASE_TURTLE_HEIGHT,
    minY: 40,
    maxYInset: 0.16,
    disabled: !movable,
    persistedStart,
    onPersistPosition,
  })
  const pose = useCreatureMotion({
    tankSize,
    width: BASE_TURTLE_WIDTH,
    height: BASE_TURTLE_HEIGHT,
    startX: 0.34,
    startY: 0.62,
    speed: 24,
    directionX: -1,
    directionY: -0.1,
    minY: 40,
    maxYInset: 0.16,
    pauseChance: 0.26,
    pauseMin: 0.5,
    pauseMax: 1.5,
    decisionMin: 1.6,
    decisionMax: 3.8,
    initialDecisionMin: 0.8,
    initialDecisionMax: 1.8,
    initialPauseMin: 0.2,
    initialPauseMax: 0.7,
    bounceVerticalJitter: 5,
    restartKey: draggable.restartKey,
    startOverride: draggable.startOverride,
  })
  const displayPosition = draggable.dragPosition ?? pose
  const talking = useTalkingBubble()

  return (
    <div
      className={`turtle-swim ${pose.paused ? 'paused' : ''} ${draggable.dragging ? 'dragging' : ''}`}
      style={{
        '--swim-x': `${displayPosition.x}px`,
        '--swim-y': `${displayPosition.y}px`,
        '--turtle-facing': pose.facing,
        '--turtle-tilt': `${pose.tilt * 0.35}deg`,
      }}
      onPointerDown={movable ? (event) => draggable.startDragging(event, displayPosition) : undefined}
      onClick={talking.showMessage}
      onKeyDown={talking.handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label="Cute turtle"
    >
      {talking.isTalking ? <CreatureSpeechBubble message={talking.message} /> : null}
      <div className="turtle-bob">
        <div className="turtle-motion">
          <div className="turtle">
            <div className="turtle-tail" />
            <div className="turtle-shell">
              <div className="turtle-shell-pattern" aria-hidden="true">
                <span className="shell-cell cell-a" />
                <span className="shell-cell cell-b" />
                <span className="shell-cell cell-c" />
                <span className="shell-cell cell-d" />
              </div>
              <div className="turtle-highlight" />
            </div>
            <div className="turtle-head">
              <div className="turtle-eye turtle-eye-left">
                <span className="turtle-eye-spark" />
              </div>
              <div className="turtle-eye turtle-eye-right">
                <span className="turtle-eye-spark" />
              </div>
              <div className="turtle-cheek cheek-left" />
              <div className="turtle-cheek cheek-right" />
              <div className="turtle-mouth" />
            </div>
            <div className="turtle-flipper flipper-front-top" />
            <div className="turtle-flipper flipper-front-bottom" />
            <div className="turtle-flipper flipper-back-top" />
            <div className="turtle-flipper flipper-back-bottom" />
          </div>
        </div>
      </div>
    </div>
  )
}

function MovableCoral({ coral, movable = false, position, dragging, onPointerDown }) {
  return (
    <div
      className={`coral-drag ${coral.color} ${dragging ? 'dragging' : ''}`}
      style={{
        '--coral-x': `${position.x}px`,
        '--coral-y': `${position.y}px`,
      }}
      onPointerDown={movable ? (event) => onPointerDown(event, coral.id) : undefined}
      aria-label={movable ? 'Draggable coral' : 'Coral decoration'}
    >
      <div className="coral-cluster">
        <div className="coral-branch branch-a" />
        <div className="coral-branch branch-b" />
        <div className="coral-branch branch-c" />
        <div className="coral-branch branch-d" />
        <div className="coral-base" />
      </div>
    </div>
  )
}

export default function AquariumScene({ ownedFish = [], playerId = '', movable = false }) {
  const tankRef = useRef(null)
  const [tankSize, setTankSize] = useState({ width: 0, height: 0 })
  const [contentScale, setContentScale] = useState(() => getTankContentScale(window.innerWidth))
  const [sceneState, setSceneState] = useState(() => readAquariumState(playerId))
  const [dragState, setDragState] = useState(null)
  const hasSelectedPlayer = Boolean(playerId)
  const purchasedFish = buildOwnedFishConfigs(ownedFish)
  const coralPositions = sceneState.coralPositions ?? {}
  const creatureStarts = sceneState.creatures ?? {}
  const hasSavedCreatures = Object.keys(creatureStarts).length > 0
  const hasSavedCorals = Object.keys(coralPositions).length > 0

  useEffect(() => {
    const storageKey = createAquariumStorageKey(playerId)

    if (!storageKey) {
      return
    }

    window.localStorage.setItem(storageKey, JSON.stringify(sceneState))
  }, [playerId, sceneState])

  const handlePersistCreaturePosition = (creatureId, position) => {
    if (!hasSelectedPlayer) {
      return
    }

    setSceneState((current) => ({
      ...current,
      creatures: {
        ...(current.creatures ?? {}),
        [creatureId]: position,
      },
    }))
  }

  useEffect(() => {
    const tank = tankRef.current

    if (!tank) {
      return undefined
    }

    const updateSize = () => {
      const { width, height } = tank.getBoundingClientRect()
      const nextContentScale = getTankContentScale(window.innerWidth)
      setTankSize({ width, height })
      setContentScale(nextContentScale)

      const scaledCoralWidth = CORAL_WIDTH * nextContentScale
      const scaledCoralHeight = CORAL_HEIGHT * nextContentScale
      const minX = 12
      const maxX = Math.max(minX, width - scaledCoralWidth - 12)
      const minY = Math.max(44, height * 0.42)
      const maxY = Math.max(minY, height - height * 0.14 - scaledCoralHeight)

      setSceneState((current) => {
        const currentCorals = current.coralPositions ?? {}
        const coralIds = Object.keys(currentCorals)

        if (!coralIds.length) {
          return current
        }

        const nextCorals = {}

        coralIds.forEach((coralId) => {
          const currentCoral = currentCorals[coralId]

          if (!currentCoral || currentCoral.x == null || currentCoral.y == null) {
            return
          }

          nextCorals[coralId] = {
            x: clamp(currentCoral.x, minX, maxX),
            y: clamp(currentCoral.y, minY, maxY),
          }
        })

        return {
          ...current,
          coralPositions: nextCorals,
        }
      })
    }

    updateSize()

    const observer = new ResizeObserver(updateSize)
    observer.observe(tank)

    return () => {
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    if (!dragState) {
      return undefined
    }

    const handlePointerMove = (event) => {
      const tank = tankRef.current

      if (!tank) {
        return
      }

      const rect = tank.getBoundingClientRect()
      const scaledCoralWidth = CORAL_WIDTH * contentScale
      const scaledCoralHeight = CORAL_HEIGHT * contentScale
      const minX = 12
      const maxX = Math.max(minX, rect.width - scaledCoralWidth - 12)
      const minY = Math.max(44, rect.height * 0.42)
      const maxY = Math.max(minY, rect.height - rect.height * 0.14 - scaledCoralHeight)
      const nextX = clamp(event.clientX - rect.left - dragState.offsetX, minX, maxX)
      const nextY = clamp(event.clientY - rect.top - dragState.offsetY, minY, maxY)

      setSceneState((current) => ({
        ...current,
        coralPositions: {
          ...(current.coralPositions ?? {}),
          [dragState.coralId]: {
            x: nextX,
            y: nextY,
          },
        },
      }))
    }

    const handlePointerUp = () => {
      setDragState(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [contentScale, dragState])

  const handleCoralPointerDown = (event, coralId) => {
    const tank = tankRef.current

    const currentCoral = coralPositions[coralId]

    if (!tank || !currentCoral || currentCoral.x == null || currentCoral.y == null) {
      return
    }

    const rect = tank.getBoundingClientRect()

    setDragState({
      coralId,
      offsetX: event.clientX - rect.left - currentCoral.x,
      offsetY: event.clientY - rect.top - currentCoral.y,
    })
  }

  return (
    <main className="app-shell">
      <section className="aquarium-scene" aria-label="Pixel aquarium">
        <div className="pixel-cloud cloud-a" aria-hidden="true" />
        <div className="pixel-cloud cloud-b" aria-hidden="true" />

        <div className="tank-wrap">
          <div className="tank-shadow" aria-hidden="true" />
          <div className="tank" ref={tankRef} style={{ '--tank-content-scale': contentScale }}>
            <div className="tank-content tank-scenery">
              <div className="pixel-grid" aria-hidden="true" />
              <div className="water-shine" aria-hidden="true" />
              <div className="water-ripple" aria-hidden="true" />
              <div className="pixel-bubbles" aria-hidden="true">
                <span className="bubble bubble-a" />
                <span className="bubble bubble-b" />
                <span className="bubble bubble-c" />
                <span className="bubble bubble-d" />
              </div>

              <div className="pixel-plant plant-a" aria-hidden="true" />
              <div className="pixel-plant plant-b" aria-hidden="true" />
              <div className="pixel-plant plant-c" aria-hidden="true" />
              <div className="pixel-plant plant-d" aria-hidden="true" />
              {hasSelectedPlayer &&
                hasSavedCorals &&
                coralDecorations.map((coral) => {
                  const position = coralPositions[coral.id]

                  if (!position || position.x == null || position.y == null) {
                    return null
                  }

                  return (
                    <MovableCoral
                      key={coral.id}
                      coral={coral}
                      movable={movable}
                      position={{
                        x: position.x / contentScale,
                        y: position.y / contentScale,
                      }}
                      dragging={dragState?.coralId === coral.id}
                      onPointerDown={handleCoralPointerDown}
                    />
                  )
                })}

              <div className="sand" aria-hidden="true" />
              <div className="rock rock-a" aria-hidden="true" />
              <div className="rock rock-b" aria-hidden="true" />
            </div>

            <div className="tank-content tank-animated">
              {hasSelectedPlayer && hasSavedCreatures && tankSize.width > 0 && (
                <CuteTurtle
                  movable={movable}
                  onPersistPosition={(position) => handlePersistCreaturePosition('turtle', position)}
                  persistedStart={creatureStarts.turtle ?? null}
                  tankRef={tankRef}
                  tankSize={tankSize}
                />
              )}
              {hasSelectedPlayer && hasSavedCreatures && tankSize.width > 0 && (
                <CuteStingray
                  movable={movable}
                  onPersistPosition={(position) => handlePersistCreaturePosition('stingray', position)}
                  persistedStart={creatureStarts.stingray ?? null}
                  tankRef={tankRef}
                  tankSize={tankSize}
                />
              )}
              {hasSelectedPlayer && hasSavedCreatures && tankSize.width > 0 && (
                <CutePufferfish
                  movable={movable}
                  onPersistPosition={(position) => handlePersistCreaturePosition('pufferfish', position)}
                  persistedStart={creatureStarts.pufferfish ?? null}
                  tankRef={tankRef}
                  tankSize={tankSize}
                />
              )}
              {hasSelectedPlayer && hasSavedCreatures && tankSize.width > 0 && (
                <CuteCrab
                  movable={movable}
                  onPersistPosition={(position) => handlePersistCreaturePosition('crab', position)}
                  persistedStart={creatureStarts.crab ?? null}
                  tankRef={tankRef}
                  tankSize={tankSize}
                />
              )}
              {hasSelectedPlayer && hasSavedCreatures && tankSize.width > 0 && (
                <CuteJellyfish
                  movable={movable}
                  onPersistPosition={(position) => handlePersistCreaturePosition('jellyfish', position)}
                  persistedStart={creatureStarts.jellyfish ?? null}
                  tankRef={tankRef}
                  tankSize={tankSize}
                />
              )}
              {hasSelectedPlayer && hasSavedCreatures && tankSize.width > 0 && (
                <CuteOctopus
                  movable={movable}
                  onPersistPosition={(position) => handlePersistCreaturePosition('octopus', position)}
                  persistedStart={creatureStarts.octopus ?? null}
                  tankRef={tankRef}
                  tankSize={tankSize}
                />
              )}

              {hasSelectedPlayer &&
                tankSize.width > 0 &&
                purchasedFish.map((fish) => (
                  <NaturalFish
                    key={fish.id}
                    fish={fish}
                    movable={movable}
                    onPersistPosition={(position) => handlePersistCreaturePosition(`owned-fish:${fish.id}`, position)}
                    persistedStart={creatureStarts[`owned-fish:${fish.id}`] ?? null}
                    tankRef={tankRef}
                    tankSize={tankSize}
                  />
                ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
