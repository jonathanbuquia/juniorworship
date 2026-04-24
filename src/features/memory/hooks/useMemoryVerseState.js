import { useEffect, useState } from 'react'
import {
  createEmptyActiveMemoryVerse,
  createEmptyMemoryVerseForm,
} from '../memoryUtils.js'
import { MEMORY_VERSE_STORAGE_KEY } from '../../app/constants.js'

function getInitialMemoryVerseState() {
  try {
    const savedValue = window.localStorage.getItem(MEMORY_VERSE_STORAGE_KEY)

    if (!savedValue) {
      return {
        activeMemoryVerse: createEmptyActiveMemoryVerse(),
        memoryVerseEditorOpen: true,
        memoryVerseForm: createEmptyMemoryVerseForm(),
      }
    }

    const parsed = JSON.parse(savedValue)
    const activeMemoryVerse = parsed.active || createEmptyActiveMemoryVerse()

    return {
      activeMemoryVerse,
      memoryVerseEditorOpen: !(activeMemoryVerse.reference || activeMemoryVerse.text),
      memoryVerseForm: parsed.form || createEmptyMemoryVerseForm(),
    }
  } catch {
    return {
      activeMemoryVerse: createEmptyActiveMemoryVerse(),
      memoryVerseEditorOpen: true,
      memoryVerseForm: createEmptyMemoryVerseForm(),
    }
  }
}

export function useMemoryVerseState() {
  const initialState = getInitialMemoryVerseState()
  const [memoryVerseForm, setMemoryVerseForm] = useState(initialState.memoryVerseForm)
  const [activeMemoryVerse, setActiveMemoryVerse] = useState(initialState.activeMemoryVerse)
  const [memoryVerseEditorOpen, setMemoryVerseEditorOpen] = useState(initialState.memoryVerseEditorOpen)
  const [memoryRewardsOpen, setMemoryRewardsOpen] = useState(false)
  const [memoryControlsOpen, setMemoryControlsOpen] = useState(true)
  const [memoryFontScale, setMemoryFontScale] = useState(1.6)
  const [isMemoryFullscreen, setIsMemoryFullscreen] = useState(false)

  useEffect(() => {
    window.localStorage.setItem(
      MEMORY_VERSE_STORAGE_KEY,
      JSON.stringify({
        active: activeMemoryVerse,
        form: memoryVerseForm,
      }),
    )
  }, [activeMemoryVerse, memoryVerseForm])

  return {
    activeMemoryVerse,
    isMemoryFullscreen,
    memoryControlsOpen,
    memoryFontScale,
    memoryRewardsOpen,
    memoryVerseEditorOpen,
    memoryVerseForm,
    setActiveMemoryVerse,
    setIsMemoryFullscreen,
    setMemoryControlsOpen,
    setMemoryFontScale,
    setMemoryRewardsOpen,
    setMemoryVerseEditorOpen,
    setMemoryVerseForm,
  }
}
