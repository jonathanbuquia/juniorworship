import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtemp, mkdir, writeFile, readFile, realpath, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import { createProgramStore } from '../server/program/store.mjs'
import { createSongLibrary } from '../server/program/songLibrary.mjs'
import { createProgramRoutes } from '../server/program/routes.mjs'
import { createDefaultProgram } from '../shared/program.js'

test('default program follows the eleven requested parts and ends with Closing Prayer', () => {
  const program = createDefaultProgram()
  assert.deepEqual(program.items.map((item) => item.title), [
    'Welcome to Junior Worship', 'Song 1', 'Opening Prayer', 'Song 2',
    'Announcement', 'Tithes and Offering', 'Memory Verse', 'Bible Books',
    'Bible Lesson', 'Quiz', 'Closing Prayer',
  ])
  assert.deepEqual(program.items.filter((item) => item.kind === 'activity').map((item) => item.activity), ['memory', 'books', 'quiz'])
  assert.equal(new Set(program.items.map((item) => item.id)).size, 11)
})

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'aquarium-program-test-'))
  t.after(() => {
    assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep))
    return rm(root, { recursive: true, force: true })
  })
  const songs = path.join(root, 'songs')
  const song = path.join(songs, 'Amazing Grace')
  await mkdir(path.join(song, 'Lyrics'), { recursive: true })
  await mkdir(path.join(songs, 'Empty template'), { recursive: true })
  await writeFile(path.join(song, 'song.mp3'), '0123456789')
  for (const name of ['10.png', '2.png', '1.png']) await writeFile(path.join(song, 'Lyrics', name), 'picture')
  return { root, songs, song }
}

test('program saves atomically, survives reopening, and rejects stale saves', async (t) => {
  const { root } = await fixture(t)
  const store = createProgramStore(root)
  const program = { ...createDefaultProgram(), title: 'Sunday program', updatedAt: 2, favorites: ['song-1'] }
  await Promise.all([store.save(program), store.save({ ...program, title: 'Stale', updatedAt: 1 })])
  assert.deepEqual(await createProgramStore(root).load(), program)
  assert.throws(() => store.save({ items: [{ id: 'invalid', kind: 'unknown' }] }))
  assert.deepEqual(await store.load(), program)
  await writeFile(path.join(root, 'program.json'), 'broken original')
  await assert.rejects(store.save({ ...program, updatedAt: 3 }), /has not been replaced/)
  assert.equal(await readFile(path.join(root, 'program.json'), 'utf8'), 'broken original')
})

test('song library sorts lyrics numerically, keeps stable IDs and excludes empty folders', async (t) => {
  const { songs, song } = await fixture(t)
  const library = createSongLibrary({ root: songs })
  const entries = await library.scan()
  assert.equal(entries.length, 1)
  assert.equal(entries[0].title, 'Amazing Grace')
  assert.deepEqual(entries[0].slides.map((slide) => slide.name), ['1.png', '2.png', '10.png'])
  assert.equal((await library.scan())[0].id, entries[0].id)
  const mediaId = entries[0].mediaUrl.split('/').at(-1)
  assert.equal(await library.resolveMedia(mediaId), await realpath(path.join(song, 'song.mp3')))
  assert.equal(await library.resolveMedia('../../program.json'), null)
  await rm(path.join(song, 'song.mp3'))
  assert.equal(await library.resolveMedia(mediaId), null)
})

test('program API persists edits and streams seekable media with byte ranges', async (t) => {
  const { root, songs } = await fixture(t)
  const handle = createProgramRoutes({ dataDirectory: root, songsDirectory: songs, legacyDirectory: '' })
  const server = http.createServer(async (req, res) => {
    if (!await handle(req, res, new URL(req.url, 'http://localhost'))) { res.writeHead(404); res.end() }
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  t.after(() => new Promise((resolve) => server.close(resolve)))
  const base = `http://127.0.0.1:${server.address().port}`
  const program = { ...createDefaultProgram(), updatedAt: 10, title: 'Saved program' }
  const saved = await fetch(`${base}/api/program`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(program) })
  assert.equal(saved.status, 200)
  assert.deepEqual((await (await fetch(`${base}/api/program`)).json()).program, program)
  const crossSite = await fetch(`${base}/api/program`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Sec-Fetch-Site': 'cross-site' }, body: JSON.stringify(program) })
  assert.equal(crossSite.status, 403)
  const { songs: entries } = await (await fetch(`${base}/api/program/songs`)).json()
  const url = base + entries[0].mediaUrl
  const partial = await fetch(url, { headers: { Range: 'bytes=2-5' } })
  assert.equal(partial.status, 206)
  assert.equal(partial.headers.get('content-range'), 'bytes 2-5/10')
  assert.equal(await partial.text(), '2345')
  assert.equal(await (await fetch(url, { headers: { Range: 'bytes=-3' } })).text(), '789')
  assert.equal((await fetch(url, { headers: { Range: 'bytes=100-200' } })).status, 416)
  const head = await fetch(url, { method: 'HEAD' })
  assert.equal(head.headers.get('content-length'), '10')
  assert.equal(await head.text(), '')
  assert.equal((await fetch(`${base}/media/program/unknown`)).status, 404)
})
