import { exec } from 'node:child_process'
import crypto from 'node:crypto'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { findShopItemBySlug, formatRequirementsSummary, isEventShopItem } from './shared/shopCatalog.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.AQUARIUM_PORT || 4177)
const DATA_DIR = path.join(__dirname, 'local-data')
const DATA_PATH = path.join(DATA_DIR, 'sunday-school.json')
const DIST_DIR = path.join(__dirname, 'dist')
const BOOKS_OF_THE_BIBLE_VIDEO_PATH = 'E:\\SUNDAY SCHOOL\\JUNIOR WORSHIP\\BOOKS OF THE BIBLE.mp4'

const MIME_TYPES = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webp', 'image/webp'],
])

function createEmptyData() {
  return {
    admin: null,
    attendance: {},
    inventory: [],
    players: [],
    version: 1,
  }
}

function normalizeLoginName(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload)

  res.writeHead(status, {
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body),
    'Content-Type': 'application/json; charset=utf-8',
  })
  res.end(body)
}

function serveBooksOfTheBibleVideo(req, res) {
  if (!existsSync(BOOKS_OF_THE_BIBLE_VIDEO_PATH)) {
    return sendJson(res, 404, { error: 'Books of the Bible video was not found on this laptop.' })
  }

  const { size } = statSync(BOOKS_OF_THE_BIBLE_VIDEO_PATH)
  const range = req.headers.range
  const headers = {
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-store',
    'Content-Type': 'video/mp4',
  }

  if (!range) {
    res.writeHead(200, {
      ...headers,
      'Content-Length': size,
    })
    createReadStream(BOOKS_OF_THE_BIBLE_VIDEO_PATH).pipe(res)
    return
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(range)

  if (!match) {
    res.writeHead(416, {
      ...headers,
      'Content-Range': `bytes */${size}`,
    })
    res.end()
    return
  }

  const start = match[1] ? Number(match[1]) : 0
  const end = match[2] ? Number(match[2]) : size - 1

  if (start >= size || end >= size || start > end) {
    res.writeHead(416, {
      ...headers,
      'Content-Range': `bytes */${size}`,
    })
    res.end()
    return
  }

  res.writeHead(206, {
    ...headers,
    'Content-Length': end - start + 1,
    'Content-Range': `bytes ${start}-${end}/${size}`,
  })
  createReadStream(BOOKS_OF_THE_BIBLE_VIDEO_PATH, { start, end }).pipe(res)
}

function createPasswordHash(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex')
  return { hash, salt }
}

function passwordsMatch(password, admin) {
  if (!admin?.password_hash || !admin?.password_salt) {
    return false
  }

  const { hash } = createPasswordHash(password, admin.password_salt)
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(admin.password_hash, 'hex'))
}

function publicPlayer(player) {
  return {
    created_at: player.created_at,
    display_name: player.display_name,
    gold: Number(player.gold || 0),
    id: player.id,
    login_name: player.login_name ?? null,
    role: 'player',
  }
}

function adminProfile(admin) {
  if (!admin) {
    return null
  }

  return {
    display_name: admin.display_name,
    gold: 0,
    id: admin.id,
    login_name: admin.login_name,
    role: 'admin',
  }
}

function createSession(admin) {
  const token = `local-admin-${crypto.randomUUID()}`
  const profile = adminProfile(admin)

  admin.session_token = token

  return {
    access_token: token,
    expires_in: 60 * 60 * 24 * 365,
    refresh_token: token,
    token_type: 'bearer',
    user: {
      id: admin.id,
      user_metadata: {
        profile,
      },
    },
  }
}

async function readData() {
  await mkdir(DATA_DIR, { recursive: true })

  if (!existsSync(DATA_PATH)) {
    const emptyData = createEmptyData()
    await writeData(emptyData)
    return emptyData
  }

  try {
    const parsed = JSON.parse(await readFile(DATA_PATH, 'utf8'))
    return {
      ...createEmptyData(),
      ...parsed,
      attendance: parsed.attendance && typeof parsed.attendance === 'object' ? parsed.attendance : {},
      inventory: Array.isArray(parsed.inventory) ? parsed.inventory : [],
      players: Array.isArray(parsed.players) ? parsed.players : [],
    }
  } catch {
    return createEmptyData()
  }
}

