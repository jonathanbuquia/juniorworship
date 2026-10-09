import { createProgramStore } from './store.mjs'
import { createSongLibrary } from './songLibrary.mjs'
import { streamProgramMedia } from './media.mjs'
import { PROGRAM_DATA_DIR, SONGS_DIR, LEGACY_SONGS_DIR } from './config.mjs'

export function createProgramRoutes({ dataDirectory = PROGRAM_DATA_DIR, songsDirectory = SONGS_DIR, legacyDirectory = LEGACY_SONGS_DIR } = {}) {
  const store = createProgramStore(dataDirectory)
  const library = createSongLibrary({ root: songsDirectory, legacyRoot: legacyDirectory })
  function json(res, status, data) {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
    res.end(JSON.stringify(data))
  }
  return async (req, res, url) => {
    if (!['/api/program', '/api/program/songs'].includes(url.pathname) && !url.pathname.startsWith('/media/program/')) return false
    try {
      if (url.pathname.startsWith('/media/program/') && ['GET', 'HEAD'].includes(req.method)) {
        await streamProgramMedia(req, res, await library.resolveMedia(url.pathname.slice('/media/program/'.length)))
      } else if (url.pathname === '/api/program/songs' && req.method === 'GET') {
        json(res, 200, { songs: await library.scan(), folder: songsDirectory })
      } else if (url.pathname === '/api/program' && req.method === 'GET') {
        json(res, 200, { program: await store.load() })
      } else if (url.pathname === '/api/program' && req.method === 'PUT') {
        // The desktop app is local-only; reject cross-site form submissions.
        if (!String(req.headers['content-type']).startsWith('application/json') || req.headers['sec-fetch-site'] === 'cross-site') {
          json(res, 403, { error: 'Program updates must come from Aquarium.' }); return true
        }
        const chunks = []
        let bytes = 0
        for await (const chunk of req) {
          bytes += chunk.length
          if (bytes > 512_000) { json(res, 413, { error: 'Program is too large.' }); return true }
          chunks.push(chunk)
        }
        let value
        try { value = JSON.parse(Buffer.concat(chunks).toString()); } catch { json(res, 400, { error: 'Invalid program data.' }); return true }
        json(res, 200, { program: await store.save(value) })
      } else json(res, 405, { error: 'Method not allowed.' })
    } catch (error) {
      if (!res.headersSent) json(res, 500, { error: error.message || 'Program request failed.' })
    }
    return true
  }
}
