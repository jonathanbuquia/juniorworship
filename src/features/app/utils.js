export function normalizeLoginName(value) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function isAdminProfile(profile) {
  return profile?.role === 'admin'
}

export function createEmptyMessage() {
  return {
    type: '',
    text: '',
  }
}

export function formatGoldChange(amount) {
  return amount > 0 ? `+${amount}` : `${amount}`
}

export function mergeViewedPlayer(player, profile) {
  if (!player) {
    return null
  }

  if (profile?.id === player.id && profile.role === 'player') {
    return {
      ...player,
      gold: profile.gold ?? player.gold,
      display_name: profile.display_name ?? player.display_name,
      login_name: profile.login_name ?? player.login_name,
    }
  }

  return player
}
