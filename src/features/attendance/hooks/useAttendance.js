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

export function useAttendance({ accessToken = '', canSync = false } = {}) {
  const [attendance, setAttendance] = useState(readSavedAttendance)
  const [remoteAttendance, setRemoteAttendance] = useState({})
  const [attendanceLoading, setAttendanceLoading] = useState(false)
  const [attendanceMessage, setAttendanceMessage] = useState({ type: '', text: '' })
  const migrationKeyRef = useRef('')

  const refreshAttendance = useCallback(async ({ mergeLocal = true } = {}) => {
    setAttendanceLoading(true)

    try {
      const data = await fetchAttendanceRecords()
      const nextRemoteAttendance = data.attendance ?? {}
      const localAttendance = readSavedAttendance()
      const nextAttendance = mergeLocal
        ? {
            ...localAttendance,
            ...nextRemoteAttendance,
          }
        : nextRemoteAttendance

      setRemoteAttendance(nextRemoteAttendance)
      setAttendance(nextAttendance)
      setAttendanceMessage({ type: '', text: '' })
      return nextAttendance
    } catch (error) {
      const fallbackAttendance = readSavedAttendance()

      setAttendance(fallbackAttendance)
      setAttendanceMessage({
        type: 'error',
        text: error.message || 'Unable to load saved attendance.',
      })
      return fallbackAttendance
    } finally {
      setAttendanceLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshAttendance()
  }, [refreshAttendance])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(attendance))
  }, [attendance])

  useEffect(() => {
    if (!accessToken || !canSync) {
      return
    }

    const missingLocalRecords = Object.entries(readSavedAttendance())
      .filter(([key, present]) => Boolean(present) && !(key in remoteAttendance))
      .map(([key]) => parseAttendanceKey(key))
      .filter(Boolean)
      .map((record) => ({
        ...record,
        present: true,
      }))

    if (!missingLocalRecords.length) {
      return
    }

    const migrationKey = missingLocalRecords
      .map((record) => `${record.playerId}:${record.dateId}`)
      .sort()
      .join('|')

    if (migrationKeyRef.current === migrationKey) {
      return
    }

    migrationKeyRef.current = migrationKey

    syncAttendanceRecords(accessToken, missingLocalRecords)
      .then((data) => {
        const nextRemoteAttendance = data.attendance ?? {}

        setRemoteAttendance(nextRemoteAttendance)
        setAttendance((current) => ({
          ...current,
          ...nextRemoteAttendance,
        }))
      })
      .catch((error) => {
        setAttendanceMessage({
          type: 'error',
          text: error.message || 'Unable to sync saved attendance.',
        })
      })
  }, [accessToken, canSync, remoteAttendance])

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
    refreshAttendance,
    setAttendanceValue,
  }
}
