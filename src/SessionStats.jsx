import { useState, useEffect } from 'react'

const purple       = '#6B5CE7'
const purpleLight  = '#F4F3FF'
const purpleBorder = '#DDD9FF'
const dark         = '#1A1A2E'

function SessionStats({ transcript, nudges, isListening }) {
  const [secondsElapsed, setSecondsElapsed] = useState(0)

  useEffect(() => {
    if (!isListening) return
    setSecondsElapsed(0)
    const timer = setInterval(() => setSecondsElapsed(prev => prev + 1), 1000)
    return () => clearInterval(timer)
  }, [isListening])

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const yourLines      = transcript.filter(l => l.speaker !== 'Customer').length
  const totalLines     = transcript.length
  const talkPercentage = totalLines === 0 ? 0 : Math.round((yourLines / totalLines) * 100)
  const nudgeCount     = nudges.length

  const talkColor =
    talkPercentage > 70 ? '#ef4444' :
    talkPercentage > 50 ? '#f59e0b' : '#22c55e'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ fontSize: '11px', fontWeight: '700', color: purple, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        Session Stats
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <div style={{ flex: 1, padding: '10px 12px', borderRadius: '10px', background: purpleLight, border: `1px solid ${purpleBorder}`, textAlign: 'center' }}>
          <div style={{ fontSize: '10px', fontWeight: '600', color: '#9CA3AF', marginBottom: '4px', letterSpacing: '0.04em' }}>DURATION</div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: dark, fontVariantNumeric: 'tabular-nums' }}>{formatDuration(secondsElapsed)}</div>
        </div>
        <div style={{ flex: 1, padding: '10px 12px', borderRadius: '10px', background: purpleLight, border: `1px solid ${purpleBorder}`, textAlign: 'center' }}>
          <div style={{ fontSize: '10px', fontWeight: '600', color: '#9CA3AF', marginBottom: '4px', letterSpacing: '0.04em' }}>YOU TALKING</div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: talkColor, fontVariantNumeric: 'tabular-nums' }}>{talkPercentage}%</div>
        </div>
        <div style={{ flex: 1, padding: '10px 12px', borderRadius: '10px', background: purpleLight, border: `1px solid ${purpleBorder}`, textAlign: 'center' }}>
          <div style={{ fontSize: '10px', fontWeight: '600', color: '#9CA3AF', marginBottom: '4px', letterSpacing: '0.04em' }}>NUDGES</div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: purple, fontVariantNumeric: 'tabular-nums' }}>{nudgeCount}</div>
        </div>
      </div>
    </div>
  )
}

export default SessionStats