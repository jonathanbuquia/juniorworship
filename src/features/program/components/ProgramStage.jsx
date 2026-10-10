import { useEffect, useRef, useState } from 'react'
import { PROGRAM_ACTIVITIES } from '../../../../shared/program.js'
import SongPlayer from './SongPlayer.jsx'

export default function ProgramStage({ item, song, title, navigation, songControls, onOpenActivity }) {
  const stageRef = useRef(null)
  const [error, setError] = useState('')
  const [fullscreen, setFullscreen] = useState(false)
  const activity = PROGRAM_ACTIVITIES.find((entry) => entry.id === item?.activity)

  useEffect(() => {
    const syncFullscreen = () => setFullscreen(document.fullscreenElement === stageRef.current)
    document.addEventListener('fullscreenchange', syncFullscreen)
    return () => document.removeEventListener('fullscreenchange', syncFullscreen)
  }, [])

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement === stageRef.current) await document.exitFullscreen()
      else await stageRef.current.requestFullscreen()
      setError('')
    } catch { setError('Full screen is not available in this window. Please try again.') }
  }

  async function openActivity() {
    try {
      if (document.fullscreenElement === stageRef.current) await document.exitFullscreen()
      onOpenActivity(activity)
    } catch { setError('Exit full screen before opening this activity.') }
  }

  return (
    <section className="program-stage" ref={stageRef} aria-label="Program presentation">
      <header className="program-stage-heading">
        <strong>{item?.title || title}</strong>
        <button
          type="button"
          className={`ghost-button compact-button program-fullscreen-button ${fullscreen ? 'is-exit' : ''}`}
          aria-label={fullscreen ? 'Exit full screen' : 'Full screen'}
          title={fullscreen ? 'Exit full screen (Esc)' : 'Full screen'}
          onClick={toggleFullscreen}
        >
          {fullscreen ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg> : 'Full screen'}
        </button>
      </header>
      {songControls}
      {(item?.kind === 'song' || item?.id === 'offering') && song ? (
        <SongPlayer key={`${item.id}:${song.id}`} song={song} intro={item.id === 'offering' ? { eyebrow: title, subtitle: 'Press Play to begin the offering song.' } : undefined} />
      ) : (
        <div className="program-screen">
          <div className="program-title-slide">
            <span className="eyebrow">{title}</span>
            <h2>{item?.title || 'Your program starts here'}</h2>
            {item?.kind === 'song' ? <p>This song is missing. Restore its folder, then refresh songs.</p> : <p>{songControls ? 'Choose a song above. Press Play when you are ready.' : item?.subtitle || ''}</p>}
            {item?.id === 'offering' ? <p>Offering music unavailable. Check TITHES.mp3 in the JUNIOR WORSHIP folder, then reopen Program.</p> : null}
            {item?.id === 'welcome' ? <span className="program-date">{new Intl.DateTimeFormat('en', { dateStyle: 'full' }).format(new Date())}</span> : null}
            {activity ? <button type="button" className="primary-button" onClick={openActivity}>Open {activity.title}</button> : null}
          </div>
        </div>
      )}
      {navigation}
      {error ? <p className="status-line error" role="alert">{error}</p> : null}
    </section>
  )
}
