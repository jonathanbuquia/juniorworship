import { stat } from 'node:fs/promises'

// This one explicitly configured track is separate from the worship library.
// No request parameter can select other files from the parent folder.
export async function loadOfferingSong(filename) {
  try {
    const info = await stat(filename)
    if (!info.isFile() || !info.size) return null
    return {
      id: 'offering', title: 'Tithes and Offering', slides: [],
      mediaType: 'audio', mediaUrl: '/media/program/offering',
    }
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}
