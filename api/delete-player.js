import { allowMethods, createServiceClient, parseBody, requireAdmin, sendJson } from './_lib/supabase.js'

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) {
    return
  }

  try {
    const admin = createServiceClient()
    const adminResult = await requireAdmin(req, admin)

    if (adminResult.error) {
      return sendJson(res, adminResult.status, { error: adminResult.error })
    }

    const body = parseBody(req.body)
    const playerId = String(body.playerId || '').trim()

    if (!playerId) {
      return sendJson(res, 400, { error: 'Player id is required.' })
    }

    const { data: player, error: playerError } = await admin
      .from('profiles')
      .select('id, display_name, role')
      .eq('id', playerId)
      .single()

    if (playerError || !player) {
      return sendJson(res, 404, { error: 'That player account could not be found.' })
    }

    if (player.role !== 'player') {
      return sendJson(res, 400, { error: 'Only player accounts can be deleted here.' })
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(playerId)

    if (deleteError) {
      return sendJson(res, 400, { error: deleteError.message || 'Unable to delete the player account.' })
    }

    return sendJson(res, 200, {
      player: {
        id: player.id,
        display_name: player.display_name,
      },
    })
  } catch (error) {
    return sendJson(res, 500, { error: error.message || 'Unable to delete the player account.' })
  }
}
