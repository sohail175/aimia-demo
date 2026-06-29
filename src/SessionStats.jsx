import { useState, useEffect } from 'react'

function SessionStats({ transcript, nudges, isListening }) {
  const [duration, setDuration] = useState(0)
  const [secondsElapsed, setSecondsElapsed] = useState(0)

  // Real duration timer
  useEffect(() => {
    let timer
    if (isListening) {
      timer = setInterval(() => {
        setSecondsElapsed(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [isListening])

  // Format seconds to mm:ss
  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  // Real talk percentage — based on transcript lines spoken by "You"
  const yourLines = transcript.filter(l => l.speaker === 'You').length
  const totalLines = transcript.length
  const talkPercentage = totalLines === 0 ? 0 : Math.round((yourLines / totalLines) * 100)

  // Real nudge count
  const nudgeCount = nudges.length

  return (
    <div className="session-stats">
      <h2>Session Stats</h2>
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Duration</div>
          <div className="stat-value">{formatDuration(secondsElapsed)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">You talking</div>
          <div className="stat-value stat-warn">{talkPercentage}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Nudges</div>
          <div className="stat-value stat-good">{nudgeCount}</div>
        </div>
      </div>
    </div>
  )
}

export default SessionStats