import { useEffect, useState } from 'react'
import { normalizeProgram } from '../../../../shared/program.js'
import { fetchProgram, fetchSongLibrary, saveProgram } from '../../../services/api/programService.js'

const DRAFT_KEY = 'aquarium-program-draft:v1'
function readDraft() {
  try { return normalizeProgram(JSON.parse(localStorage.getItem(DRAFT_KEY))) } catch { return null }
}

export function useProgram() {
  const [program, setProgram] = useState(null)
  const [library, setLibrary] = useState({ songs: [], folder: '' })
  const [error, setError] = useState('')
  const [libraryError, setLibraryError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [savedAt, setSavedAt] = useState(-1)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    let current = true
    fetchProgram().then(({ program: saved }) => {
      if (!current) return
      const draft = readDraft()
      setSavedAt(saved.updatedAt)
      setProgram(draft && draft.updatedAt > saved.updatedAt ? draft : saved)
    }).catch((failure) => { if (current) setError(failure.message) })
    return () => { current = false }
  }, [])

  useEffect(() => {
    if (!program || program.updatedAt <= savedAt) return
    let current = true
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(program)) } catch { /* Disk saving still runs if browser storage is full. */ }
    const timer = setTimeout(() => {
      saveProgram(program).then(({ program: saved }) => {
        if (current) { setSavedAt(saved.updatedAt); setError('') }
      }).catch((failure) => { if (current) setError(failure.message) })
    }, 300)
    return () => { current = false; clearTimeout(timer) }
  }, [program, retry, savedAt])

  useEffect(() => {
    let current = true
    fetchSongLibrary().then((data) => { if (current) setLibrary(data) })
      .catch((failure) => { if (current) setLibraryError(failure.message) })
    return () => { current = false }
  }, [])

  async function refreshLibrary() {
    setRefreshing(true)
    try { setLibrary(await fetchSongLibrary()); setLibraryError('') }
    catch (failure) { setLibraryError(failure.message) }
    finally { setRefreshing(false) }
  }
  function update(change) {
    setError('')
    setProgram((current) => ({ ...current, ...change(current), updatedAt: Math.max(Date.now(), current.updatedAt + 1) }))
  }
  return { program, update, library, libraryError, refreshLibrary, refreshing, error, saved: program?.updatedAt <= savedAt, retrySave: () => setRetry((value) => value + 1) }
}
