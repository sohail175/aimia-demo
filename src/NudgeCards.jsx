const TYPE_CONFIG = {
  warn:  { bg: '#fffbeb', border: '#fcd34d', labelColor: '#92400e', label: 'WARN'  },
  ask:   { bg: '#eff6ff', border: '#93c5fd', labelColor: '#1e40af', label: 'ASK'   },
  flag:  { bg: '#fdf2f8', border: '#f0abfc', labelColor: '#86198f', label: 'FLAG'  },
  nudge: { bg: '#F4F3FF', border: '#a78bfa', labelColor: '#6B5CE7', label: 'NUDGE' },
}

// ── Atlas tokens ─────────────────────────────────────────────────────────────
const purple      = '#6B5CE7'
const purpleLight = '#F4F3FF'
const purpleBorder = '#DDD9FF'
const purpleMid   = '#EEF2FF'

export default function NudgeCards({ currentNudge, isGenerating, isListening, nudgeCount, onFeedback }) {
  const config = currentNudge ? (TYPE_CONFIG[currentNudge.nudge_type] || TYPE_CONFIG.nudge) : null

  const headerStyle = {
    fontSize: '13px', fontWeight: 700, color: purple,
    letterSpacing: '0.06em', textTransform: 'uppercase',
    marginBottom: '16px', paddingBottom: '10px',
    borderBottom: `1.5px solid ${purpleBorder}`,
  }

  const cardBase = { borderRadius: '12px', padding: '20px', marginBottom: '12px' }

  if (!isListening && !currentNudge && !isGenerating) {
    return (
      <div>
        <div style={headerStyle}>AIMIA Assistant</div>
        <div style={{
          ...cardBase,
          background: purpleLight,
          border: `1.5px dashed ${purpleBorder}`,
          textAlign: 'center', padding: '32px 20px',
        }}>
          <div style={{ fontSize: '28px', marginBottom: '10px' }}>🎙</div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#1A1A2E', marginBottom: '6px' }}>Ready to assist</div>
          <div style={{ fontSize: '12px', color: '#9ca3af', lineHeight: 1.6 }}>
            Add pre-call context above, then hit<br />
            <strong style={{ color: purple }}>Start Listening</strong> to begin.<br />
            Your first nudge will appear automatically.
          </div>
        </div>
      </div>
    )
  }

  if (isListening && !currentNudge && !isGenerating) {
    return (
      <div>
        <div style={headerStyle}>AIMIA Assistant</div>
        <div style={{
          ...cardBase,
          background: purpleLight,
          border: `1.5px dashed ${purpleBorder}`,
          textAlign: 'center', padding: '32px 20px',
        }}>
          <div style={{ fontSize: '28px', marginBottom: '10px' }}>👂</div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#1A1A2E', marginBottom: '6px' }}>Listening…</div>
          <div style={{ fontSize: '12px', color: '#9ca3af', lineHeight: 1.6 }}>
            First nudge will appear once<br />you've spoken a few lines.
          </div>
        </div>
      </div>
    )
  }

  if (isGenerating) {
    return (
      <div>
        <div style={headerStyle}>AIMIA Assistant</div>
        <div style={{
          ...cardBase,
          background: purpleLight,
          border: `1.5px solid ${purpleBorder}`,
          textAlign: 'center', padding: '32px 20px',
        }}>
          <div style={{ fontSize: '28px', marginBottom: '10px' }}>🤖</div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#1A1A2E', marginBottom: '6px' }}>Analysing conversation…</div>
          <div style={{ fontSize: '12px', color: '#9ca3af' }}>Generating your next nudge</div>
          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '6px' }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: purple,
                animation: `nudgePulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              }} />
            ))}
          </div>
        </div>
        {nudgeCount > 0 && (
          <div style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'center', marginTop: '4px' }}>
            {nudgeCount} nudge{nudgeCount !== 1 ? 's' : ''} shown this call
          </div>
        )}
        <style>{`@keyframes nudgePulse { 0%,100%{opacity:0.3;transform:scale(0.8)} 50%{opacity:1;transform:scale(1)} }`}</style>
      </div>
    )
  }

  return (
    <div>
      <div style={headerStyle}>AIMIA Assistant</div>
      <div style={{ ...cardBase, background: config.bg, border: `1.5px solid ${config.border}` }}>
        <div style={{
          fontSize: '10px', fontWeight: 700, color: config.labelColor,
          letterSpacing: '0.1em', marginBottom: '10px',
        }}>
          {config.label}
        </div>
        <p style={{ fontSize: '14px', color: '#1A1A2E', lineHeight: 1.65, margin: '0 0 20px' }}>
          {currentNudge.nudge_message}
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => onFeedback(true)}
            style={{
              flex: 1, padding: '10px 12px', borderRadius: '8px',
              border: '1.5px solid #86efac', background: '#f0fdf4',
              color: '#166534', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: '6px', transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#dcfce7'}
            onMouseLeave={e => e.currentTarget.style.background = '#f0fdf4'}
          >
            👍 Got it
          </button>
          <button
            onClick={() => onFeedback(false)}
            style={{
              flex: 1, padding: '10px 12px', borderRadius: '8px',
              border: '1.5px solid #fecaca', background: '#fef2f2',
              color: '#991b1b', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: '6px', transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
            onMouseLeave={e => e.currentTarget.style.background = '#fef2f2'}
          >
            👎 Next nudge
          </button>
        </div>
      </div>
      <div style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'center', marginTop: '4px', lineHeight: 1.5 }}>
        React to this nudge to see the next one
        {nudgeCount > 0 && (
          <span style={{ display: 'block', marginTop: '2px' }}>
            {nudgeCount} nudge{nudgeCount !== 1 ? 's' : ''} shown this call
          </span>
        )}
      </div>
      <style>{`@keyframes nudgePulse { 0%,100%{opacity:0.3;transform:scale(0.8)} 50%{opacity:1;transform:scale(1)} }`}</style>
    </div>
  )
}