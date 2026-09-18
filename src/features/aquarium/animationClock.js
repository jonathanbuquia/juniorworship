// One clock for all swimmers, with no catch-up jump after restoring the app.
export function createAnimationClock({ requestFrame, cancelFrame, now, visibility }) {
  const listeners = new Set()
  let frameId = null
  let previousTime = null

  function schedule() {
    if (frameId === null && listeners.size && !visibility.hidden) {
      frameId = requestFrame(tick)
    }
  }

  function tick(time) {
    frameId = null
    const delta = previousTime === null ? 0 : Math.min((time - previousTime) / 1000, 0.05)
    previousTime = time
    for (const listener of listeners) listener(delta)
    schedule()
  }

  function onVisibilityChange() {
    if (frameId !== null) cancelFrame(frameId)
    frameId = null
    previousTime = null
    schedule()
  }

  return {
    subscribe(listener) {
      if (!listeners.size) {
        previousTime = now()
        visibility.addEventListener('visibilitychange', onVisibilityChange)
      }
      listeners.add(listener)
      schedule()

      return () => {
        listeners.delete(listener)
        if (!listeners.size) {
          if (frameId !== null) cancelFrame(frameId)
          frameId = null
          previousTime = null
          visibility.removeEventListener('visibilitychange', onVisibilityChange)
        }
      }
    },
  }
}

let aquariumClock

export function subscribeCreatureAnimation(listener) {
  aquariumClock ??= createAnimationClock({
    requestFrame: (callback) => window.requestAnimationFrame(callback),
    cancelFrame: (id) => window.cancelAnimationFrame(id),
    now: () => performance.now(),
    visibility: document,
  })
  return aquariumClock.subscribe(listener)
}
