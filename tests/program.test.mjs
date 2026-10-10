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
import { splitLyricPages } from '../server/program/lyrics.mjs'
import { loadOfferingSong } from '../server/program/offeringSong.mjs'

test('numbered lyrics keep complete pages without projecting the page markers', () => {
  const first = 'First line\nSecond line\nThird line\nFourth line\nFifth line'
  assert.deepEqual(splitLyricPages(`\uFEFF1\r\n${first}\n\n2\nNext verse\n\nRepeated verse\n3\n`), [first, 'Next verse\n\nRepeated verse'])
  assert.deepEqual(splitLyricPages(`1\n${first}`), [first])
  assert.deepEqual(splitLyricPages('1\n2\n'), [])
  assert.deepEqual(splitLyricPages('Intro\n  1  \nPage one\n  2  \nPage two'), ['Intro', 'Page one', 'Page two'])
})

test('offering track is optional and does not discover unrelated files', async (t) => {
  const { root } = await fixture(t)
  const filename = path.join(root, 'TITHES.mp3')
  assert.equal(await loadOfferingSong(filename), null)
  await writeFile(filename, '')
  assert.equal(await loadOfferingSong(filename), null)
  await writeFile(filename, 'offering audio')
  assert.equal((await loadOfferingSong(filename)).mediaUrl, '/media/program/offering')
  assert.equal(await loadOfferingSong(root), null)
})

test('text lyrics preserve verse order and repeats, and limit projected page length', () => {
  const text = '\uFEFFFirst line\r\nRepeat this line\r\nRepeat this line\r\n\r\nAnother verse'
  assert.deepEqual(splitLyricPages(text), ['First line\nRepeat this line\nRepeat this line', 'Another verse'])
  assert.deepEqual(splitLyricPages('  '), [])
  const pages = splitLyricPages(Array.from({ length: 12 }, (_, index) => `Line ${index}`).join('\n'))
  assert.equal(pages.length, 3)
  assert.ok(pages.every((page) => page.split('\n').length <= 4))
})

test('Bible Truth folder songs match only their own lyric text or numbered pictures', async (t) => {
  const { root } = await fixture(t)
  const legacy = path.join(root, 'existing')
  const bible = path.join(legacy, 'BIBLE TRUTH KIDS SONGS')
  await mkdir(path.join(bible, 'Lyrics', 'PICTURE SONG'), { recursive: true })
  for (const title of ['TEXT SONG', 'PICTURE SONG', 'PENDING SONG']) await writeFile(path.join(bible, `${title}.mp3`), 'audio')
  await writeFile(path.join(bible, 'Lyrics', 'TEXT SONG.txt'), 'Verified first verse\n\nVerified second verse')
  await writeFile(path.join(bible, 'Lyrics', 'PICTURE SONG.txt'), 'Pictures take priority')
  for (const name of ['10.png', '2.png']) await writeFile(path.join(bible, 'Lyrics', 'PICTURE SONG', name), 'picture')
  await writeFile(path.join(legacy, 'OUTSIDE.mp3'), 'not a library song')
  await writeFile(path.join(bible, 'VIDEO.mp4'), 'not a library song')
  const library = createSongLibrary({ root: bible })
  const entries = await library.scan()
  assert.equal(entries.length, 3, 'Ignore outside folders and videos')
  const text = entries.find((entry) => entry.title === 'TEXT SONG')
  assert.deepEqual(text.slides.map((slide) => slide.text), ['Verified first verse', 'Verified second verse'])
  assert.equal(text.thumbnail, '')
  assert.deepEqual(entries.find((entry) => entry.title === 'PICTURE SONG').slides.map((slide) => slide.name), ['2.png', '10.png'])
  assert.deepEqual(entries.find((entry) => entry.title === 'PENDING SONG').slides, [])
  assert.equal(await library.resolveMedia(text.mediaUrl.split('/').at(-1)), await realpath(path.join(bible, 'TEXT SONG.mp3')))
  assert.equal((await library.scan()).find((entry) => entry.title === 'TEXT SONG').id, text.id)
})

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
  const song = path.join(songs, 'Amazing Grace.mp3')
  const lyrics = path.join(songs, 'Lyrics', 'Amazing Grace')
  await mkdir(lyrics, { recursive: true })
  await mkdir(path.join(songs, 'Empty template'), { recursive: true })
  await writeFile(path.join(songs, 'Empty template', 'NESTED.mp3'), 'ignored nested audio')
  await writeFile(song, '0123456789')
  for (const name of ['10.png', '2.png', '1.png']) await writeFile(path.join(lyrics, name), 'picture')
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
  assert.equal(await library.resolveMedia(mediaId), await realpath(song))
  assert.equal(await library.resolveMedia('../../program.json'), null)
  await rm(song)
  assert.equal(await library.resolveMedia(mediaId), null)
})

test('program API persists edits and streams seekable media with byte ranges', async (t) => {
  const { root, songs } = await fixture(t)
  const offeringSongPath = path.join(root, 'TITHES.mp3')
  await writeFile(offeringSongPath, 'offering audio')
  const handle = createProgramRoutes({ dataDirectory: root, songsDirectory: songs, offeringSongPath })
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
  const { songs: entries, offeringSong } = await (await fetch(`${base}/api/program/songs`)).json()
  assert.equal(entries.length, 1, 'Offering music stays outside the worship selector')
  const offeringUrl = base + offeringSong.mediaUrl
  const offering = await fetch(offeringUrl, { headers: { Range: 'bytes=0-7' } })
  assert.equal(offering.status, 206)
  assert.equal(await offering.text(), 'offering')
  assert.equal((await fetch(offeringUrl, { method: 'HEAD' })).headers.get('content-type'), 'audio/mpeg')
  await rm(offeringSongPath)
  assert.equal((await fetch(offeringUrl)).status, 404)
  assert.equal((await (await fetch(`${base}/api/program/songs`)).json()).offeringSong, null)
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
