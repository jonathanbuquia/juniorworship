import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { ensureDesktopBuild } from '../scripts/desktop-build.mjs'

test('desktop reuses a build and invalidates it for changed or removed inputs', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'aquarium-build-test-'))
  let buildCount = 0
  const build = async () => {
    buildCount++
    await mkdir(path.join(root, 'dist'), { recursive: true })
    await writeFile(path.join(root, 'dist', 'index.html'), `build ${buildCount}`)
  }
  try {
    await mkdir(path.join(root, 'src'))
    await writeFile(path.join(root, 'src', 'app.jsx'), 'original')
    assert.equal(await ensureDesktopBuild(root, build), true)
    assert.equal(await ensureDesktopBuild(root, build), false)
    assert.equal(buildCount, 1)

    await writeFile(path.join(root, 'src', 'app.jsx'), 'changed')
    assert.equal(await ensureDesktopBuild(root, build), true)
    await writeFile(path.join(root, '.env.local'), 'VITE_TEST=1')
    assert.equal(await ensureDesktopBuild(root, build), true)
    await rm(path.join(root, 'src', 'app.jsx'))
    assert.equal(await ensureDesktopBuild(root, build), true)

    await mkdir(path.join(root, 'local-data'))
    await writeFile(path.join(root, 'local-data', 'sunday-school.json'), '{}')
    assert.equal(await ensureDesktopBuild(root, build), false)
    await rm(path.join(root, 'dist', 'index.html'))
    assert.equal(await ensureDesktopBuild(root, build), true)
    await writeFile(path.join(root, 'src', 'app.jsx'), 'new input')
    await assert.rejects(ensureDesktopBuild(root, async () => { throw new Error('Build failed') }))
    assert.equal(await ensureDesktopBuild(root, build), true)
    assert.equal(await ensureDesktopBuild(root, build), false)
  } finally {
    const resolved = path.resolve(root)
    if (path.dirname(resolved) === path.resolve(tmpdir()) && path.basename(resolved).startsWith('aquarium-build-test-')) {
      await rm(resolved, { recursive: true, force: true })
    }
  }
})