async function writeData(data) {
  await mkdir(DATA_DIR, { recursive: true })
  await writeFile(DATA_PATH, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
}

async function readBody(req) {
  const chunks = []

  for await (const chunk of req) {
    chunks.push(chunk)
  }

  if (!chunks.length) {
    return {}
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
}

function requireAdmin(req, data) {
  const authHeader = String(req.headers.authorization || '')
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''

  if (token === 'local-admin') {
    return {
      admin: {
        display_name: 'Teacher',
        id: 'local-admin',
        login_name: 'local',
        role: 'admin',
      },
    }
  }

  if (!data.admin) {
    return { error: 'Create the local admin account first.', status: 401 }
  }

  if (!token || token !== data.admin.session_token) {
    return { error: 'Please sign in as admin first.', status: 401 }
  }

  return { admin: data.admin }
}

function getPlayerById(data, playerId) {
  return data.players.find((player) => player.id === playerId && player.role === 'player') ?? null
}

function getInventoryQuantity(data, playerId, slug) {
  return data.inventory
    .filter((entry) => entry.user_id === playerId && entry.item_slug === slug)
    .reduce((total, entry) => total + Number(entry.quantity || 0), 0)
}

function sortedPlayers(data) {
  return [...data.players].sort((left, right) => left.display_name.localeCompare(right.display_name)).map(publicPlayer)
}

async function handleApi(req, res, url) {
  const data = await readData()
  const route = `${req.method} ${url.pathname}`

  if (route === 'GET /api/admin-status') {
    return sendJson(res, 200, { hasAdmin: true })
  }

  if (route === 'POST /api/bootstrap-admin') {
    if (data.admin) {
      return sendJson(res, 409, { error: 'An admin account already exists. Please sign in instead.' })
    }

    const body = await readBody(req)
    const displayName = String(body.displayName || '').trim()
    const loginName = normalizeLoginName(body.loginName)
    const password = String(body.password || '')

    if (!displayName || !loginName || !password) {
      return sendJson(res, 400, { error: 'Display name, login name, and password are required.' })
    }

    if (password.length < 6) {
      return sendJson(res, 400, { error: 'Password must be at least 6 characters long.' })
    }

    const passwordParts = createPasswordHash(password)
    data.admin = {
      created_at: new Date().toISOString(),
      display_name: displayName,
      id: crypto.randomUUID(),
      login_name: loginName,
      password_hash: passwordParts.hash,
      password_salt: passwordParts.salt,
      role: 'admin',
    }

    const session = createSession(data.admin)
    await writeData(data)

    return sendJson(res, 200, {
      session,
      user: {
        displayName,
        loginName,
      },
    })
  }

  if (route === 'POST /api/login-player') {
    const body = await readBody(req)
    const loginName = normalizeLoginName(body.loginName)
    const password = String(body.password || '')

    if (!loginName || !password || !data.admin || data.admin.login_name !== loginName || !passwordsMatch(password, data.admin)) {
      return sendJson(res, 401, { error: 'Invalid login name or password.' })
    }

    const session = createSession(data.admin)
    await writeData(data)

    return sendJson(res, 200, { session })
  }

  if (route === 'GET /api/public-players') {
    return sendJson(res, 200, { players: sortedPlayers(data) })
  }

  if (route === 'GET /api/admin-players') {
    const adminResult = requireAdmin(req, data)

    if (adminResult.error) {
      return sendJson(res, adminResult.status, { error: adminResult.error })
    }

    return sendJson(res, 200, { players: sortedPlayers(data) })
  }

  if (route === 'POST /api/create-player') {
    const adminResult = requireAdmin(req, data)

    if (adminResult.error) {
      return sendJson(res, adminResult.status, { error: adminResult.error })
    }

    const body = await readBody(req)
    const displayName = String(body.displayName || '').trim()
    const startingGold = Number(body.startingGold)

    if (!displayName) {
      return sendJson(res, 400, { error: 'Display name is required.' })
    }

    if (!Number.isInteger(startingGold) || startingGold < 0) {
      return sendJson(res, 400, { error: 'Starting gold must be a whole number that is zero or higher.' })
    }

    const player = {
      created_at: new Date().toISOString(),
      display_name: displayName,
      gold: startingGold,
      id: crypto.randomUUID(),
      login_name: null,
      role: 'player',
    }

    data.players.push(player)
    await writeData(data)

    return sendJson(res, 200, {
      player: {
        id: player.id,
        displayName,
        startingGold,
      },
    })
  }

  if (route === 'POST /api/delete-player') {
    const adminResult = requireAdmin(req, data)

    if (adminResult.error) {
      return sendJson(res, adminResult.status, { error: adminResult.error })
    }

    const body = await readBody(req)
    const playerId = String(body.playerId || '').trim()
    const player = getPlayerById(data, playerId)

    if (!player) {
      return sendJson(res, 404, { error: 'That player account could not be found.' })
    }

    data.players = data.players.filter((entry) => entry.id !== playerId)
    data.inventory = data.inventory.filter((entry) => entry.user_id !== playerId)
    data.attendance = Object.fromEntries(
      Object.entries(data.attendance).filter(([key]) => !key.startsWith(`${playerId}:`)),
    )
    await writeData(data)

    return sendJson(res, 200, {
      player: {
        display_name: player.display_name,
        id: player.id,
      },
    })
  }

  if (route === 'POST /api/adjust-player-gold') {
    const adminResult = requireAdmin(req, data)

    if (adminResult.error) {
      return sendJson(res, adminResult.status, { error: adminResult.error })
    }

    const body = await readBody(req)
    const playerId = String(body.playerId || '').trim()
    const amount = Number(body.amount)
    const player = getPlayerById(data, playerId)

    if (!player) {
      return sendJson(res, 404, { error: 'That player account could not be found.' })
    }

    if (!Number.isInteger(amount) || amount === 0) {
      return sendJson(res, 400, { error: 'Gold change must be a whole number that is not zero.' })
    }

    const nextGold = Number(player.gold || 0) + amount

    if (nextGold < 0) {
      return sendJson(res, 400, { error: `${player.display_name} only has ${player.gold} gold right now.` })
    }

    player.gold = nextGold
    await writeData(data)

    return sendJson(res, 200, {
      amount,
      player: publicPlayer(player),
    })
  }

  if (route === 'GET /api/public-player-aquarium') {
    const playerId = String(url.searchParams.get('playerId') || '').trim()

    if (!playerId) {
      return sendJson(res, 400, { error: 'A playerId is required.' })
    }

    const fish = data.inventory
      .filter((entry) => entry.user_id === playerId && Number(entry.quantity || 0) > 0)
      .map((entry) => {
        const item = findShopItemBySlug(entry.item_slug)
        return {
          name: item?.name ?? entry.item_name ?? '',
          purchasedAt: entry.created_at ?? '',
          quantity: Number(entry.quantity || 0),
          slug: entry.item_slug ?? '',
        }
      })

    return sendJson(res, 200, { fish })
  }

  if (route === 'POST /api/admin-buy-item') {
    const adminResult = requireAdmin(req, data)

    if (adminResult.error) {
      return sendJson(res, adminResult.status, { error: adminResult.error })
    }

    const body = await readBody(req)
    const playerId = String(body.playerId || '').trim()
    const itemSlug = String(body.itemSlug || '').trim()
    const player = getPlayerById(data, playerId)
    const catalogItem = findShopItemBySlug(itemSlug)

    if (!player) {
      return sendJson(res, 404, { error: 'That player could not be found.' })
    }

    if (!catalogItem) {
      return sendJson(res, 400, { error: 'That shop item is not available yet.' })
    }

    if (Number(player.gold || 0) < catalogItem.price) {
      return sendJson(res, 400, {
        error: `${player.display_name} needs ${catalogItem.price} gold for ${catalogItem.name}, but only has ${player.gold}.`,
      })
    }

    if (catalogItem.requirements?.length) {
      const missingRequirements = catalogItem.requirements.filter(
        (requirement) => getInventoryQuantity(data, player.id, requirement.slug) < requirement.quantity,
      )

      if (missingRequirements.length) {
        return sendJson(res, 400, {
          error: `${catalogItem.name} requires ${formatRequirementsSummary(catalogItem.requirements)} first.`,
        })
      }
    }

    let inventoryEntry = data.inventory.find((entry) => entry.user_id === player.id && entry.item_slug === catalogItem.slug)

    if (isEventShopItem(catalogItem) && Number(inventoryEntry?.quantity ?? 0) > 0) {
      return sendJson(res, 400, {
        error: `${catalogItem.name} is a special event creature and can only be bought once per player.`,
      })
    }

    player.gold = Number(player.gold || 0) - catalogItem.price

    if (inventoryEntry) {
      inventoryEntry.quantity = Number(inventoryEntry.quantity || 0) + 1
    } else {
      inventoryEntry = {
        created_at: new Date().toISOString(),
        id: crypto.randomUUID(),
        item_name: catalogItem.name,
        item_slug: catalogItem.slug,
        quantity: 1,
        user_id: player.id,
      }
      data.inventory.push(inventoryEntry)
    }

    await writeData(data)

    return sendJson(res, 200, {
      item: {
        name: catalogItem.name,
        price: catalogItem.price,
        slug: catalogItem.slug,
      },
      player: publicPlayer(player),
      quantity: inventoryEntry.quantity,
    })
  }

  if (route === 'GET /api/attendance-records') {
    return sendJson(res, 200, { attendance: data.attendance })
  }

  if (route === 'POST /api/attendance-records') {
    const adminResult = requireAdmin(req, data)

    if (adminResult.error) {
      return sendJson(res, adminResult.status, { error: adminResult.error })
    }

    const body = await readBody(req)
    const records = Array.isArray(body.records) ? body.records : [body]

    records.forEach((record) => {
      const playerId = String(record.playerId || '').trim()
      const dateId = String(record.dateId || '').trim()

      if (playerId && dateId) {
        data.attendance[`${playerId}:${dateId}`] = Boolean(record.present)
      }
    })

    await writeData(data)
    return sendJson(res, 200, { attendance: data.attendance })
  }

  return sendJson(res, 404, { error: 'Local API route not found.' })
}

async function serveStatic(req, res, url) {
  const requestedPath = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)
  const safePath = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, '')
  let filePath = path.join(DIST_DIR, safePath)

  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403)
    res.end('Forbidden')
    return
  }

  if (!existsSync(filePath)) {
    filePath = path.join(DIST_DIR, 'index.html')
  }

  if (!existsSync(filePath)) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('The app has not been built yet. Run npm run build first.')
    return
  }

  const body = await readFile(filePath)
  res.writeHead(200, {
    'Cache-Control': filePath.endsWith('index.html') ? 'no-store' : 'public, max-age=31536000, immutable',
    'Content-Type': MIME_TYPES.get(path.extname(filePath)) || 'application/octet-stream',
  })
  res.end(body)
}

