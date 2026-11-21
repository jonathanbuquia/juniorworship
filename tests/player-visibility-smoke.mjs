import assert from 'node:assert/strict'
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { startLocalServer } from '../local-server.mjs'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const temporary = await mkdtemp(path.join(os.tmpdir(), 'aquarium-visibility-ui-'))
const filename = path.join(temporary, 'sunday-school.json')
const original = {
  players: ['Ada', 'Ben', 'Cara'].map((name) => ({ id: name, display_name: name, gold: 100, role: 'player' })),
  attendance: { 'Ada:2026-11-22': true, 'Ben:2026-11-22': true, 'Cara:2026-11-15': true }, inventory: [],
}
await writeFile(filename, JSON.stringify(original))
const server = await startLocalServer({ port: 0, dataDirectory: temporary })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
try {
  const page = await browser.newPage({ timezoneId: 'Asia/Taipei' })
  await page.clock.setFixedTime(new Date('2026-11-22T10:00:00+08:00'))
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(`${server.url}/admin`)
  await page.getByRole('button', { name: /Hide \/ Unhide players/ }).click()
  await page.getByRole('button', { name: 'Hide Ben', exact: true }).click()
  await page.getByRole('button', { name: 'Unhide Ben', exact: true }).waitFor()
  await page.reload()
  await page.getByRole('button', { name: /Hide \/ Unhide players/ }).click()
  await page.getByRole('button', { name: 'Unhide Ben', exact: true }).waitFor()
  await page.goto(`${server.url}/attendance`)
  await page.getByRole('heading', { name: 'Sunday Attendance' }).waitFor()
  await page.getByText('Ada', { exact: true }).waitFor()
  assert.equal(await page.getByText('Ben', { exact: true }).count(), 0)
  await page.getByText('Cara', { exact: true }).waitFor()
  await page.goto(`${server.url}/quiz`)
  await page.evaluate(() => localStorage.setItem('quiz-helper', JSON.stringify({ currentIndex: 5, questions: [], awardScores: { Ada: '5', Ben: '5', Cara: '5' } })))
  await page.reload()
  await page.getByRole('button', { name: 'Show answers', exact: true }).click()
  await page.getByRole('button', { name: 'Proceed to awards', exact: true }).click()
  await page.locator('.quiz-reward-row').waitFor()
  assert.deepEqual(await page.locator('.quiz-reward-row > div:first-child > strong').allTextContents(), ['Ada'])
  await page.getByRole('button', { name: 'Add gold to scored players', exact: true }).click()
  await page.getByText('Quiz gold added to 1 player.', { exact: true }).waitFor()
  let saved = JSON.parse(await readFile(filename, 'utf8'))
  assert.deepEqual(saved.players.map((player) => player.gold), [200, 100, 100])
  await page.evaluate(() => localStorage.setItem('memory-verse-helper', JSON.stringify({ active: { reference: 'Test verse', text: 'A verse for testing', coveredWordIndexes: [], coverHistory: [], redoHistory: [] } })))
  await page.goto(`${server.url}/memory-verse`)
  // Open the existing verse rewards control, then verify the same attendance filter.
  await page.getByRole('button', { name: 'Rewards', exact: true }).click()
  await page.locator('.memory-player-row').waitFor()
  assert.deepEqual(await page.locator('.memory-player-row strong').allTextContents(), ['Ada'])
  await fetch(`${server.url}/api/attendance-records`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer local-admin' },
    body: JSON.stringify({ playerId: 'Ada', dateId: '2026-11-22', present: false }),
  })
  await page.getByRole('button', { name: '+100 gold', exact: true }).click()
  await page.getByText(/must be visible and marked present/).waitFor()
  assert.equal(JSON.parse(await readFile(filename, 'utf8')).players[0].gold, 200, 'Recheck attendance before rewarding a stale visible name')
  await fetch(`${server.url}/api/attendance-records`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer local-admin' },
    body: JSON.stringify({ playerId: 'Ada', dateId: '2026-11-22', present: true }),
  })
  await page.goto(`${server.url}/admin`)
  await page.getByRole('button', { name: /Hide \/ Unhide players/ }).click()
  await page.getByRole('button', { name: 'Unhide Ben', exact: true }).click()
  await page.getByRole('button', { name: 'Hide Ben', exact: true }).waitFor()
  await page.goto(`${server.url}/attendance`)
  await page.getByText('Ben', { exact: true }).waitFor()
  saved = JSON.parse(await readFile(filename, 'utf8'))
  assert.deepEqual(saved.attendance, original.attendance)
  assert.deepEqual(errors, [])
  console.log('PASS: hide/unhide and reload, attendance filtering, today-only quiz/memory rewards, stale absent scores excluded, historical checks retained')
} finally {
  await browser.close()
  await server.close()
  assert.ok(path.resolve(temporary).startsWith(path.resolve(os.tmpdir()) + path.sep))
  await rm(temporary, { recursive: true, force: true })
}
