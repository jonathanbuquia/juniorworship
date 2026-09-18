import assert from 'node:assert/strict'
import test from 'node:test'
import { createAnimationClock } from '../src/features/aquarium/animationClock.js'

test('swimmers share a clock, pause while hidden, resume without catch-up, and clean up', () => {
  let nextId = 0
  const frames = new Map()
  const visibility = new EventTarget()
  visibility.hidden = false
  const clock = createAnimationClock({
    requestFrame: (callback) => { frames.set(++nextId, callback); return nextId },
    cancelFrame: (id) => frames.delete(id),
    now: () => 0,
    visibility,
  })
  const advance = (time) => {
    const callbacks = [...frames.values()]
    frames.clear()
    for (const callback of callbacks) callback(time)
  }
  const first = []
  const second = []
  const stopFirst = clock.subscribe((delta) => first.push(delta))
  const stopSecond = clock.subscribe((delta) => second.push(delta))
  assert.equal(frames.size, 1)
  advance(16)
  assert.deepEqual(first, [0.016])
  assert.deepEqual(second, first)
  assert.equal(frames.size, 1)

  visibility.hidden = true
  visibility.dispatchEvent(new Event('visibilitychange'))
  assert.equal(frames.size, 0)
  advance(10000)
  assert.equal(first.length, 1)

  visibility.hidden = false
  visibility.dispatchEvent(new Event('visibilitychange'))
  assert.equal(frames.size, 1)
  advance(20000)
  assert.equal(first.at(-1), 0)
  advance(20016)
  assert.equal(first.at(-1), 0.016)
  advance(21000)
  assert.equal(first.at(-1), 0.05)

  stopFirst()
  advance(21016)
  assert.equal(second.length, first.length + 1)
  stopSecond()
  assert.equal(frames.size, 0)
  visibility.dispatchEvent(new Event('visibilitychange'))
  assert.equal(frames.size, 0)
})
