function TopBar() {
  return (
    <div className="top-bar">
      <div className="top-bar-left">
        <div className="logo-circle">AI</div>
        <div>
          <div className="app-name">AIMIA</div>
          <div className="app-sub">AI Meeting Intelligence Assistant</div>
        </div>
      </div>
      <div className="top-bar-right">
        <span className="teams-badge">Connected to Teams</span>
        <span className="live-badge">● Live</span>
      </div>
    </div>
  )
}

export default TopBar