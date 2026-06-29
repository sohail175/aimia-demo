function SessionStats() {
  const stats = {
    duration: '08:42',
    talkPercentage: 64,
    nudgeCount: 4,
  }

  return (
    <div className="session-stats">
      <h2>Session Stats</h2>
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Duration</div>
          <div className="stat-value">{stats.duration}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">You talking</div>
          <div className="stat-value stat-warn">{stats.talkPercentage}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Nudges</div>
          <div className="stat-value stat-good">{stats.nudgeCount}</div>
        </div>
      </div>
    </div>
  )
}

export default SessionStats
