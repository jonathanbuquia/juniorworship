export default function ProfilesPage({ onSelectPlayer, players = [], selectedPlayerId = '' }) {
  return (
    <section className="panel profiles-page-shell">
      <div className="profiles-page-heading">
        <div>
          <div className="eyebrow">Profiles</div>
          <h2>Choose a Player</h2>
        </div>
        <strong>{players.length} players</strong>
      </div>

      {players.length ? (
        <div className="profiles-card-grid">
          {players.map((player) => (
            <button
              className={`profile-card ${selectedPlayerId === player.id ? 'active' : ''}`}
              key={player.id}
              onClick={() => onSelectPlayer(player.id)}
              type="button"
            >
              <span className="profile-card-copy">
                <strong>{player.display_name}</strong>
                <small>{player.gold ?? 0} gold coins</small>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="profiles-empty-card">
          <h3>No player profiles yet.</h3>
          <p className="panel-note">Use Players to create the first profile.</p>
        </div>
      )}
    </section>
  )
}
