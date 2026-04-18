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

  const { data, error } = await admin
    .rpc('buy_shop_item', {
      p_item_id: itemId,
      p_user_id: user.id,
    })
    .single()

  if (error) {
    return sendJson(res, 400, {
      error: error.message || 'The purchase could not be completed.',
    })
  }

  return sendJson(res, 200, {
    itemId: data.item_id,
    itemName: data.item_name,
    gold: data.gold,
    quantity: data.quantity,
  })
}
