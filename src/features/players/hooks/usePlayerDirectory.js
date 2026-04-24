import { useCallback, useEffect, useMemo, useState } from 'react'
import { mergeViewedPlayer } from '../../app/utils.js'
import {
  fetchAdminPlayers,
  fetchPlayerAquarium,
  fetchPublicPlayers,
} from '../../../services/api/playerService.js'
import { hasSupabaseEnv } from '../../../lib/supabase.js'

export function usePlayerDirectory({ accessToken, profile }) {
  const [playersLoading, setPlayersLoading] = useState(false)
  const [playersMessage, setPlayersMessage] = useState({ type: '', text: '' })
  const [players, setPlayers] = useState([])
  const [publicPlayers, setPublicPlayers] = useState([])
  const [aquariumFish, setAquariumFish] = useState([])
  const [selectedPlayerId, setSelectedPlayerId] = useState('')
  const [viewedPlayerId, setViewedPlayerId] = useState('')
  const [shopPlayerId, setShopPlayerId] = useState('')

  const loadPublicPlayers = useCallback(
    async ({ preferredPlayerId = '', preserveSelection = true } = {}) => {
      if (!hasSupabaseEnv) {
        setPublicPlayers([])
        setViewedPlayerId('')
        return
      }

      try {
        const data = await fetchPublicPlayers()
        const nextPlayers = data.players ?? []

        setPublicPlayers(nextPlayers)

        const preferredId = preferredPlayerId || (preserveSelection ? viewedPlayerId : '')
        const hasPreferred = nextPlayers.some((player) => player.id === preferredId)

        setViewedPlayerId(hasPreferred ? preferredId : '')
      } catch (error) {
        setPlayersMessage({
          type: 'error',
          text: error.message,
        })
      }
    },
    [viewedPlayerId],
  )

  const loadPlayers = useCallback(
    async ({ preferredPlayerId = '', preserveSelection = true } = {}) => {
      if (!accessToken) {
        return
      }

      setPlayersLoading(true)
      setPlayersMessage({ type: '', text: '' })

      try {
        const data = await fetchAdminPlayers(accessToken)
        const nextPlayers = data.players ?? []

        setPlayers(nextPlayers)

        const preferredId = preferredPlayerId || (preserveSelection ? selectedPlayerId : '')
        const playerExists = nextPlayers.some((player) => player.id === preferredId)

        if (playerExists) {
          setSelectedPlayerId(preferredId)
        } else if (nextPlayers.length) {
          setSelectedPlayerId(nextPlayers[0].id)
        } else {
          setSelectedPlayerId('')
        }
      } catch (error) {
        setPlayersMessage({
          type: 'error',
          text: error.message,
        })
      } finally {
        setPlayersLoading(false)
      }
    },
    [accessToken, selectedPlayerId],
  )

  const loadViewedPlayerAquarium = useCallback(async (playerId) => {
    if (!playerId) {
      setAquariumFish([])
      return
    }

    try {
      const data = await fetchPlayerAquarium(playerId)
      setAquariumFish(data.fish ?? [])
    } catch {
      setAquariumFish([])
    }
  }, [])

  const applyPlayerUpdate = useCallback((updatedPlayer) => {
    if (!updatedPlayer) {
      return
    }

    setPlayers((current) => current.map((player) => (player.id === updatedPlayer.id ? { ...player, ...updatedPlayer } : player)))
    setPublicPlayers((current) =>
      current.map((player) => (player.id === updatedPlayer.id ? { ...player, ...updatedPlayer } : player)),
    )
  }, [])

  const applyPlayerUpdates = useCallback((updatedPlayers) => {
    const playerMap = new Map((updatedPlayers ?? []).map((player) => [player.id, player]))

    if (!playerMap.size) {
      return
    }

    setPlayers((current) =>
      current.map((player) => (playerMap.has(player.id) ? { ...player, ...playerMap.get(player.id) } : player)),
    )
    setPublicPlayers((current) =>
      current.map((player) => (playerMap.has(player.id) ? { ...player, ...playerMap.get(player.id) } : player)),
    )
  }, [])

  const resetPlayerDirectory = useCallback(() => {
    setPlayers([])
    setPublicPlayers([])
    setAquariumFish([])
    setSelectedPlayerId('')
    setViewedPlayerId('')
    setShopPlayerId('')
    setPlayersMessage({ type: '', text: '' })
  }, [])

  useEffect(() => {
    loadPublicPlayers()
  }, [loadPublicPlayers])

  useEffect(() => {
    if (profile?.role !== 'player') {
      return
    }

    if (publicPlayers.some((player) => player.id === profile.id)) {
      setViewedPlayerId(profile.id)
    }
  }, [profile, publicPlayers])

  useEffect(() => {
    if (!publicPlayers.length) {
      setShopPlayerId('')
      return
    }

    if (!publicPlayers.some((player) => player.id === shopPlayerId)) {
      setShopPlayerId('')
    }
  }, [publicPlayers, shopPlayerId])

  useEffect(() => {
    loadViewedPlayerAquarium(viewedPlayerId)
  }, [loadViewedPlayerAquarium, viewedPlayerId])

  const selectedPlayer = useMemo(
    () => players.find((player) => player.id === selectedPlayerId) ?? null,
    [players, selectedPlayerId],
  )

  const shopPlayer = useMemo(
    () => publicPlayers.find((player) => player.id === shopPlayerId) ?? null,
    [publicPlayers, shopPlayerId],
  )

  const viewedPlayer = useMemo(() => {
    const currentPlayer = publicPlayers.find((player) => player.id === viewedPlayerId) ?? null
    return mergeViewedPlayer(currentPlayer, profile)
  }, [profile, publicPlayers, viewedPlayerId])

  return {
    aquariumFish,
    applyPlayerUpdate,
    applyPlayerUpdates,
    loadPlayers,
    loadPublicPlayers,
    loadViewedPlayerAquarium,
    players,
    playersLoading,
    playersMessage,
    publicPlayers,
    resetPlayerDirectory,
    selectedPlayer,
    selectedPlayerId,
    setPlayersMessage,
    setSelectedPlayerId,
    setShopPlayerId,
    setViewedPlayerId,
    shopPlayer,
    shopPlayerId,
    viewedPlayer,
    viewedPlayerId,
  }
}