function createAquariumServer(port) {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', `http://${req.headers.host || `127.0.0.1:${port}`}`)

      if (url.pathname === '/media/books-of-the-bible') {
        serveBooksOfTheBibleVideo(req, res)
        return
      }

      if (url.pathname.startsWith('/api/')) {
        await handleApi(req, res, url)
        return
      }

      await serveStatic(req, res, url)
    } catch (error) {
      sendJson(res, 500, { error: error.message || 'Local server error.' })
    }
  })
}

export function startLocalServer({ host = '127.0.0.1', open = false, port = PORT } = {}) {
  const server = createAquariumServer(port)

  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, host, () => {
      server.off('error', reject)

      const address = server.address()
      const actualPort = typeof address === 'object' && address ? address.port : port
      const appUrl = `http://${host}:${actualPort}`

      console.log(`Aquarium is running at ${appUrl}`)
      console.log(`Local data is saved in ${DATA_PATH}`)

      if (open) {
        const command =
          process.platform === 'win32'
            ? `start "" "${appUrl}"`
            : process.platform === 'darwin'
              ? `open "${appUrl}"`
              : `xdg-open "${appUrl}"`

        exec(command)
      }

      resolve({
        close: () => new Promise((closeResolve) => server.close(closeResolve)),
        server,
        url: appUrl,
      })
    })
  })
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  startLocalServer({ open: process.argv.includes('--open') }).catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
