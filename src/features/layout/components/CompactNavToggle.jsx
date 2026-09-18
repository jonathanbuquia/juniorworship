export default function CompactNavToggle({ onClick, open }) {
  return (
    <button
      aria-label={open ? 'Close menu' : 'Open menu'}
      className="compact-nav-toggle"
      onClick={onClick}
      type="button"
    >
      <span />
      <span />
      <span />
    </button>
  )
}
