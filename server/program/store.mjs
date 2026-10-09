import { mkdir, readFile, writeFile, rename, rm } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { createDefaultProgram, normalizeProgram } from '../../shared/program.js'

export function createProgramStore(directory) {
  const filename = path.join(directory, 'program.json')
  let pending = Promise.resolve()
  async function load() {
    try {
      return normalizeProgram(JSON.parse(await readFile(filename, 'utf8')))
    } catch (error) {
      if (error.code === 'ENOENT') return createDefaultProgram()
      throw new Error('The saved program could not be read. Your existing file has not been replaced.', { cause: error })
    }
  }
  return {
    load,
    save(value) {
      const program = normalizeProgram(value)
      const result = pending.then(async () => {
        const current = await load()
        if (current.updatedAt > program.updatedAt) return current
        await mkdir(directory, { recursive: true })
        const temporary = `${filename}.${randomUUID()}.tmp`
        try {
          await writeFile(temporary, JSON.stringify(program, null, 2), 'utf8')
          await rename(temporary, filename)
        } finally {
          await rm(temporary, { force: true })
        }
        return program
      })
      pending = result.catch(() => {})
      return result
    },
  }
}
