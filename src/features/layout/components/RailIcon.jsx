export default function RailIcon({ type }) {
  if (type === 'brand') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M4 12c3.4-4 8.1-6 13-6v4l3-2.5L17 5v4c-4.7 0-8.2 1.2-11 3 2.8 1.8 6.3 3 11 3v4l3-2.5L17 14v4c-4.9 0-9.6-2-13-6Z" />
        <circle cx="9.25" cy="10" fill="currentColor" r="1" stroke="none" />
      </svg>
    )
  }

  if (type === 'profile') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5.5 19a7.5 7.5 0 0 1 13 0" />
      </svg>
    )
  }

  if (type === 'shop') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M7 9h10l-1 10H8L7 9Z" />
        <path d="M9.5 9a2.5 2.5 0 0 1 5 0" />
      </svg>
    )
  }

  if (type === 'memory') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M6.5 5.5h8a2 2 0 0 1 2 2v11l-4-2-4 2v-11a2 2 0 0 0-2-2Z" />
        <path d="M6.5 5.5h8" />
      </svg>
    )
  }

  if (type === 'quiz') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M9.25 9a2.75 2.75 0 1 1 4.4 2.2c-.96.72-1.65 1.3-1.65 2.3" />
        <circle cx="12" cy="17.5" fill="currentColor" r="0.8" stroke="none" />
        <path d="M5.5 5.5h13v13h-13Z" />
      </svg>
    )
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 3.5 18.5 6v5.5c0 4.1-2.5 7.1-6.5 9-4-1.9-6.5-4.9-6.5-9V6L12 3.5Z" />
      <path d="M12 9v5" />
      <path d="M9.5 11.5H12" />
    </svg>
  )
}
