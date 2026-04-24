/* global process */

import { createClient } from '@supabase/supabase-js'

function sendJson(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function readItemId(body) {
  if (!body) {
    return null
  }

  if (typeof body === 'string') {
    const parsed = JSON.parse(body)
    return Number(parsed.itemId)
  }

  return Number(body.itemId)
}

async function updateInventory(admin, { itemId, playerId }) {
  const { data: itemRecord, error: itemError } = await admin
    .from('shop_items')
    .select('id, name, price')
    .eq('id', itemId)
    .single()

  if (itemError || !itemRecord) {
    return { error: itemError?.message || 'That shop item could not be found.', status: 400 }
  }

  const { data: player, error: playerError } = await admin
    .from('profiles')
    .select('id, gold')
    .eq('id', playerId)
    .single()

  if (playerError || !player) {
    return { error: playerError?.message || 'Your profile could not be loaded.', status: 400 }
  }

  if (player.gold < itemRecord.price) {
    return { error: 'Not enough gold for that item.', status: 400 }
  }

  const nextGold = player.gold - itemRecord.price
  const { data: updatedPlayer, error: goldError } = await admin
    .from('profiles')
    .update({
      gold: nextGold,
    })
    .eq('id', playerId)
    .eq('gold', player.gold)
    .select('gold')
    .single()

  if (goldError || !updatedPlayer) {
    return { error: goldError?.message || 'The purchase could not be completed.', status: 400 }
  }

  const { data: existingInventory, error: inventoryLookupError } = await admin
    .from('inventory')
    .select('id, quantity')
    .eq('user_id', playerId)
    .eq('item_id', itemId)
    .maybeSingle()

  if (inventoryLookupError) {
    await admin
      .from('profiles')
      .update({
        gold: player.gold,
      })
      .eq('id', playerId)

    return { error: inventoryLookupError.message || 'The purchase could not be completed.', status: 400 }
  }

  let quantity = 1

  if (existingInventory?.id) {
    quantity = (existingInventory.quantity ?? 0) + 1

    const { error: inventoryUpdateError } = await admin
      .from('inventory')
      .update({
        quantity,
      })
      .eq('id', existingInventory.id)

    if (inventoryUpdateError) {
      await admin
        .from('profiles')
        .update({
          gold: player.gold,
        })
        .eq('id', playerId)

      return { error: inventoryUpdateError.message || 'The purchase could not be completed.', status: 400 }
    }
  } else {
    const { error: inventoryInsertError } = await admin
      .from('inventory')
      .insert({
        item_id: itemId,
        quantity,
        user_id: playerId,
      })

    if (inventoryInsertError) {
      await admin
        .from('profiles')
        .update({
          gold: player.gold,
        })
        .eq('id', playerId)

      return { error: inventoryInsertError.message || 'The purchase could not be completed.', status: 400 }
    }
  }

  await admin.from('purchase_log').insert({
    item_id: itemId,
    price_paid: itemRecord.price,
    user_id: playerId,
  })

  return {
    data: {
      gold: updatedPlayer.gold,
      itemId: itemRecord.id,
      itemName: itemRecord.name,
      quantity,
    },
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendJson(res, 405, { error: 'Method not allowed.' })
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return sendJson(res, 500, {
      error: 'Server env is missing Supabase configuration.',
    })
  }

  const authHeader = req.headers.authorization || ''
  const accessToken = authHeader.replace(/^Bearer\s+/i, '').trim()

  if (!accessToken) {
    return sendJson(res, 401, { error: 'Missing access token.' })
  }

  let itemId

  try {
    itemId = readItemId(req.body)
  } catch {
    return sendJson(res, 400, { error: 'Request body must be valid JSON.' })
  }

  if (!Number.isInteger(itemId) || itemId <= 0) {
    return sendJson(res, 400, { error: 'A valid itemId is required.' })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const {
    data: { user },
    error: authError,
  } = await admin.auth.getUser(accessToken)

  if (authError || !user) {
    return sendJson(res, 401, { error: 'Your session is not valid anymore.' })
  }

  const result = await updateInventory(admin, {
    itemId,
    playerId: user.id,
  })

  if (result.error) {
    return sendJson(res, 400, {
      error: result.error || 'The purchase could not be completed.',
    })
  }

  return sendJson(res, 200, {
    itemId: result.data.itemId,
    itemName: result.data.itemName,
    gold: result.data.gold,
    quantity: result.data.quantity,
  })
}
