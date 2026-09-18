import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { ensureDesktopBuild } from './desktop-build.mjs'

const require = createRequire(import.meta.url)
const root = fileURLToPath(new URL('../', import.meta.url))

function run(command, args, { windowsHide = true } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: 'inherit', windowsHide })
    child.once('error', reject)
    child.once('exit', (code, signal) => {
      if (code === 0) resolve()
      else reject(new Error(`App process stopped (${signal ?? code}).`))
    })
  })
}

try {
  const rebuilt = await ensureDesktopBuild(root, async () => {
    console.log('Updating Aquarium...')
    const viteEntry = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url))
    await run(process.execPath, [viteEntry, 'build'])
  })
  console.log(rebuilt ? 'Aquarium updated.' : 'Aquarium is up to date. Using saved build.')
  // Hide build consoles, but let Electron show the application's actual window.
  if (!process.argv.includes('--build-only')) await run(require('electron'), ['.'], { windowsHide: false })
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
