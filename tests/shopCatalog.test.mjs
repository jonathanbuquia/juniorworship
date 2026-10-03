import assert from 'node:assert/strict'
import { test } from 'node:test'
import { SHOP_ITEMS, getShopItemsByCategoryAndRarity, findShopItemBySlug, isEventShopItem } from '../shared/shopCatalog.js'
import { getFishGradientStyle } from '../src/features/aquarium/fishAppearance.js'

test('Fish Rare filter offers three repeat-purchase fish at 250 gold each', () => {
  const rare = getShopItemsByCategoryAndRarity('fish', 'rare')
  assert.equal(rare.length, 3)
  assert.deepEqual(rare.map((item) => item.name), ['Sunset Guppy', 'Aurora Tetra', 'Pearl Angelfish'])
  for (const item of rare) {
    assert.equal(item.price, 250)
    assert.equal(item.isOnSale, false)
    assert.equal(findShopItemBySlug(item.slug).price, 250, 'Purchase API resolves the same price')
    assert.equal(isEventShopItem(item), false)
    assert.equal(item.requirements, undefined)
    assert.equal(item.gradientColors.length, 3)
    assert.match(getFishGradientStyle(item)['--rare-body-gradient'], /^linear-gradient/)
  }
  assert.equal(new Set(rare.map((item) => item.gradientColors.join(','))).size, 3)
  assert.equal(new Set(SHOP_ITEMS.map((item) => item.slug)).size, SHOP_ITEMS.length)
})

test('Common fish and event creatures retain their existing appearance and rules', () => {
  const common = getShopItemsByCategoryAndRarity('fish', 'common')
  assert.equal(common.length, 3)
  for (const item of common) {
    assert.equal(item.price, 100)
    assert.deepEqual(getFishGradientStyle(item), {})
  }
  assert.equal(getShopItemsByCategoryAndRarity('fish').length, 6)
  for (const item of getShopItemsByCategoryAndRarity('events')) {
    assert.equal(isEventShopItem(item), true)
    assert.equal(item.rarity, 'special')
    assert.deepEqual(getFishGradientStyle(item), {})
  }
})
