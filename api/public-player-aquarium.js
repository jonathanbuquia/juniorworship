import { allowMethods, createServiceClient, sendJson } from './_lib/supabase.js'

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['GET'])) {
    return
  }

  const playerId = String(req.query?.playerId || '').trim()

  if (!playerId) {
    return sendJson(res, 400, { error: 'A playerId is required.' })
  }

  try {
    const admin = createServiceClient()
    const { data, error } = await admin
      .from('inventory')
      .select('quantity, shop_items!inner(slug, name)')
      .eq('user_id', playerId)
      .gt('quantity', 0)
      .order('created_at', { ascending: true })

    if (error) {
      return sendJson(res, 400, { error: error.message || 'Unable to load aquarium items.' })
    }

    const fish = (data ?? []).map((entry) => ({
      name: entry.shop_items?.name ?? '',
      quantity: entry.quantity ?? 0,
      slug: entry.shop_items?.slug ?? '',
    }))

    return sendJson(res, 200, { fish })
  } catch (error) {
    return sendJson(res, 500, { error: error.message || 'Unable to load aquarium items.' })
  }
}
