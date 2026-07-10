import { requestJson } from './http.js'

function createAuthHeaders(accessToken) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  }
}

export function fetchAttendanceRecords() {
  return requestJson('/api/attendance-records')
}

export function saveAttendanceRecord(accessToken, payload) {
  return requestJson('/api/attendance-records', {
    method: 'POST',
    headers: createAuthHeaders(accessToken),
    body: JSON.stringify(payload),
  })
}

export function syncAttendanceRecords(accessToken, records) {
  return requestJson('/api/attendance-records', {
    method: 'POST',
    headers: createAuthHeaders(accessToken),
    body: JSON.stringify({ records }),
  })
}
