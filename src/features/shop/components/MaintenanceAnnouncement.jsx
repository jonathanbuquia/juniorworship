import '../maintenanceAnnouncement.css'

const upcomingChanges = [
  {
    number: '01',
    title: 'Player Levels & EXP',
    description: 'Earn EXP from attendance, memory verses, Books of the Bible, quizzes, purchases, and upgrades.',
  },
  {
    number: '02',
    title: 'Special Creature Upgrades',
    description: 'Upgrade Blue Betta, Hermit Crab, and Moon Jelly from Level 1 to 10 for stronger effects.',
  },
  {
    number: '03',
    title: 'Permanent Progress',
    description: 'Player EXP only goes up. Your player level never goes down.',
  },
]

export default function MaintenanceAnnouncement() {
  return (
    <section className="panel maintenance-announcement" aria-labelledby="maintenance-title">
      <div className="maintenance-copy">
        <div className="eyebrow">October 2026 Announcement</div>
        <h1 id="maintenance-title">Under<br />maintenance</h1>
        <p className="maintenance-lede">No new special creature this October.</p>
        <p className="maintenance-intro">We&apos;re preparing new ways to grow your aquarium.</p>

        <div className="maintenance-upcoming">
          <h2>Coming Soon</h2>
          <ul>
            {upcomingChanges.map((change) => (
              <li key={change.number}>
                <span className="maintenance-feature-number" aria-hidden="true">{change.number}</span>
                <div><h3>{change.title}</h3><p>{change.description}</p></div>
              </li>
            ))}
          </ul>
        </div>
        <p className="maintenance-note">These features are not available yet. Thank you for your patience!</p>
      </div>

      <div className="maintenance-visual" aria-hidden="true">
        <div className="announcement-ocean-decor">
          <span className="announcement-bubble bubble-one" />
          <span className="announcement-bubble bubble-two" />
          <span className="announcement-bubble bubble-three" />
          <span className="announcement-coral coral-left" />
          <span className="announcement-coral coral-right" />
          <span className="announcement-seaweed seaweed-left" />
          <span className="announcement-seaweed seaweed-right" />
          <span className="announcement-rock rock-left" />
          <span className="announcement-rock rock-right" />
        </div>
        <div className="maintenance-sign">
          <span className="maintenance-sign-label">Aquarium Care</span>
          <svg viewBox="0 0 100 100" fill="none">
            <path d="M67 15a23 23 0 0 0-27 29L17 67a11 11 0 0 0 16 16l23-23a23 23 0 0 0 29-27L72 46 55 29Z" />
            <circle cx="27" cy="73" r="3" />
          </svg>
          <strong>A little care.<br />More ways to grow.</strong>
          <span className="maintenance-sign-footer">New features in preparation</span>
        </div>
      </div>
    </section>
  )
}
