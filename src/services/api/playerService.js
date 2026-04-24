import { requestJson } from './http.js'

function createAuthHeaders(accessToken) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  }
}

export function fetchPublicPlayers() {
  return requestJson('/api/public-players')
}

export function fetchPlayerAquarium(playerId) {
  return requestJson(`/api/public-player-aquarium?playerId=${encodeURIComponent(playerId)}`)
}

export function fetchAdminPlayers(accessToken) {
  return requestJson('/api/admin-players', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
}

export function createPlayer(accessToken, payload) {
  return requestJson('/api/create-player', {
    method: 'POST',
    headers: createAuthHeaders(accessToken),
    body: JSON.stringify(payload),
  })
}

export function adjustPlayerGold(accessToken, payload) {
  return requestJson('/api/adjust-player-gold', {
    method: 'POST',
    headers: createAuthHeaders(accessToken),
    body: JSON.stringify(payload),
  })
}

export function deletePlayer(accessToken, playerId) {
  return requestJson('/api/delete-player', {
    method: 'POST',
    headers: createAuthHeaders(accessToken),
    body: JSON.stringify({
      playerId,
    }),
  })
}
