import { allowMethods, createServiceClient, parseBody, requireAdmin, sendJson } from './_lib/supabase.js'
import { findShopItemBySlug } from '../shared/shopCatalog.js'

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) {
    return
  }

  try {
    const admin = createServiceClient()
    const adminResult = await requireAdmin(req, admin)

    if (adminResult.error) {
      return sendJson(res, adminResult.status || 403, { error: adminResult.error })
    }

    const body = parseBody(req.body)
    const playerId = String(body.playerId || '').trim()
    const itemSlug = String(body.itemSlug || '').trim()

    if (!playerId) {
      return sendJson(res, 400, { error: 'Choose a player first.' })
    }

    const catalogItem = findShopItemBySlug(itemSlug)

    if (!catalogItem) {
      return sendJson(res, 400, { error: 'That shop item is not available yet.' })
    }

    const { data: player, error: playerError } = await admin
      .from('profiles')
      .select('id, display_name, gold, role')
      .eq('id', playerId)
      .eq('role', 'player')
      .single()

    if (playerError || !player) {
      return sendJson(res, 404, { error: 'That player could not be found.' })
    }

    if (player.gold < catalogItem.price) {
      return sendJson(res, 400, {
        error: `${player.display_name} needs ${catalogItem.price} gold for ${catalogItem.name}, but only has ${player.gold}.`,
      })
    }

    const { data: itemRecord, error: itemError } = await admin
      .from('shop_items')
      .upsert(
        {
          slug: catalogItem.slug,
          name: catalogItem.name,
          description: catalogItem.description,
          price: catalogItem.price,
          accent_color: catalogItem.accentColor,
        },
        {
          onConflict: 'slug',
        },
      )
      .select('id, slug, name, price, accent_color')
      .single()

    if (itemError || !itemRecord) {
      return sendJson(res, 400, {
        error: itemError?.message || 'The shop item could not be prepared.',
      })
    }

    const { data: purchase, error: purchaseError } = await admin
      .rpc('buy_shop_item', {
        p_item_id: itemRecord.id,
        p_user_id: player.id,
      })
      .single()

    if (purchaseError || !purchase) {
      return sendJson(res, 400, {
        error: purchaseError?.message || 'The purchase could not be completed.',
      })
    }

    return sendJson(res, 200, {
      item: {
        name: itemRecord.name,
        price: itemRecord.price,
        slug: itemRecord.slug,
      },
      player: {
        id: player.id,
        display_name: player.display_name,
        gold: purchase.gold,
      },
      quantity: purchase.quantity,
    })
  } catch (error) {
    return sendJson(res, 500, {
      error: error.message || 'Unable to complete the purchase.',
    })
  }
}
