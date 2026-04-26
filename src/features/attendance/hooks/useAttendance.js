import { useEffect, useState } from 'react'
import { ATTENDANCE_STORAGE_KEY } from '../../app/constants.js'

function readSavedAttendance() {
  try {
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

export function useAttendance() {
  const [attendance, setAttendance] = useState(readSavedAttendance)

  useEffect(() => {
    window.localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(attendance))
  }, [attendance])

  const setAttendanceValue = (key, value) => {
    setAttendance((current) => ({
      ...current,
      [key]: value,
    }))
  }

  return {
    attendance,
    setAttendanceValue,
  }
}
