import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { startLocalServer } from '../local-server.mjs'
import { getTodaysRewardPlayers, getAttendanceDateKey } from '../src/features/attendance/rewardAttendance.js'

test('reward eligibility uses the exact local date, excluding absent and hidden players', () => {
  const players = [{ id: 'today' }, { id: 'old' }, { id: 'future' }, { id: 'absent' }, { id: 'hidden', attendance_hidden: true }]
  const attendance = { 'today:2026-11-22': true, 'old:2026-11-15': true, 'future:2026-11-29': true, 'hidden:2026-11-22': true, 'absent:2026-11-22': false }
  assert.deepEqual(getTodaysRewardPlayers(players, attendance, new Date(2026, 10, 22)).map((player) => player.id), ['today'])
  assert.deepEqual(getTodaysRewardPlayers(players, attendance, new Date(2026, 10, 21)), [])
  assert.equal(getAttendanceDateKey(new Date(2026, 10, 22, 0, 5)), '2026-11-22')
})

test('hide/unhide is authorized, persistent and preserves attendance, inventory and balances', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'aquarium-visibility-'))
  const filename = path.join(root, 'sunday-school.json')
  const original = {
    players: [{ id: 'test', role: 'player', display_name: 'Test', gold: 700 }],
    inventory: [{ user_id: 'test', quantity: 3 }], attendance: { 'test:2026-11-22': true },
  }
  await writeFile(filename, JSON.stringify(original))
  let server = await startLocalServer({ port: 0, dataDirectory: root })
  try {
    const change = (hidden, token = 'local-admin') => fetch(`${server.url}/api/player-attendance-visibility`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ playerId: 'test', hidden }),
    })
    assert.equal((await change(true, 'bad-token')).status, 401)
    assert.equal((await change('true')).status, 400)
    assert.equal((await change(true)).status, 200)
    await server.close()
    server = await startLocalServer({ port: 0, dataDirectory: root })
    const { players } = await (await fetch(`${server.url}/api/public-players`)).json()
    assert.equal(players[0].attendance_hidden, true)
    assert.equal((await change(false)).status, 200)
    const saved = JSON.parse(await readFile(filename, 'utf8'))
    assert.deepEqual(saved.players, [{ ...original.players[0], attendance_hidden: false }])
    assert.deepEqual(saved.inventory, original.inventory)
    assert.deepEqual(saved.attendance, original.attendance)
  } finally {
    await server.close()
    assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep))
    await rm(root, { recursive: true, force: true })
  }
})
