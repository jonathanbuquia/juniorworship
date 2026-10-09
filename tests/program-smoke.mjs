// Isolated program storage and mocked player APIs: this never edits real records.
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { createDefaultProgram } from '../shared/program.js'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const temporary = await mkdtemp(path.join(os.tmpdir(), 'aquarium-program-ui-'))
process.env.AQUARIUM_PROGRAM_DATA_DIR = path.join(temporary, 'data')
process.env.AQUARIUM_SONGS_DIR = path.join(temporary, 'songs')
process.env.AQUARIUM_LEGACY_SONGS_DIR = path.join(temporary, 'existing')
const lyrics = path.join(process.env.AQUARIUM_SONGS_DIR, 'Amazing Grace', 'Lyrics')
await mkdir(lyrics, { recursive: true })
const picture = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9WQAAAAASUVORK5CYII=', 'base64')
for (const name of ['01.png', '02.png']) await writeFile(path.join(lyrics, name), picture)
// Twenty seconds of silent PCM verifies actual browser decoding/playback, not just a mocked play call.
const samples = 8000 * 20
const wav = Buffer.alloc(44 + samples * 2)
wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8)
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22)
wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28); wav.writeUInt16LE(2, 32)
wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(samples * 2, 40)
await writeFile(path.join(lyrics, '..', 'song.wav'), wav)

