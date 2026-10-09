import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = fileURLToPath(new URL('../../', import.meta.url))
export const LEGACY_SONGS_DIR = process.env.AQUARIUM_LEGACY_SONGS_DIR || 'E:\\SUNDAY SCHOOL\\JUNIOR WORSHIP'
export const SONGS_DIR = process.env.AQUARIUM_SONGS_DIR || path.join(LEGACY_SONGS_DIR, 'BIBLE TRUTH KIDS SONGS')
export const PROGRAM_DATA_DIR = process.env.AQUARIUM_PROGRAM_DATA_DIR || path.join(projectRoot, 'local-data')
