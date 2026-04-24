import { requestJson } from './http.js'

export function fetchAdminStatus() {
  return requestJson('/api/admin-status')
}

export function loginAdmin(credentials) {
  return requestJson('/api/login-player', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  })
}

export function bootstrapAdminAccount(payload) {
  return requestJson('/api/bootstrap-admin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
}
