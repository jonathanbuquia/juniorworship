import { requestJson } from './http.js'

function createAuthHeaders(accessToken) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  }
}

export function buyItemForPlayer(accessToken, payload) {
  return requestJson('/api/admin-buy-item', {
    method: 'POST',
    headers: createAuthHeaders(accessToken),
    body: JSON.stringify(payload),
  })
}
