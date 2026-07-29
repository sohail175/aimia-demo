function TopBar({ isListening, currentView, onViewChange }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 20px', height: '54px',
      background: '#ffffff',
      borderBottom: '2px solid #6B5CE7',
      boxShadow: '0 1px 6px rgba(107,92,231,0.08)',
      position: 'sticky', top: 0, zIndex: 100,
    }}>

      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <img
          src="/atlas-logo.jpg"
          alt="Cultural Infusion Atlas"
          style={{ width: '36px', height: '36px', objectFit: 'contain' }}
        />
        <div>
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#6B5CE7', letterSpacing: '-0.3px', lineHeight: 1 }}>
            AIMIA
          </div>
          <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '2px' }}>
            AI Meeting Intelligence Assistant
          </div>
        </div>
      </div>

      {/* Nav tabs */}
      <div style={{ display: 'flex', gap: '4px', backgroundColor: '#F4F3FF', borderRadius: '9px', padding: '3px' }}>
        <button onClick={() => onViewChange('live')} style={{
          padding: '5px 18px', borderRadius: '7px', border: 'none', cursor: 'pointer',
          fontSize: '12px', fontWeight: currentView === 'live' ? '600' : '500',
          background: currentView === 'live' ? '#6B5CE7' : 'transparent',
          color: currentView === 'live' ? '#ffffff' : '#6B7280',
          boxShadow: currentView === 'live' ? '0 2px 6px rgba(107,92,231,0.3)' : 'none',
          transition: 'all 0.15s',
        }}>🎙 Live Call</button>
        <button onClick={() => onViewChange('history')} style={{
          padding: '5px 18px', borderRadius: '7px', border: 'none', cursor: 'pointer',
          fontSize: '12px', fontWeight: currentView === 'history' ? '600' : '500',
          background: currentView === 'history' ? '#6B5CE7' : 'transparent',
          color: currentView === 'history' ? '#ffffff' : '#6B7280',
          boxShadow: currentView === 'history' ? '0 2px 6px rgba(107,92,231,0.3)' : 'none',
          transition: 'all 0.15s',
        }}>📋 Call History</button>
      </div>

      {/* Status pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{
          backgroundColor: isListening ? '#dcfce7' : '#F4F3FF',
          color: isListening ? '#16a34a' : '#6B5CE7',
          border: `1px solid ${isListening ? '#86efac' : '#DDD9FF'}`,
          padding: '4px 12px', borderRadius: '20px', fontSize: '12px',
          fontWeight: '500', transition: 'all 0.3s ease',
        }}>{isListening ? '🔗 Connected' : '○ Not Connected'}</span>
        <span style={{
          backgroundColor: isListening ? '#dcfce7' : '#FEF9C3',
          color: isListening ? '#16a34a' : '#854d0e',
          border: `1px solid ${isListening ? '#86efac' : '#FDE047'}`,
          padding: '4px 12px', borderRadius: '20px', fontSize: '12px',
          fontWeight: '600', display: 'flex', alignItems: 'center',
          gap: '6px', transition: 'all 0.3s ease',
        }}>
          <span style={{
            width: '8px', height: '8px', borderRadius: '50%',
            backgroundColor: isListening ? '#16a34a' : '#ca8a04',
            display: 'inline-block',
            animation: isListening ? 'pulse 1.5s infinite' : 'none',
          }} />
          {isListening ? 'Live' : 'Paused'}
        </span>
      </div>
    </div>
  )
}

export default TopBar