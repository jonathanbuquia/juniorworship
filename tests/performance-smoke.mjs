// Uses an isolated browser profile and mocked APIs; never writes to the real player database.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { MAY_EVENT_BETTA_SLUG, MOON_JELLY_SLUG, HERMIT_CRAB_SLUG } from '../shared/shopCatalog.js'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const baseline = process.argv.includes('--baseline')
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()
const errors = []
page.on('pageerror', (error) => errors.push(error.message))
const player = { id: 'performance-test', display_name: 'Jonathan', login_name: 'jonathan', role: 'player', gold: 3000 }
const fish = [
  ...['sunbeam-guppy', 'coral-clownfish', 'mint-angel-fish'].map((slug) => ({ slug, quantity: 8 })),
  ...[MAY_EVENT_BETTA_SLUG, MOON_JELLY_SLUG, HERMIT_CRAB_SLUG].map((slug) => ({ slug, quantity: 1 })),
]
await context.route('**/api/**', (route) => {
  const pathname = new URL(route.request().url()).pathname
  const response = pathname === '/api/public-player-aquarium'
    ? { fish }
    : pathname.includes('players')
      ? { players: [player] }
      : { hasAdmin: true, attendance: {} }
  return route.fulfill({ json: response })
})
await context.addInitScript(() => {
  window.__performanceCheck = { commits: 0, storageReads: {} }
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    supportsFiber: true,
    inject: () => 1,
    onCommitFiberRoot: () => { window.__performanceCheck.commits++ },
    onCommitFiberUnmount() {},
    onPostCommitFiberRoot() {},
  }
  const originalGetItem = Storage.prototype.getItem
  Storage.prototype.getItem = function (key) {
    window.__performanceCheck.storageReads[key] = (window.__performanceCheck.storageReads[key] || 0) + 1
    return originalGetItem.call(this, key)
  }
  if (!localStorage.getItem('performance-seeded')) {
    localStorage.setItem('memory-verse-helper', JSON.stringify({
      form: { reference: 'Psalm 23:1', text: 'The Lord is my shepherd.' },
      active: { reference: 'Psalm 23:1', text: 'The Lord is my shepherd.', coveredWordIndexes: [], undoneCoveredWordIndexes: [], coveredCount: 0 },
    }))
    localStorage.setItem('quiz-helper', JSON.stringify({
      questions: [{ id: 'quiz-question-1', prompt: 'Who built the ark?', choices: ['Noah', 'Moses', 'David', 'Paul'], correctChoiceIndex: '0', points: '1' }],
      currentIndex: -1, awardScores: {},
    }))
    localStorage.setItem('aquarium-player:v2:performance-test', JSON.stringify({
      creatures: Object.fromEntries(['turtle', 'stingray', 'pufferfish', 'crab', 'jellyfish', 'octopus'].map((name, index) => [name, { x: 80 + index * 110, y: 140 }])),
      coralPositions: {},
    }))
    localStorage.setItem('performance-seeded', 'yes')
  }
})

try {
  const started = Date.now()
  await page.goto(process.env.AQUARIUM_TEST_URL || 'http://127.0.0.1:4177/profiles')
  await page.getByRole('button', { name: 'Jonathan 3000 gold coins' }).click()
  await page.locator('.fish-swim').first().waitFor()
  const startupMs = Date.now() - started
  const cdp = await context.newCDPSession(page)
  await cdp.send('Performance.enable')
  await page.waitForTimeout(1200)
  const before = await page.evaluate(() => ({ ...window.__performanceCheck, positions: [...document.querySelectorAll('.fish-swim')].map((el) => getComputedStyle(el).transform) }))
  const metricsBefore = await cdp.send('Performance.getMetrics')
  await page.waitForTimeout(3000)
  const after = await page.evaluate(() => ({ ...window.__performanceCheck, positions: [...document.querySelectorAll('.fish-swim')].map((el) => getComputedStyle(el).transform) }))
  const metricsAfter = await cdp.send('Performance.getMetrics')
  assert.notDeepEqual(after.positions, before.positions, 'Fish must keep swimming')
  const metricDelta = (name) => +(metricsAfter.metrics.find((m) => m.name === name).value - metricsBefore.metrics.find((m) => m.name === name).value).toFixed(4)
  console.log(JSON.stringify({ baseline, startupMs, fishCount: after.positions.length, commitsDuringSwimming: after.commits - before.commits, scriptSeconds: metricDelta('ScriptDuration'), styleSeconds: metricDelta('RecalcStyleDuration'), taskSeconds: metricDelta('TaskDuration') }))
  if (!baseline) assert.equal(after.commits - before.commits, 0, 'Swimming should not trigger React commits')

  await page.locator('.talking-fish').click({ force: true })
  await page.locator('.fish-talk-bubble').waitFor()
  await page.locator('.jellyfish-swim[tabindex="0"]').click({ force: true })
  await page.locator('.jellyfish-burst-bubbles').waitFor()
  assert.equal(await page.locator('.fish-swim').count(), 25)
  if (!baseline) {
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')) })
    const hiddenPosition = await page.locator('.fish-swim').first().getAttribute('style')
    await page.waitForTimeout(250)
    assert.equal(await page.locator('.fish-swim').first().getAttribute('style'), hiddenPosition)
    assert.equal(await page.locator('.fish-bob').first().evaluate((el) => getComputedStyle(el).animationPlayState), 'paused')
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')) })
  }
  await page.getByRole('button', { name: 'Memory', exact: true }).click()
  await page.getByText('Psalm 23:1', { exact: true }).first().waitFor()
  assert.equal(await page.locator('.fish-swim').count(), 0)
  const reads = await page.evaluate(() => window.__performanceCheck.storageReads)
  if (!baseline) {
    assert.equal(reads['memory-verse-helper'], 1)
    assert.equal(reads['quiz-helper'], 1)
  }
  await page.reload()
  await page.getByText('Psalm 23:1', { exact: true }).first().waitFor()
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('quiz-helper')).questions[0].prompt), 'Who built the ark?')
  assert.deepEqual(errors, [])
  console.log('PASS: movement, creature clicks, navigation, visibility, saved lessons and runtime errors')
} finally {
  await browser.close()
}
