import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { pipeline } from 'node:stream/promises'
import path from 'node:path'

const TYPES = { '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.mp4': 'video/mp4', '.webm': 'video/webm', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' }

export async function streamProgramMedia(req, res, filename) {
  let info
  try { info = filename ? await stat(filename) : null } catch (error) { if (error.code !== 'ENOENT') throw error }
  if (!info?.isFile()) { res.writeHead(404); res.end('Song file not found. Refresh the library.'); return }
  const size = info.size
  const headers = { 'Content-Type': TYPES[path.extname(filename).toLowerCase()] || 'application/octet-stream', 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' }
  let start = 0
  let end = size - 1
  if (req.headers.range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range)
    if (match && (match[1] || match[2])) {
      start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]))
      end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1
    } else start = size
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start > end || start >= size) {
      res.writeHead(416, { ...headers, 'Content-Range': `bytes */${size}` }); res.end(); return
    }
    headers['Content-Range'] = `bytes ${start}-${end}/${size}`
  }
  res.writeHead(req.headers.range ? 206 : 200, { ...headers, 'Content-Length': Math.max(0, end - start + 1) })
  if (req.method === 'HEAD' || !size) { res.end(); return }
  try { await pipeline(createReadStream(filename, { start, end }), res) }
  catch (error) { if (!req.destroyed && !res.destroyed) throw error }
}
