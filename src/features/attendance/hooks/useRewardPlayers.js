import { useEffect, useState } from 'react'
import { fetchPresentRewardPlayers } from '../../../services/api/rewardPlayersService.js'
import { getAttendanceDateKey } from '../rewardAttendance.js'

export function useRewardPlayers({ enabled, refreshKey, players }) {
  const [state, setState] = useState({ ids: [], scope: '', message: { type: '', text: '' } })
  const scope = `${enabled}:${refreshKey}:${getAttendanceDateKey()}`
  useEffect(() => {
    if (!enabled) return
    let disposed = false
    let request = 0
    async function refresh() {
      const current = ++request
      try {
        const present = await fetchPresentRewardPlayers()
        if (!disposed && current === request) setState({ ids: present.map((player) => player.id), scope, message: { type: '', text: '' } })
      } catch (error) {
        if (!disposed && current === request) setState({ ids: [], scope, message: { type: 'error', text: error.message || 'Unable to load today\'s attendance.' } })
      }
    }
    refresh()
    const timer = window.setInterval(refresh, 60_000)
    window.addEventListener('focus', refresh)
    return () => { disposed = true; window.clearInterval(timer); window.removeEventListener('focus', refresh) }
  }, [enabled, scope])
  return {
    players: enabled && state.scope === scope ? players.filter((player) => !player.attendance_hidden && state.ids.includes(player.id)) : [],
    loading: enabled && state.scope !== scope,
    message: state.scope === scope ? state.message : { type: '', text: '' },
  }
}
