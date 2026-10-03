// Mocked purchase/player APIs keep real gold balances and inventories untouched.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { startLocalServer } from '../local-server.mjs'
import { getShopItemsByCategoryAndRarity, findShopItemBySlug } from '../shared/shopCatalog.js'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const server = await startLocalServer({ port: 0 })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const player = { id: 'rare-fish-test', display_name: 'Sample Player', login_name: 'sample', role: 'player', gold: 1000 }
  const fish = []
  await context.route('**/api/**', (route) => {
    const pathname = new URL(route.request().url()).pathname
    if (pathname === '/api/admin-buy-item') {
      const { itemSlug, playerId } = route.request().postDataJSON()
      assert.equal(playerId, player.id)
      const item = findShopItemBySlug(itemSlug)
      player.gold -= item.price
      fish.push({ slug: item.slug, name: item.name, quantity: 1 })
      return route.fulfill({ json: { item, player, quantity: 1 } })
    }
    return route.fulfill({ json: pathname === '/api/public-player-aquarium' ? { fish } : { players: [player], attendance: {}, hasAdmin: true } })
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(`${server.url}/shop`)
  await page.getByRole('button', { name: 'Rare', exact: true }).click()
  assert.equal(await page.locator('.shop-item-card').count(), 3)
  assert.equal(await page.getByText('250 gold', { exact: true }).count(), 3)
  await page.getByLabel('Choose shop player').selectOption(player.id)
  const gradients = new Map()
  for (const item of getShopItemsByCategoryAndRarity('fish', 'rare')) {
    const fishBody = page.locator(`.fish-${item.slug} .fish-body`)
    const gradient = await fishBody.evaluate((element) => getComputedStyle(element).backgroundImage)
    assert.ok(gradient.includes('linear-gradient'))
    gradients.set(item.slug, gradient)
    await page.locator('.shop-item-card').filter({ hasText: item.name }).getByRole('button', { name: 'Buy', exact: true }).click()
    await page.getByText(`${item.name} bought for Sample Player. ${player.gold} gold left.`, { exact: true }).waitFor()
  }
  assert.equal(player.gold, 250)
  assert.equal(fish.length, 3)
  if (process.env.RARE_FISH_SCREENSHOT_DIR) {
    await mkdir(process.env.RARE_FISH_SCREENSHOT_DIR, { recursive: true })
    await page.screenshot({ path: path.join(process.env.RARE_FISH_SCREENSHOT_DIR, 'rare-fish-desktop.png') })
  }
  await page.getByRole('button', { name: 'Common', exact: true }).click()
  assert.equal(await page.locator('.shop-item-card').count(), 3)
  assert.equal(await page.locator('.fish-rare').count(), 0)
  await page.goto(`${server.url}/profiles`)
  await page.getByRole('button', { name: 'Sample Player 250 gold coins', exact: true }).click()
  await page.locator('.fish-rare').first().waitFor()
  assert.equal(await page.locator('.fish-rare').count(), 3)
  for (const [slug, gradient] of gradients) {
    assert.equal(await page.locator(`.fish-${slug} .fish-body`).evaluate((element) => getComputedStyle(element).backgroundImage), gradient)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${server.url}/shop`)
  await page.getByRole('button', { name: 'Rare', exact: true }).click()
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  const lastCard = page.locator('.shop-item-card').last()
  await lastCard.scrollIntoViewIfNeeded()
  assert.ok(await lastCard.isVisible())
  if (process.env.RARE_FISH_SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.RARE_FISH_SCREENSHOT_DIR, 'rare-fish-mobile.png') })
  assert.deepEqual(errors, [])
  console.log('PASS: Rare filter, 250-gold prices, three mock purchases, matching tank gradients, Common unchanged, mobile scrolling, no runtime errors')
} finally {
  await browser.close()
  await server.close()
}
