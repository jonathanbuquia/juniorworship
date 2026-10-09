import { mkdir, readdir, realpath } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { loadTextLyrics } from './lyrics.mjs'

const AUDIO = new Set(['.mp3', '.m4a', '.wav', '.ogg'])
const VIDEO = new Set(['.mp4', '.webm'])
const IMAGES = new Set(['.png', '.jpg', '.jpeg', '.webp'])
const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' })
const idFor = (value) => createHash('sha256').update(value).digest('hex').slice(0, 32)

async function list(directory) {
  try { return (await readdir(directory, { withFileTypes: true })).filter((entry) => !entry.isSymbolicLink()).sort((a, b) => collator.compare(a.name, b.name)) }
  catch (error) { if (error.code === 'ENOENT') return []; throw error }
}

export function createSongLibrary({ root, legacyRoot }) {
  let media = new Map()
  async function scan() {
    await mkdir(root, { recursive: true })
    const nextMedia = new Map()
    const songs = []
    function mediaUrl(filename, allowedRoot) {
      const id = idFor(filename)
      nextMedia.set(id, { filename, allowedRoot })
      return `/media/program/${id}`
    }
    async function addSong(directory, title, key, entries, allowedRoot, lyricSources = {}) {
      const files = entries.filter((entry) => entry.isFile())
      const track = files.find((entry) => AUDIO.has(path.extname(entry.name).toLowerCase()))
        || files.find((entry) => VIDEO.has(path.extname(entry.name).toLowerCase()))
      const lyricsFolder = entries.find((entry) => entry.isDirectory() && entry.name.toLowerCase() === 'lyrics')
      const lyricsDirectory = lyricSources.directory || (lyricsFolder ? path.join(directory, lyricsFolder.name) : directory)
      let slides = (lyricsFolder || lyricSources.directory ? await list(lyricsDirectory) : files)
        .filter((entry) => entry.isFile() && IMAGES.has(path.extname(entry.name).toLowerCase()))
        .map((entry) => ({ name: entry.name, url: mediaUrl(path.join(lyricsDirectory, entry.name), allowedRoot) }))
      if (!slides.length) {
        slides = await loadTextLyrics(lyricSources.textPaths || [
          path.join(lyricsDirectory, 'lyrics.txt'),
          path.join(directory, `${track ? path.parse(track.name).name : title}.txt`),
          path.join(directory, 'lyrics.txt'),
        ], allowedRoot)
      }
      if (!track && !slides.length) return
      songs.push({
        id: idFor(key), title, slides, thumbnail: slides.find((slide) => slide.url)?.url || '',
        mediaUrl: track ? mediaUrl(path.join(directory, track.name), allowedRoot) : '',
        mediaType: track && VIDEO.has(path.extname(track.name).toLowerCase()) ? 'video' : 'audio',
        audioName: track?.name || '',
      })
    }
    for (const entry of await list(root)) {
      if (entry.name.startsWith('.')) continue
      if (entry.isDirectory()) await addSong(path.join(root, entry.name), entry.name, `song:${entry.name}`, await list(path.join(root, entry.name)), root)
      else if (entry.isFile() && (AUDIO.has(path.extname(entry.name).toLowerCase()) || VIDEO.has(path.extname(entry.name).toLowerCase()))) {
        await addSong(root, path.parse(entry.name).name, `file:${entry.name}`, [entry], root)
      }
    }
    // Existing tracks stay in their original folder; the library only references them.
    if (legacyRoot && path.resolve(legacyRoot) !== path.resolve(root)) {
      for (const entry of await list(legacyRoot)) {
        if (entry.isFile() && (AUDIO.has(path.extname(entry.name).toLowerCase()) || VIDEO.has(path.extname(entry.name).toLowerCase()))) {
          await addSong(legacyRoot, path.parse(entry.name).name, `existing:${entry.name}`, [entry], legacyRoot)
        }
      }
    }
    if (legacyRoot) {
      const bibleDirectory = path.join(legacyRoot, 'BIBLE TRUTH KIDS SONGS')
      for (const entry of await list(bibleDirectory)) {
        if (!entry.isFile() || !AUDIO.has(path.extname(entry.name).toLowerCase())) continue
        const title = path.parse(entry.name).name
        await addSong(bibleDirectory, title, `bible-truth:${entry.name}`, [entry], bibleDirectory, {
          directory: path.join(bibleDirectory, 'Lyrics', title),
          textPaths: [path.join(bibleDirectory, 'Lyrics', `${title}.txt`), path.join(bibleDirectory, `${title}.txt`)],
        })
      }
    }
    media = nextMedia
    return songs.sort((a, b) => collator.compare(a.title, b.title))
  }
  return {
    scan,
    async resolveMedia(id) {
      if (!media.has(id)) await scan()
      const entry = media.get(id)
      if (!entry) return null
      try {
        const [resolved, allowed] = await Promise.all([realpath(entry.filename), realpath(entry.allowedRoot)])
        const relative = path.relative(allowed, resolved)
        if (relative.startsWith('..') || path.isAbsolute(relative)) return null
        return resolved
      } catch (error) { if (error.code === 'ENOENT') return null; throw error }
    },
  }
}
