function TopBar({ isListening, currentView, onViewChange }) {
  return (
    <div className="top-bar">
      <div className="top-bar-left">
        <div className="logo-circle">AI</div>
        <div>
          <div className="app-name">AIMIA</div>
          <div className="app-sub">AI Meeting Intelligence Assistant</div>
        </div>
      </div>

      {/* Navigation tabs */}
      <div style={{ display: 'flex', gap: '4px', backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '3px' }}>
        <button
          onClick={() => onViewChange('live')}
          style={{
            padding: '5px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px',
            fontWeight: currentView === 'live' ? '600' : '400',
            background: currentView === 'live' ? 'white' : 'transparent',
            color: currentView === 'live' ? '#111827' : '#6b7280',
            boxShadow: currentView === 'live' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            transition: 'all 0.15s',
          }}>
          🎙 Live Call
        </button>
        <button
          onClick={() => onViewChange('history')}
          style={{
            padding: '5px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px',
            fontWeight: currentView === 'history' ? '600' : '400',
            background: currentView === 'history' ? 'white' : 'transparent',
            color: currentView === 'history' ? '#111827' : '#6b7280',
            boxShadow: currentView === 'history' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            transition: 'all 0.15s',
          }}>
          📋 Call History
        </button>
      </div>

      <div className="top-bar-right">
        <span className="teams-badge" style={{
          backgroundColor: isListening ? '#dcfce7' : '#f1f5f9',
          color: isListening ? '#16a34a' : '#64748b',
          border: `1px solid ${isListening ? '#16a34a' : '#cbd5e1'}`,
          padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500', transition: 'all 0.3s ease',
        }}>
          {isListening ? '🔗 Connected to Teams' : '○ Not Connected'}
        </span>
        <span style={{
          backgroundColor: isListening ? '#dcfce7' : '#fef9c3',
          color: isListening ? '#16a34a' : '#854d0e',
          border: `1px solid ${isListening ? '#16a34a' : '#ca8a04'}`,
          padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
          display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.3s ease',
        }}>
          <span style={{
            width: '8px', height: '8px', borderRadius: '50%',
            backgroundColor: isListening ? '#16a34a' : '#ca8a04', display: 'inline-block',
            animation: isListening ? 'pulse 1.5s infinite' : 'none',
          }} />
          {isListening ? 'Live' : 'Paused'}
        </span>
      </div>
    </div>
  )
}

export default TopBar