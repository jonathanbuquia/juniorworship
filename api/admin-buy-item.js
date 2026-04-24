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

    const nextGold = player.gold - itemRecord.price
    const { data: updatedPlayer, error: goldError } = await admin
      .from('profiles')
      .update({
        gold: nextGold,
      })
      .eq('id', player.id)
      .eq('gold', player.gold)
      .select('id, display_name, gold')
      .single()

    if (goldError || !updatedPlayer) {
      return sendJson(res, 400, {
        error: goldError?.message || 'The purchase could not be completed.',
      })
    }

    const { data: existingInventory, error: inventoryLookupError } = await admin
      .from('inventory')
      .select('id, quantity')
      .eq('user_id', player.id)
      .eq('item_id', itemRecord.id)
      .maybeSingle()

    if (inventoryLookupError) {
      await admin
        .from('profiles')
        .update({
          gold: player.gold,
        })
        .eq('id', player.id)

      return sendJson(res, 400, {
        error: inventoryLookupError.message || 'The purchase could not be completed.',
      })
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
          .eq('id', player.id)

        return sendJson(res, 400, {
          error: inventoryUpdateError.message || 'The purchase could not be completed.',
        })
      }
    } else {
      const { error: inventoryInsertError } = await admin
        .from('inventory')
        .insert({
          item_id: itemRecord.id,
          quantity,
          user_id: player.id,
        })

      if (inventoryInsertError) {
        await admin
          .from('profiles')
          .update({
            gold: player.gold,
          })
          .eq('id', player.id)

        return sendJson(res, 400, {
          error: inventoryInsertError.message || 'The purchase could not be completed.',
        })
      }
    }

    await admin.from('purchase_log').insert({
      item_id: itemRecord.id,
      price_paid: itemRecord.price,
      user_id: player.id,
    })

    return sendJson(res, 200, {
      item: {
        name: itemRecord.name,
        price: itemRecord.price,
        slug: itemRecord.slug,
      },
      player: {
        id: updatedPlayer.id,
        display_name: updatedPlayer.display_name,
        gold: updatedPlayer.gold,
      },
      quantity,
    })
  } catch (error) {
    return sendJson(res, 500, {
      error: error.message || 'Unable to complete the purchase.',
    })
  }
}
