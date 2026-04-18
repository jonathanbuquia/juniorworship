import {
  allowMethods,
  createServiceClient,
  parseBody,
  requireAdmin,
  sendJson,
} from './_lib/supabase.js'

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
    const amount = Number(body.amount)

    if (!playerId) {
      return sendJson(res, 400, { error: 'A player must be selected.' })
    }

    if (!Number.isInteger(amount) || amount === 0) {
      return sendJson(res, 400, { error: 'Gold change must be a whole number that is not zero.' })
    }

    const { data: player, error: playerError } = await admin
      .from('profiles')
      .select('id, display_name, login_name, gold, role')
      .eq('id', playerId)
      .single()

    if (playerError || !player) {
      return sendJson(res, 404, { error: 'That player account could not be found.' })
    }

    if (player.role !== 'player') {
      return sendJson(res, 400, { error: 'Only player accounts can have their gold adjusted here.' })
    }

    const nextGold = player.gold + amount

    if (nextGold < 0) {
      return sendJson(res, 400, {
        error: `${player.display_name || 'This player'} only has ${player.gold} gold right now.`,
      })
    }

    const { data: updatedPlayer, error: updateError } = await admin
      .from('profiles')
      .update({ gold: nextGold })
      .eq('id', playerId)
      .select('id, display_name, login_name, gold, role, created_at')
      .single()

    if (updateError || !updatedPlayer) {
      return sendJson(res, 400, { error: updateError?.message || 'Unable to update player gold.' })
    }

    return sendJson(res, 200, {
      amount,
      player: updatedPlayer,
    })
  } catch (error) {
    return sendJson(res, 500, { error: error.message || 'Unable to adjust player gold.' })
  }
}
