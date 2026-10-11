import { useEffect, useState } from 'react'

const MIN_SIZE = 50
const MAX_SIZE = 200

// SongPlayer is keyed by song ID, so each selection restores its own size.
export function useLyricFontSize(songId) {
  const storageKey = `aquarium-lyric-size:v1:${songId}`
  const [size, setSize] = useState(() => {
    try {
      const saved = Number(localStorage.getItem(storageKey))
      return Number.isInteger(saved) && saved >= MIN_SIZE && saved <= MAX_SIZE ? saved : 100
    } catch { return 100 }
  })

  useEffect(() => {
    try { localStorage.setItem(storageKey, String(size)) }
    catch { /* Font controls still work if local storage is unavailable. */ }
  }, [size, storageKey])

  return {
    size,
    canShrink: size > MIN_SIZE,
    canGrow: size < MAX_SIZE,
    shrink: () => setSize((current) => Math.max(MIN_SIZE, current - 10)),
    grow: () => setSize((current) => Math.min(MAX_SIZE, current + 10)),
    reset: () => setSize(100),
  }
}
