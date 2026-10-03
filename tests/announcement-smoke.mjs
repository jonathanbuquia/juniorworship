// Read-only UI checks with mocked APIs; no real player data is changed.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { startLocalServer } from '../local-server.mjs'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const server = await startLocalServer({ port: 0 })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
try {
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.route('**/api/**', (route) => route.fulfill({ json: { players: [], fish: [], attendance: {}, hasAdmin: true } }))
  for (const [width, height] of [[1440, 900], [1024, 768], [768, 1024], [390, 844], [320, 568]]) {
    await page.setViewportSize({ width, height })
    await page.goto(`${server.url}/`)
    const announcement = page.locator('.maintenance-announcement')
    await announcement.waitFor()
    await page.getByRole('heading', { name: /Under.*maintenance/ }).waitFor()
    assert.ok(await page.getByText('October 2026 Announcement', { exact: true }).isVisible())
    assert.ok(await page.getByText('No new special creature this October.', { exact: true }).isVisible())
    assert.equal(await announcement.locator('li').count(), 3)
    assert.ok(await page.getByRole('heading', { name: 'Player Levels & EXP', exact: true }).isVisible())
    assert.ok(await page.getByRole('heading', { name: 'Special Creature Upgrades', exact: true }).isVisible())
    assert.equal(await page.locator('.may-special-price, .announcement-crab-preview').count(), 0)
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `No page overflow at ${width}`)
    assert.ok(await announcement.evaluate((el) => el.scrollWidth <= el.clientWidth), `No announcement overflow at ${width}`)
    await page.locator('.maintenance-note').scrollIntoViewIfNeeded()
    const note = await page.locator('.maintenance-note').boundingBox()
    assert.ok(note.y >= 0 && note.y + note.height <= height, `Upcoming disclaimer reachable at ${width}`)
    if (process.env.ANNOUNCEMENT_SCREENSHOT_DIR && [1440, 390].includes(width)) {
      await mkdir(process.env.ANNOUNCEMENT_SCREENSHOT_DIR, { recursive: true })
      await announcement.evaluate((el) => { el.scrollTop = 0 })
      await page.screenshot({ path: path.join(process.env.ANNOUNCEMENT_SCREENSHOT_DIR, `announcement-${width}.png`) })
    }
  }
  await page.goto(`${server.url}/shop`)
  await page.getByRole('button', { name: 'Rare', exact: true }).click()
  assert.equal(await page.locator('.shop-item-card').count(), 3, 'Shop remains available')
  assert.deepEqual(errors, [])
  console.log('PASS: October maintenance copy, upcoming features, no old sale promotion, five viewport sizes, scrollable disclaimer, shop still available')
} finally {
  await browser.close()
  await server.close()
}
