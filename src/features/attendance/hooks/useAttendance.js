import { useCallback, useEffect, useRef, useState } from 'react'
import { ATTENDANCE_STORAGE_KEY } from '../../app/constants.js'
import { fetchAttendanceRecords, syncAttendanceRecords } from '../../../services/api/attendanceService.js'

function parseAttendanceKey(key) {
  const [playerId, dateId] = String(key).split(':')

  if (!playerId || !dateId) {
    return null
  }

  return {
    dateId,
    playerId,
  }
}

function countPresentRecords(attendance) {
  return Object.values(attendance).filter(Boolean).length
}

function mergeForLocalStorage(attendance) {
  return {
    ...readSavedAttendance(),
    ...attendance,
  }
}

function createMissingLocalRecords(remoteAttendance) {
  return Object.entries(readSavedAttendance())
    .filter(([key, present]) => Boolean(present) && !(key in remoteAttendance))
    .map(([key]) => parseAttendanceKey(key))
    .filter(Boolean)
    .map((record) => ({
      ...record,
      present: true,
    }))
}

export function readSavedAttendance() {
  try {
    if (typeof window === 'undefined') {
      return {}
    }

    const savedValue = window.localStorage.getItem(ATTENDANCE_STORAGE_KEY)

    if (!savedValue) {
      return {}
    }

    const parsed = JSON.parse(savedValue)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function useAttendance({ accessToken = '', canSync = false, mergeLocalOnLoad = true } = {}) {
  const [attendance, setAttendance] = useState(() => (mergeLocalOnLoad ? readSavedAttendance() : {}))
  const [remoteAttendance, setRemoteAttendance] = useState({})
  const [attendanceLoading, setAttendanceLoading] = useState(false)
  const [attendanceMessage, setAttendanceMessage] = useState({ type: '', text: '' })
  const [localPresentCount, setLocalPresentCount] = useState(() => countPresentRecords(readSavedAttendance()))
  const [syncingAttendance, setSyncingAttendance] = useState(false)
  const migrationKeyRef = useRef('')

  const refreshAttendance = useCallback(async ({ mergeLocal = true } = {}) => {
    setAttendanceLoading(true)

    try {
      const data = await fetchAttendanceRecords()
      const nextRemoteAttendance = data.attendance ?? {}
      const localAttendance = readSavedAttendance()
      const shouldMergeLocal = mergeLocalOnLoad && mergeLocal
      const nextAttendance = shouldMergeLocal
        ? {
            ...localAttendance,
            ...nextRemoteAttendance,
          }
        : nextRemoteAttendance

      setRemoteAttendance(nextRemoteAttendance)
      setAttendance(nextAttendance)
      setLocalPresentCount(countPresentRecords(readSavedAttendance()))
      setAttendanceMessage({ type: '', text: '' })
      return nextAttendance
    } catch (error) {
      const fallbackAttendance = readSavedAttendance()
      const nextFallbackAttendance = mergeLocalOnLoad ? fallbackAttendance : {}

      setAttendance(nextFallbackAttendance)
      setAttendanceMessage({
        type: 'error',
        text: error.message || 'Unable to load saved attendance.',
      })
      return nextFallbackAttendance
    } finally {
      setAttendanceLoading(false)
    }
  }, [mergeLocalOnLoad])

  useEffect(() => {
    refreshAttendance()
  }, [refreshAttendance])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const nextSavedAttendance = mergeForLocalStorage(attendance)

    window.localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(nextSavedAttendance))
    setLocalPresentCount(countPresentRecords(nextSavedAttendance))
  }, [attendance])

  const syncLocalAttendance = useCallback(async ({ silent = false } = {}) => {
    if (!accessToken || !canSync) {
      return false
    }

    const missingLocalRecords = createMissingLocalRecords(remoteAttendance)

    if (!missingLocalRecords.length) {
      if (!silent) {
        setAttendanceMessage({
          type: 'success',
          text: 'No saved local checks need syncing.',
        })
      }

      return false
    }

    const migrationKey = missingLocalRecords
      .map((record) => `${record.playerId}:${record.dateId}`)
      .sort()
      .join('|')

    if (migrationKeyRef.current === migrationKey) {
      return false
    }

    migrationKeyRef.current = migrationKey
    setSyncingAttendance(true)

    try {
      const data = await syncAttendanceRecords(accessToken, missingLocalRecords)
      const nextRemoteAttendance = data.attendance ?? {}

      setRemoteAttendance(nextRemoteAttendance)
      setAttendance((current) => ({
        ...current,
        ...nextRemoteAttendance,
      }))
      if (!silent) {
        setAttendanceMessage({
          type: 'success',
          text: `${missingLocalRecords.length} saved attendance check${missingLocalRecords.length === 1 ? '' : 's'} synced.`,
        })
      }
      return true
    } catch (error) {
      migrationKeyRef.current = ''
      setAttendanceMessage({
        type: 'error',
        text: error.message || 'Unable to sync saved attendance.',
      })
      return false
    } finally {
      setSyncingAttendance(false)
    }
  }, [accessToken, canSync, remoteAttendance])

  useEffect(() => {
    syncLocalAttendance({ silent: true })
  }, [syncLocalAttendance])

  const setAttendanceValue = (key, value) => {
    setAttendance((current) => ({
      ...current,
      [key]: value,
    }))
  }

  return {
    attendance,
    attendanceLoading,
    attendanceMessage,
    localPresentCount,
    refreshAttendance,
    setAttendanceValue,
    syncingAttendance,
    syncLocalAttendance,
  }
}
