import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const dataDir = path.join(projectRoot, 'local-data')
const dataPath = path.join(dataDir, 'sunday-school.json')
const liveBaseUrl = process.env.LIVE_AQUARIUM_URL || 'https://juniorworship.vercel.app'

function createEmptyData() {
  return {
    admin: null,
    attendance: {},
    inventory: [],
    players: [],
    version: 1,
  }
}

async function requestJson(pathname) {
  const response = await fetch(new URL(pathname, liveBaseUrl))
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${pathname}`)
  }

  return data
}

async function readExistingData() {
  if (!existsSync(dataPath)) {
    return createEmptyData()
  }

  try {
    return {
      ...createEmptyData(),
      ...JSON.parse(await readFile(dataPath, 'utf8')),
    }
  } catch {
    return createEmptyData()
  }
}

const existingData = await readExistingData()
const [{ players = [] }, attendanceResponse] = await Promise.all([
  requestJson('/api/public-players'),
  requestJson('/api/attendance-records').catch(() => ({ attendance: existingData.attendance || {} })),
])

const inventory = []

for (const player of players) {
  const aquarium = await requestJson(`/api/public-player-aquarium?playerId=${encodeURIComponent(player.id)}`)

  for (const item of aquarium.fish || []) {
    inventory.push({
      created_at: item.purchasedAt || new Date().toISOString(),
      id: `${player.id}:${item.slug}`,
      item_name: item.name,
      item_slug: item.slug,
      quantity: Number(item.quantity || 0),
      user_id: player.id,
    })
  }
}

const nextData = {
  ...createEmptyData(),
  admin: existingData.admin || null,
  attendance: attendanceResponse.attendance || existingData.attendance || {},
  inventory,
  players: players.map((player) => ({
    created_at: player.created_at || new Date().toISOString(),
    display_name: player.display_name,
    gold: Number(player.gold || 0),
    id: player.id,
    login_name: null,
    role: 'player',
  })),
}

await mkdir(dataDir, { recursive: true })
await writeFile(dataPath, `${JSON.stringify(nextData, null, 2)}\n`, 'utf8')

console.log(`Imported ${nextData.players.length} players, ${nextData.inventory.length} inventory rows, and ${Object.keys(nextData.attendance).length} attendance records.`)
console.log(`Saved local data to ${dataPath}`)
