import { readFile, realpath, stat } from 'node:fs/promises'
import path from 'node:path'

export function splitLyricPages(text) {
  return text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim().split(/\n\s*\n/)
    .filter(Boolean).flatMap((verse) => {
      const lines = verse.split('\n').flatMap((line) => {
        const wrapped = []
        let current = ''
        for (const word of line.trim().split(/\s+/)) {
          if (current && current.length + word.length + 1 > 44) { wrapped.push(current); current = '' }
          current = current ? `${current} ${word}` : word
        }
        if (current) wrapped.push(current)
        return wrapped
      })
      const pages = []
      for (let index = 0; index < lines.length; index += 4) pages.push(lines.slice(index, index + 4).join('\n'))
      return pages
    })
}

export async function loadTextLyrics(filenames, allowedRoot) {
  for (const filename of filenames) {
    try {
      const [resolved, root] = await Promise.all([realpath(filename), realpath(allowedRoot)])
      const relative = path.relative(root, resolved)
      if (relative.startsWith('..') || path.isAbsolute(relative)) continue
      const info = await stat(resolved)
      if (!info.isFile() || info.size > 64_000) continue
      const pages = splitLyricPages(await readFile(resolved, 'utf8'))
      if (pages.length) return pages.map((text, index) => ({ name: `Lyrics ${index + 1}`, text }))
    } catch (error) { if (error.code !== 'ENOENT') throw error }
  }
  return []
}
