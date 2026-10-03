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
  let purchaseRequests = 0
  await context.route('**/api/**', (route) => {
    const pathname = new URL(route.request().url()).pathname
    if (pathname === '/api/admin-buy-item') {
      purchaseRequests++
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
  const firstBuy = page.locator('.shop-item-card').first().getByRole('button', { name: 'Buy', exact: true })
  await firstBuy.click()
  const dialog = page.getByRole('dialog')
  await dialog.waitFor()
  assert.equal(purchaseRequests, 0, 'Buy alone must not submit a purchase')
  assert.equal(await page.evaluate(() => document.activeElement.textContent), 'CANCEL')
  await dialog.getByRole('button', { name: 'CANCEL', exact: true }).click()
  assert.equal(await dialog.count(), 0)
  assert.equal(player.gold, 1000)
  await firstBuy.click()
  await page.keyboard.press('Escape')
  assert.equal(await dialog.count(), 0)
  assert.equal(purchaseRequests, 0, 'Cancel and Escape must not submit a purchase')
  const gradients = new Map()
  for (const item of getShopItemsByCategoryAndRarity('fish', 'rare')) {
    const fishBody = page.locator(`.fish-${item.slug} .fish-body`)
    const gradient = await fishBody.evaluate((element) => getComputedStyle(element).backgroundImage)
    assert.ok(gradient.includes('linear-gradient'))
    gradients.set(item.slug, gradient)
    await page.locator('.shop-item-card').filter({ hasText: item.name }).getByRole('button', { name: 'Buy', exact: true }).click()
    await dialog.getByRole('heading', { name: `Buy ${item.name}?`, exact: true }).waitFor()
    assert.ok(await dialog.getByText('Sample Player', { exact: true }).isVisible())
    assert.equal(await dialog.locator('.purchase-confirm-price').textContent(), '250 gold')
    const previousRequests = purchaseRequests
    // Simulate rapid duplicate confirmation events before the modal unmounts.
    await dialog.getByRole('button', { name: 'OKAY', exact: true }).evaluate((button) => { button.click(); button.click() })
    await page.getByText(`${item.name} bought for Sample Player. ${player.gold} gold left.`, { exact: true }).waitFor()
    assert.equal(purchaseRequests, previousRequests + 1)
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
  await page.locator('.shop-item-card').first().getByRole('button', { name: 'Buy', exact: true }).click()
  await dialog.getByRole('heading', { name: 'Buy Sunbeam Guppy?', exact: true }).waitFor()
  await dialog.getByRole('button', { name: 'CANCEL', exact: true }).click()
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
  await page.getByLabel('Choose shop player').selectOption(player.id)
  await lastCard.getByRole('button', { name: 'Buy', exact: true }).click()
  await dialog.waitFor()
  const bounds = await dialog.boundingBox()
  assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 390)
  assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= 844)
  if (process.env.RARE_FISH_SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.RARE_FISH_SCREENSHOT_DIR, 'rare-fish-mobile.png') })
  await dialog.getByRole('button', { name: 'CANCEL', exact: true }).click()
  assert.equal(purchaseRequests, 3)
  assert.deepEqual(errors, [])
  console.log('PASS: confirmation, Cancel/Escape, duplicate-click guard, Common/Rare purchases, matching tank gradients, mobile dialog, no runtime errors')
} finally {
  await browser.close()
  await server.close()
}
