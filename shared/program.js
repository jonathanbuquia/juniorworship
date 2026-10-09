export const PROGRAM_ACTIVITIES = [
  { id: 'books', title: 'Books of the Bible', path: '/books' },
  { id: 'memory', title: 'Memory Verse', path: '/memory-verse' },
  { id: 'quiz', title: 'Quiz / Activity', path: '/quiz' },
]

export function createDefaultProgram() {
  return {
    version: 1,
    title: 'Junior Worship',
    updatedAt: 0,
    favorites: [],
    items: [
      { id: 'welcome', kind: 'screen', title: 'Welcome to Junior Worship', subtitle: 'Let us worship together.' },
      { id: 'song-1', kind: 'screen', title: 'Song 1', subtitle: '' },
      { id: 'prayer', kind: 'screen', title: 'Opening Prayer', subtitle: '' },
      { id: 'song-2', kind: 'screen', title: 'Song 2', subtitle: '' },
      { id: 'announcement', kind: 'screen', title: 'Announcement', subtitle: '' },
      { id: 'offering', kind: 'screen', title: 'Tithes and Offering', subtitle: '' },
      { id: 'memory', kind: 'activity', title: 'Memory Verse', activity: 'memory' },
      { id: 'books', kind: 'activity', title: 'Bible Books', activity: 'books' },
      { id: 'lesson', kind: 'screen', title: 'Bible Lesson', subtitle: '' },
      { id: 'quiz', kind: 'activity', title: 'Quiz', activity: 'quiz' },
      { id: 'closing', kind: 'screen', title: 'Closing Prayer', subtitle: '' },
    ],
  }
}

export function normalizeProgram(value) {
  if (!value || !Array.isArray(value.items) || value.items.length > 200) throw new Error('Invalid program.')
  const ids = new Set()
  const items = value.items.map((item) => {
    if (!item || typeof item.id !== 'string' || !item.id || ids.has(item.id) || item.id.length > 200) throw new Error('Invalid program item.')
    ids.add(item.id)
    if (!['screen', 'song', 'activity'].includes(item.kind)) throw new Error('Invalid program item type.')
    if (item.kind === 'song' && (typeof item.songId !== 'string' || !item.songId || item.songId.length > 200)) throw new Error('Select a song.')
    if (item.kind === 'activity' && !PROGRAM_ACTIVITIES.some((activity) => activity.id === item.activity)) throw new Error('Invalid activity.')
    return {
      id: item.id,
      kind: item.kind,
      title: String(item.title || 'Untitled').slice(0, 160),
      ...(item.kind === 'screen' ? { subtitle: String(item.subtitle || '').slice(0, 600) } : {}),
      ...(item.kind === 'song' ? { songId: item.songId } : {}),
      ...(item.kind === 'activity' ? { activity: item.activity } : {}),
    }
  })
  return {
    version: 1,
    title: String(value.title || 'Junior Worship').slice(0, 160),
    updatedAt: Number.isSafeInteger(value.updatedAt) && value.updatedAt >= 0 ? value.updatedAt : 0,
    favorites: [...new Set((Array.isArray(value.favorites) ? value.favorites : []).filter((id) => typeof id === 'string' && id.length <= 200))].slice(0, 1000),
    items,
  }
}
