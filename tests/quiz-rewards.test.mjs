import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { startLocalServer } from '../local-server.mjs'
import { createDataStore } from '../server/dataStore.mjs'
import { buildQuizAwards, settleQuizAwards } from '../src/features/quiz/quizRewards.js'

const players = Array.from({ length: 33 }, (_, index) => ({ id: `player-${index}`, display_name: `Player ${index}`, role: 'player', gold: 100 }))

test('quiz scores accept zero, skip blanks, and reject invalid scores before awarding', async () => {
  const awards = buildQuizAwards(players, { 'player-0': '10', 'player-1': 0, 'player-2': '5', 'player-3': ' ' }, 10)
  assert.deepEqual(awards.map(({ amount }) => amount), [200, 0, 100])
  for (const score of ['-1', '11', '1.5', 'abc', 'Infinity']) {
    assert.throws(() => buildQuizAwards(players, { 'player-0': '5', 'player-1': score }, 10), /whole score from 0 to 10/)
  }
  assert.throws(() => buildQuizAwards(players, {}, 10), /at least one/)
  const requests = []
  const result = await settleQuizAwards(awards, async (award) => {
    requests.push(award.player.id)
    if (award.player.id === 'player-2') throw new Error('Unable to save')
    return { player: { ...award.player, gold: 300 }, bonusAwarded: false }
  })
  assert.deepEqual(requests, ['player-0', 'player-2'])
  assert.deepEqual(result.completed.map(({ playerId }) => playerId), ['player-0', 'player-1'])
  assert.deepEqual(result.failed, [{ playerId: 'player-2', message: 'Player 2: Unable to save' }])
})

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'aquarium-gold-test-'))
  t.after(async () => {
    assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep))
    await rm(root, { recursive: true, force: true })
  })
  return root
}

test('concurrent quiz rewards persist for every player and survive reopening', async (t) => {
  const root = await fixture(t)
  const filename = path.join(root, 'sunday-school.json')
  const initial = { players, inventory: [{ user_id: 'player-0', item_slug: 'test', quantity: 2 }], attendance: { 'player-0:2026-11-15': true }, customData: 'preserve' }
  await writeFile(filename, JSON.stringify(initial))
  let server = await startLocalServer({ port: 0, dataDirectory: root })
  try {
    const adjust = async (playerId, amount) => {
      const response = await fetch(`${server.url}/api/adjust-player-gold`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer local-admin' },
        body: JSON.stringify({ playerId, amount }),
      })
      assert.equal(response.status, 200)
      return response.json()
    }
    await Promise.all(players.map((player, index) => adjust(player.id, (index % 10 + 1) * 20)))
    await Promise.all(Array.from({ length: 20 }, () => adjust('player-0', 20)))
    const saved = JSON.parse(await readFile(filename, 'utf8'))
    for (let index = 0; index < players.length; index++) {
      assert.equal(saved.players[index].gold, 100 + (index % 10 + 1) * 20 + (index === 0 ? 400 : 0))
    }
    assert.deepEqual(saved.attendance, initial.attendance)
    assert.deepEqual(saved.inventory, initial.inventory)
    assert.equal(saved.customData, 'preserve')
    await server.close()
    server = await startLocalServer({ port: 0, dataDirectory: root })
    const refreshed = await (await fetch(`${server.url}/api/public-players`)).json()
    for (const player of saved.players) assert.equal(refreshed.players.find((entry) => entry.id === player.id).gold, player.gold)
  } finally { await server.close() }
})

test('local storage keeps corrupt originals and recovers its queue after errors', async (t) => {
  const root = await fixture(t)
  const store = createDataStore(root)
  await store.run(async (data, write) => { data.players = players; await write(data) })
  await assert.rejects(store.run(() => { throw new Error('Expected failure') }), /Expected failure/)
  assert.equal(await store.run((data) => data.players.length), 33)
  const damaged = '{"players": [broken original'
  await writeFile(store.filename, damaged)
  await assert.rejects(store.run(async (data, write) => write(data)), /has not been replaced/)
  assert.equal(await readFile(store.filename, 'utf8'), damaged)
})
