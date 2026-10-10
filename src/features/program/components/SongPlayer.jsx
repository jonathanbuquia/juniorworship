import { useRef, useState } from 'react'

export default function SongPlayer({ song, intro }) {
  const mediaRef = useRef(null)
  const [slide, setSlide] = useState(0)
  const [error, setError] = useState('')
  const [playing, setPlaying] = useState(false)
  const [failedImage, setFailedImage] = useState('')
  const currentSlide = Math.min(slide, Math.max(0, song.slides.length - 1))
  const image = song.slides[currentSlide]
  // Fit explicit pages without splitting the author's chosen page boundaries.
  const lines = image?.text?.split('\n') || []
  const textStyle = {
    '--lyric-height-fit': `${65 / Math.max(1, lines.length) / 1.4}cqh`,
    '--lyric-width-fit': `${155 / Math.max(1, ...lines.map((line) => line.length))}cqw`,
  }

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
          <div className="program-text-lyrics" style={textStyle} aria-live="polite"><span>{song.title}</span><p>{image.text}</p></div>
        ) : image?.url && failedImage !== image.url ? (
          <img className="program-lyric-image" src={image.url} alt={`${song.title}, lyrics ${currentSlide + 1}`} onError={() => setFailedImage(image.url)} />
        ) : (
          <div className="program-title-slide"><span className="eyebrow">{intro?.eyebrow || 'Praise & Worship'}</span><h2>{song.title}</h2><p>{image && failedImage === image.url ? 'This lyric picture is unavailable.' : intro?.subtitle || 'Lyrics not added yet. Audio is ready to play.'}</p></div>
        )}
      </div>
      <div className="program-media-controls">
        {song.mediaUrl ? <button type="button" className="primary-button compact-button" onClick={togglePlayback}>{playing ? 'Pause' : 'Play'}</button> : <span className="panel-note">Add an MP3 to play this song.</span>}
        {song.mediaType !== 'video' && song.mediaUrl ? <audio {...mediaProps} aria-label={`Audio for ${song.title}`} /> : null}
        {song.slides.length > 0 && song.mediaType !== 'video' ? (
          <div className="program-slide-controls">
            {currentSlide > 0 ? <button type="button" className="ghost-button compact-button program-lyric-arrow" aria-label="Previous lyric" title="Previous lyric" onClick={() => setSlide(currentSlide - 1)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6" /></svg></button> : null}
            <span aria-live="polite">{currentSlide + 1} / {song.slides.length}</span>
            {currentSlide < song.slides.length - 1 ? <button type="button" className="ghost-button compact-button program-lyric-arrow" aria-label="Next lyric" title="Next lyric" onClick={() => setSlide(currentSlide + 1)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 6 6 6-6 6" /></svg></button> : null}
          </div>
        ) : null}
      </div>
      {error ? <p className="status-line error" role="alert">{error}</p> : null}
    </div>
  )
}
