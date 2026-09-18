import { createHash } from 'node:crypto'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

async function hashPath(hash, root, relativePath) {
  const absolutePath = path.join(root, relativePath)
  let entries
  try {
    entries = await readdir(absolutePath, { withFileTypes: true })
  } catch (error) {
    if (error.code === 'ENOENT') return
    if (error.code !== 'ENOTDIR') throw error
    hash.update(relativePath).update('\0').update(await readFile(absolutePath)).update('\0')
    return
  }
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isSymbolicLink()) await hashPath(hash, root, path.join(relativePath, entry.name))
  }
}

export async function getBuildFingerprint(root) {
  const hash = createHash('sha256')
  const inputs = ['src', 'shared', 'public', 'index.html', 'package.json', 'package-lock.json']
  const rootFiles = await readdir(root)
  inputs.push(...rootFiles.filter((name) => name.startsWith('.env') || /^vite\.config\./.test(name)))
  for (const input of inputs.sort()) await hashPath(hash, root, input)
  return hash.digest('hex')
}

export async function ensureDesktopBuild(root, build) {
  const fingerprint = await getBuildFingerprint(root)
  const markerPath = path.join(root, 'dist', '.desktop-build.json')
  try {
    const marker = JSON.parse(await readFile(markerPath, 'utf8'))
    const index = await readFile(path.join(root, 'dist', 'index.html'))
    const indexHash = createHash('sha256').update(index).digest('hex')
    if (marker.fingerprint === fingerprint && marker.indexHash === indexHash) return false
  } catch (error) {
    if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error
  }

  await build()
  const index = await readFile(path.join(root, 'dist', 'index.html'))
  await writeFile(markerPath, JSON.stringify({
    fingerprint,
    indexHash: createHash('sha256').update(index).digest('hex'),
  }))
  return true
}
