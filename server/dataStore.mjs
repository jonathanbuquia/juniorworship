import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import path from 'node:path'

const emptyData = () => ({ admin: null, attendance: {}, inventory: [], players: [], version: 1 })

export function createDataStore(directory) {
  const filename = path.join(directory, 'sunday-school.json')
  let pending = Promise.resolve()

  async function write(data) {
    await mkdir(directory, { recursive: true })
    const temporary = `${filename}.${randomUUID()}.tmp`
    try {
      await writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
      await rename(temporary, filename)
    } finally {
      await rm(temporary, { force: true })
    }
  }

  async function read() {
    let text
    try { text = await readFile(filename, 'utf8') }
    catch (error) {
      if (error.code !== 'ENOENT') throw error
      const data = emptyData()
      await write(data)
      return data
    }
    try {
      const parsed = JSON.parse(text)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid data')
      for (const key of ['players', 'inventory']) {
        if (parsed[key] !== undefined && !Array.isArray(parsed[key])) throw new Error('Invalid records')
      }
      if (parsed.attendance !== undefined && (!parsed.attendance || typeof parsed.attendance !== 'object' || Array.isArray(parsed.attendance))) throw new Error('Invalid attendance')
      return { ...emptyData(), ...parsed }
    } catch {
      throw new Error('Saved Aquarium data could not be read. The file has not been replaced. Restore a valid backup before saving changes.')
    }
  }

  return {
    filename,
    // Serialize the entire read/modify/write operation, not just the final write.
    // Reads share the queue so they cannot observe a partially completed reward.
    run(operation) {
      const result = pending.then(async () => operation(await read(), write))
      pending = result.catch(() => {})
      return result
    },
  }
}
