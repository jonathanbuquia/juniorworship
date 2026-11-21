// Real reward API with isolated test data; never change the live player database.
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { startLocalServer } from '../local-server.mjs'
import { MAY_EVENT_BETTA_SLUG } from '../shared/shopCatalog.js'
import { getAttendanceDateKey } from '../src/features/attendance/rewardAttendance.js'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const temporary = await mkdtemp(path.join(os.tmpdir(), 'aquarium-quiz-ui-'))
const filename = path.join(temporary, 'sunday-school.json')
await writeFile(filename, JSON.stringify({
  players: ['Ada', 'Ben', 'Cara'].map((name) => ({ id: name, display_name: name, gold: 100, role: 'player' })),
  inventory: [{ user_id: 'Ada', item_slug: MAY_EVENT_BETTA_SLUG, quantity: 1 }],
  attendance: Object.fromEntries(['Ada', 'Ben', 'Cara'].map((id) => [`${id}:${getAttendanceDateKey()}`, true])),
}))
const server = await startLocalServer({ port: 0, dataDirectory: temporary })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
try {
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.addInitScript(() => {
    if (!localStorage.getItem('quiz-helper')) localStorage.setItem('quiz-helper', JSON.stringify({ currentIndex: 5, questions: [], awardScores: {} }))
  })
  await page.goto(`${server.url}/quiz`)
  const openRewards = async () => {
    await page.getByRole('button', { name: 'Show answers', exact: true }).click()
    await page.getByRole('button', { name: 'Proceed to awards', exact: true }).click()
    await page.locator('.quiz-reward-row').last().waitFor()
  }
  const score = (name) => page.locator('.quiz-reward-row').filter({ has: page.getByText(name, { exact: true }) }).getByLabel('Score')
  await openRewards()
  await score('Ada').fill('10')
  await score('Ben').fill('5')
  await score('Cara').fill('0')
  const requests = []
  let failBen = true
  await page.route('**/api/adjust-player-gold', async (route) => {
    const body = route.request().postDataJSON()
    requests.push(body)
    if (body.playerId === 'Ben' && failBen) return route.fulfill({ status: 500, json: { error: 'Simulated failed save' } })
    return route.continue()
  })
  const awardButton = page.getByRole('button', { name: 'Add gold to scored players', exact: true })
  await awardButton.evaluate((button) => { button.click(); button.click() })
  await page.getByText(/Retry the remaining scores only/).waitFor()
  assert.equal(await score('Ada').inputValue(), '')
  assert.equal(await score('Ben').inputValue(), '5')
  assert.equal(await score('Cara').inputValue(), '')
  assert.equal(requests.filter((request) => request.playerId === 'Ada').length, 1)
  assert.equal(requests.filter((request) => request.playerId === 'Cara').length, 0)
  failBen = false
  await awardButton.click()
  await page.waitForFunction(() => [...document.querySelectorAll('.quiz-reward-row input')].every((input) => !input.value))
  assert.ok(await awardButton.isDisabled())
  const balances = async () => Object.fromEntries(JSON.parse(await readFile(filename, 'utf8')).players.map((player) => [player.id, player.gold]))
  assert.deepEqual(await balances(), { Ada: 400, Ben: 200, Cara: 100 })
  await page.reload()
  await openRewards()
  assert.ok(await awardButton.isDisabled())
  assert.match(await page.locator('.quiz-reward-row').filter({ has: page.getByText('Ada', { exact: true }) }).textContent(), /400 gold/)
  // A new perfect score today gets normal gold, but not a second Betta daily bonus.
  await score('Ada').fill('10')
  await awardButton.click()
  await page.waitForFunction(() => document.querySelector('.quiz-award-all-button')?.disabled && !document.querySelector('.quiz-award-all-button')?.textContent.includes('Adding'))
  assert.deepEqual(await balances(), { Ada: 600, Ben: 200, Cara: 100 })
  assert.deepEqual(errors, [])
  console.log('PASS: quiz gold saves, zero scores, Betta bonus, double-click guard, partial failure retry, score clearing and reload persistence')
} finally {
  await browser.close()
  await server.close()
  assert.ok(path.resolve(temporary).startsWith(path.resolve(os.tmpdir()) + path.sep))
  await rm(temporary, { recursive: true, force: true })
}
