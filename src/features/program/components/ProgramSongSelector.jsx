import { useDeferredValue, useState } from 'react'

export default function ProgramSongSelector({ songs, selectedSongId, onSelect, onRefresh, refreshing, error, saved }) {
  const [search, setSearch] = useState('')
  const query = useDeferredValue(search).trim().toLowerCase()
  const visible = songs.filter((song) => song.title.toLowerCase().includes(query))
  const selected = songs.find((song) => song.id === selectedSongId)

  return (
    <div className="program-song-picker" aria-label="Song selection">
      <div className="program-song-picker-fields">
        <input type="search" aria-label="Search songs" placeholder="Search songs..." value={search} onChange={(event) => setSearch(event.target.value)} />
        <select aria-label="Choose a song" value={selectedSongId || ''} onChange={(event) => onSelect(event.target.value)}>
          <option value="" disabled>Choose a song</option>
          {selectedSongId && !visible.some((song) => song.id === selectedSongId) ? <option value={selectedSongId}>{selected?.title || 'Previously selected song (unavailable)'}</option> : null}
          {visible.map((song) => <option key={song.id} value={song.id}>{song.title} - {song.slides.length ? 'Lyrics ready' : 'Lyrics pending'}</option>)}
        </select>
        <button type="button" className="ghost-button compact-button" disabled={refreshing} onClick={onRefresh}>{refreshing ? 'Refreshing...' : 'Refresh songs'}</button>
      </div>
      <span className="program-song-picker-note" role="status">{error || (selectedSongId && !saved ? 'Saving song selection...' : !visible.length ? 'No matching songs.' : 'Select a song, then press Play. Lyrics change with Previous / Next lyric.')}</span>
    </div>
  )
}