const { startLocalServer } = await import('../local-server.mjs')
const server = await startLocalServer({ port: 0 })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await context.route('**/api/**', (route) => {
    if (new URL(route.request().url()).pathname.startsWith('/api/program')) return route.continue()
    return route.fulfill({ json: { players: [], attendance: {}, hasAdmin: true } })
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(`${server.url}/program`)
  await page.getByRole('heading', { name: 'Welcome to Junior Worship', exact: true }).waitFor()
  assert.deepEqual(await page.locator('.program-navigation option:not([disabled])').allTextContents(), [
    '1. Welcome to Junior Worship', '2. Song 1', '3. Opening Prayer', '4. Song 2',
    '5. Announcement', '6. Tithes and Offering', '7. Memory Verse', '8. Bible Books',
    '9. Bible Lesson', '10. Quiz', '11. Closing Prayer',
  ])
  assert.equal(await page.locator('input, .program-setup-grid, .program-part-editor').count(), 0)
  assert.equal(await page.getByRole('button', { name: /Edit program|Start program|Add to program/ }).count(), 0)
  if (process.env.PROGRAM_SCREENSHOT_DIR) {
    await mkdir(process.env.PROGRAM_SCREENSHOT_DIR, { recursive: true })
    await page.screenshot({ path: path.join(process.env.PROGRAM_SCREENSHOT_DIR, 'program-desktop.png') })
  }
  await page.getByRole('button', { name: 'Full screen', exact: true }).click()
  await page.waitForFunction(() => Boolean(document.fullscreenElement))
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await page.getByRole('heading', { name: 'Song 1', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await page.getByRole('heading', { name: 'Opening Prayer', exact: true }).waitFor()
  assert.ok(await page.evaluate(() => Boolean(document.fullscreenElement)), 'Navigation must not recreate the fullscreen container')
  const exitButton = page.getByRole('button', { name: 'Exit full screen', exact: true })
  assert.equal(await exitButton.locator('svg').count(), 1, 'Fullscreen shows an X icon')
  if (process.env.PROGRAM_SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.PROGRAM_SCREENSHOT_DIR, 'program-fullscreen.png') })
  await exitButton.click()
  await page.waitForFunction(() => !document.fullscreenElement)
  assert.equal(await page.getByLabel('Jump to program part').inputValue(), 'prayer')
  await page.getByRole('heading', { name: 'Opening Prayer', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Full screen', exact: true }).click()
  await page.waitForFunction(() => Boolean(document.fullscreenElement))
  assert.equal(await page.getByLabel('Jump to program part').inputValue(), 'prayer')
  // Browser/OS exits (such as Escape) use fullscreenchange, not the X button.
  await page.evaluate(() => document.exitFullscreen())
  await page.getByRole('button', { name: 'Full screen', exact: true }).waitFor()
  await page.reload()
  await page.getByRole('heading', { name: 'Opening Prayer', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Full screen', exact: true }).click()
  await page.getByLabel('Jump to program part').selectOption('memory')
  await page.getByRole('button', { name: 'Open Memory Verse', exact: true }).click()
  assert.equal(await page.evaluate(() => Boolean(document.fullscreenElement)), false)
  await page.getByRole('button', { name: 'Back to Program', exact: true }).click()
  await page.getByRole('button', { name: 'Open Memory Verse', exact: true }).waitFor()
  await page.getByLabel('Jump to program part').selectOption('closing')
  await page.getByRole('heading', { name: 'Closing Prayer', exact: true }).waitFor()
  assert.ok(await page.getByRole('button', { name: 'Next', exact: true }).isDisabled())
  await page.getByLabel('Jump to program part').selectOption('memory')

  // Existing program songs remain usable even though customization is removed.
  const { songs } = await (await fetch(`${server.url}/api/program/songs`)).json()
  const savedProgram = createDefaultProgram()
  savedProgram.updatedAt = Date.now()
  savedProgram.items.splice(1, 0, { id: 'test-song', kind: 'song', title: songs[0].title, songId: songs[0].id })
  const savedResponse = await fetch(`${server.url}/api/program`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(savedProgram) })
  assert.equal(savedResponse.status, 200)
  await page.reload()
  await page.getByRole('button', { name: 'Open Memory Verse', exact: true }).waitFor()
  await page.getByLabel('Jump to program part').selectOption('test-song')
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('audio')?.currentTime > 0.2)
  await page.evaluate(() => { window.__originalAudio = document.querySelector('audio') })
  const time = await page.locator('audio').evaluate((audio) => audio.currentTime)
  await page.getByRole('button', { name: 'Next lyric', exact: true }).click()
  assert.equal(await page.locator('.program-lyric-image').getAttribute('alt'), 'Amazing Grace, lyrics 2')
  assert.ok(await page.locator('audio').evaluate((audio) => !audio.paused && audio.currentTime >= 0.2))
  assert.ok(await page.locator('audio').evaluate((audio) => audio.currentTime) >= time)
  await page.getByRole('button', { name: 'Full screen', exact: true }).click()
  await page.waitForFunction(() => Boolean(document.fullscreenElement))
  await page.getByRole('button', { name: 'Exit full screen', exact: true }).click()
  await page.waitForFunction(() => !document.fullscreenElement)
  assert.equal(await page.locator('.program-lyric-image').getAttribute('alt'), 'Amazing Grace, lyrics 2')
  assert.ok(await page.evaluate(() => window.__originalAudio === document.querySelector('audio') && !window.__originalAudio.paused))
  assert.ok(await page.locator('audio').evaluate((audio) => audio.currentTime) >= time)
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  assert.equal(await page.locator('audio').count(), 0)
  await page.getByLabel('Jump to program part').selectOption('welcome')
  await page.setViewportSize({ width: 390, height: 844 })
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal page overflow on mobile')
  assert.ok((await page.locator('.program-stage-heading').boundingBox()).height < 100, 'Mobile header must not squeeze into a vertical column')
  await page.getByRole('button', { name: 'Next', exact: true }).scrollIntoViewIfNeeded()
  if (process.env.PROGRAM_SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.PROGRAM_SCREENSHOT_DIR, 'program-mobile.png') })
  assert.deepEqual(JSON.parse(await readFile(path.join(process.env.AQUARIUM_PROGRAM_DATA_DIR, 'program.json'), 'utf8')), savedProgram, 'Presenting must not rewrite saved program contents')
  assert.deepEqual(errors, [])
  console.log('PASS: automatic welcome, no editor, fullscreen navigation, X/external exit retain page, reopen/reload retain page, preserved songs/lyrics/audio, activities, mobile')
} finally {
  await browser.close()
  await server.close()
  // Only remove the unique fixture directory created above, never the real library.
  assert.ok(path.resolve(temporary).startsWith(path.resolve(os.tmpdir()) + path.sep))
  await rm(temporary, { recursive: true, force: true })
}
