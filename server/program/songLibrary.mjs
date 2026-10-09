import { readdir, realpath } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { loadTextLyrics } from './lyrics.mjs'

const AUDIO = new Set(['.mp3', '.m4a', '.wav', '.ogg'])
const IMAGES = new Set(['.png', '.jpg', '.jpeg', '.webp'])
const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' })
const idFor = (value) => createHash('sha256').update(value).digest('hex').slice(0, 32)

async function list(directory) {
  try { return (await readdir(directory, { withFileTypes: true })).filter((entry) => !entry.isSymbolicLink()).sort((a, b) => collator.compare(a.name, b.name)) }
  catch (error) { if (error.code === 'ENOENT') return []; throw error }
}

export function createSongLibrary({ root }) {
  let media = new Map()
  async function scan() {
    const nextMedia = new Map()
    const songs = []
    function mediaUrl(filename) {
      const id = idFor(filename)
      nextMedia.set(id, filename)
      return `/media/program/${id}`
    }
    // Only direct audio files in the selected folder are songs. Other folders
    // and videos are never imported; Lyrics is used solely for matched slides.
    for (const entry of await list(root)) {
      if (!entry.isFile() || !AUDIO.has(path.extname(entry.name).toLowerCase())) continue
      const title = path.parse(entry.name).name
      const lyricsDirectory = path.join(root, 'Lyrics', title)
      let slides = (await list(lyricsDirectory))
        .filter((image) => image.isFile() && IMAGES.has(path.extname(image.name).toLowerCase()))
        .map((image) => ({ name: image.name, url: mediaUrl(path.join(lyricsDirectory, image.name)) }))
      if (!slides.length) {
        slides = await loadTextLyrics([
          path.join(root, 'Lyrics', `${title}.txt`),
          path.join(root, `${title}.txt`),
        ], root)
      }
      songs.push({
        id: idFor(`bible-truth:${entry.name}`), title, slides,
        thumbnail: slides.find((slide) => slide.url)?.url || '',
        mediaUrl: mediaUrl(path.join(root, entry.name)),
        mediaType: 'audio', audioName: entry.name,
      })
    }
    media = nextMedia
    return songs.sort((a, b) => collator.compare(a.title, b.title))
  }
  return {
    scan,
    async resolveMedia(id) {
      if (!media.has(id)) await scan()
      const filename = media.get(id)
      if (!filename) return null
      try {
        const [resolved, allowed] = await Promise.all([realpath(filename), realpath(root)])
        const relative = path.relative(allowed, resolved)
        if (relative.startsWith('..') || path.isAbsolute(relative)) return null
        return resolved
      } catch (error) { if (error.code === 'ENOENT') return null; throw error }
    },
  }
}
