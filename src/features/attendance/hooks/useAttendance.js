import { useCallback, useEffect, useState } from 'react'
import { ATTENDANCE_STORAGE_KEY } from '../../app/constants.js'
import { fetchAttendanceRecords } from '../../../services/api/attendanceService.js'

function mergeForLocalStorage(attendance) {
  return {
    ...readSavedAttendance(),
    ...attendance,
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

export function useAttendance({ mergeLocalOnLoad = true } = {}) {
  const [attendance, setAttendance] = useState(() => (mergeLocalOnLoad ? readSavedAttendance() : {}))
  const [attendanceLoading, setAttendanceLoading] = useState(false)
  const [attendanceMessage, setAttendanceMessage] = useState({ type: '', text: '' })

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

      setAttendance(nextAttendance)
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
  }, [attendance])

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
