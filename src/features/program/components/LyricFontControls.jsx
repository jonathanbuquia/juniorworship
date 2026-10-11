export default function LyricFontControls({ size, canShrink, canGrow, shrink, grow, reset }) {
  return (
    <div className="program-font-controls" role="group" aria-label="Lyric font size">
      <button type="button" className="ghost-button compact-button" aria-label="Smaller lyrics" title="Smaller lyrics" disabled={!canShrink} onClick={shrink}>A-</button>
      <button type="button" className="ghost-button compact-button" aria-label="Reset lyric size" title="Reset lyric size to 100%" onClick={reset}><span aria-live="polite">{size}%</span></button>
      <button type="button" className="ghost-button compact-button" aria-label="Bigger lyrics" title="Bigger lyrics" disabled={!canGrow} onClick={grow}>A+</button>
    </div>
  )
}
