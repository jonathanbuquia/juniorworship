import { useEffect, useState } from 'react'
import { useProgram } from '../hooks/useProgram.js'
import ProgramStage from './ProgramStage.jsx'
import ProgramSongSelector from './ProgramSongSelector.jsx'
import '../program.css'

function readSelectedId() {
  try { return JSON.parse(sessionStorage.getItem('program-view:v1'))?.selectedId || 'welcome' }
  catch { return 'welcome' }
}

export default function ProgramPage({ onOpenActivity }) {
  const { program, update, library, libraryError, refreshLibrary, refreshing, saved, error, retrySave } = useProgram()
  const [selectedId, setSelectedId] = useState(readSelectedId)
  const selectedIndex = Math.max(0, program?.items.findIndex((item) => item.id === selectedId) ?? 0)
  const selected = program?.items[selectedIndex]
  const song = library.songs.find((entry) => entry.id === selected?.songId)
  const isSongSection = selected?.kind === 'song' || ['song-1', 'song-2'].includes(selected?.id)

  function selectSong(songId) {
    if (!library.songs.some((entry) => entry.id === songId)) return
    update((current) => ({ items: current.items.map((item) => item.id === selected.id ? { ...item, kind: 'song', songId } : item) }))
  }

  useEffect(() => {
    try { sessionStorage.setItem('program-view:v1', JSON.stringify({ selectedId })) }
    catch { /* Navigation still works when session storage is unavailable. */ }
  }, [selectedId])

  if (!program) {
    return <section className="panel program-page-shell"><h2>Program</h2><p role={error ? 'alert' : 'status'}>{error || 'Loading your program...'}</p></section>
  }

  return (
    <section className="panel program-page-shell program-workspace" aria-label="Junior Worship program">
      {error ? <div className="status-line error" role="alert">{error} <button type="button" className="ghost-button compact-button" onClick={retrySave}>Retry save</button></div> : null}
      <ProgramStage
        item={selected}
        song={song}
        title={program.title}
        onOpenActivity={onOpenActivity}
        songControls={isSongSection ? <ProgramSongSelector key={selected.id} songs={library.songs} selectedSongId={selected.songId} onSelect={selectSong} onRefresh={refreshLibrary} refreshing={refreshing} saved={saved} error={libraryError} /> : null}
        navigation={
          <nav className="program-navigation" aria-label="Program navigation">
            <button type="button" className="ghost-button compact-button" disabled={selectedIndex === 0 || !selected} onClick={() => setSelectedId(program.items[selectedIndex - 1].id)}>Back</button>
            <select aria-label="Jump to program part" value={selected?.id || ''} onChange={(event) => setSelectedId(event.target.value)}>
              <option value="" disabled>No program pages</option>
              {program.items.map((item, index) => <option key={item.id} value={item.id}>{index + 1}. {item.title}</option>)}
            </select>
            <span>{selected ? selectedIndex + 1 : 0} / {program.items.length}</span>
            <button type="button" className="primary-button compact-button" disabled={!selected || selectedIndex >= program.items.length - 1} onClick={() => setSelectedId(program.items[selectedIndex + 1].id)}>Next</button>
          </nav>
        }
      />
    </section>
  )
}
