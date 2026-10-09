import { useRef, useState } from 'react'

export default function SongPlayer({ song }) {
  const mediaRef = useRef(null)
  const [slide, setSlide] = useState(0)
  const [error, setError] = useState('')
  const [playing, setPlaying] = useState(false)
  const [failedImage, setFailedImage] = useState('')
  const image = song.slides[slide]

  async function togglePlayback() {
    const media = mediaRef.current
    if (!media) return
    if (!media.paused) media.pause()
    else {
      try { await media.play(); setError('') }
      catch { setError('Unable to play this file. Check the MP3 and refresh the library.') }
    }
  }
  const mediaProps = {
    ref: mediaRef, src: song.mediaUrl, controls: true, preload: 'metadata',
    onPlay: () => setPlaying(true), onPause: () => setPlaying(false), onEnded: () => setPlaying(false),
    onError: () => { setPlaying(false); setError('This media file is unavailable. Check the song folder and refresh the library.') },
  }
  return (
    <div className="program-song-player">
      <div className="program-screen program-lyrics-screen">
        {song.mediaType === 'video' && song.mediaUrl ? <video {...mediaProps} className="program-video" /> : image?.text ? (
          <div className="program-text-lyrics" aria-live="polite"><span>{song.title}</span><p>{image.text}</p></div>
        ) : image?.url && failedImage !== image.url ? (
          <img className="program-lyric-image" src={image.url} alt={`${song.title}, lyrics ${slide + 1}`} onError={() => setFailedImage(image.url)} />
        ) : (
          <div className="program-title-slide"><span className="eyebrow">Praise &amp; Worship</span><h2>{song.title}</h2><p>{image && failedImage === image.url ? 'This lyric picture is unavailable.' : 'Lyrics not added yet. Audio is ready to play.'}</p></div>
        )}
      </div>
      <div className="program-media-controls">
        {song.mediaUrl ? <button type="button" className="primary-button compact-button" onClick={togglePlayback}>{playing ? 'Pause' : 'Play'}</button> : <span className="panel-note">Add an MP3 to play this song.</span>}
        {song.mediaType !== 'video' && song.mediaUrl ? <audio {...mediaProps} aria-label={`Audio for ${song.title}`} /> : null}
        {song.slides.length > 0 && song.mediaType !== 'video' ? (
          <div className="program-slide-controls">
            <button type="button" className="ghost-button compact-button" aria-label="Previous lyric" disabled={slide === 0} onClick={() => setSlide(slide - 1)}>Previous lyric</button>
            <span aria-live="polite">{slide + 1} / {song.slides.length}</span>
            <button type="button" className="ghost-button compact-button" aria-label="Next lyric" disabled={slide >= song.slides.length - 1} onClick={() => setSlide(slide + 1)}>Next lyric</button>
          </div>
        ) : null}
      </div>
      {error ? <p className="status-line error" role="alert">{error}</p> : null}
    </div>
  )
}
