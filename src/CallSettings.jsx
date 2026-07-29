const purple       = '#6B5CE7'
const purpleLight  = '#F4F3FF'
const purpleBorder = '#DDD9FF'

function CallSettings({ callType, onCallTypeChange, isListening, onListeningChange }) {
  const options = ['Sales discovery', 'Requirements', 'Internal']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

      {/* Section label */}
      <div style={{
        fontSize: '11px', fontWeight: '700', color: purple,
        letterSpacing: '0.06em', textTransform: 'uppercase',
      }}>
        Call Settings
      </div>

      {/* Call type chips */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {options.map(option => (
          <button
            key={option}
            onClick={() => onCallTypeChange(option)}
            style={{
              padding: '5px 14px', borderRadius: '20px', cursor: 'pointer',
              fontSize: '12px', fontWeight: callType === option ? '700' : '500',
              border: `1.5px solid ${callType === option ? purple : purpleBorder}`,
              background: callType === option ? purple : purpleLight,
              color: callType === option ? '#ffffff' : '#6B7280',
              boxShadow: callType === option ? '0 2px 6px rgba(107,92,231,0.25)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            {option}
          </button>
        ))}
      </div>

      {/* Start / Stop button */}
      <button
        onClick={() => onListeningChange(!isListening)}
        style={{
          padding: '9px 16px', borderRadius: '8px', border: 'none',
          cursor: 'pointer', fontWeight: '700', fontSize: '13px',
          width: '100%', marginTop: '2px',
          background: isListening ? '#ef4444' : '#22c55e',
          color: 'white',
          boxShadow: isListening
            ? '0 2px 8px rgba(239,68,68,0.3)'
            : '0 2px 8px rgba(34,197,94,0.3)',
          transition: 'all 0.2s',
        }}
      >
        {isListening ? '⏹ Stop Listening' : '🎤 Start Listening'}
      </button>
    </div>
  )
}

export default CallSettings