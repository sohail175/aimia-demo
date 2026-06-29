import { useState, useEffect, useRef } from 'react'
import TranscriptPanel from './TranscriptPanel'
import NudgeCards from './NudgeCards'
import CallSettings from './CallSettings'
import SessionStats from './SessionStats'
import TopBar from './TopBar'

const BACKEND = 'http://127.0.0.1:8000'

function AimiaLayout() {
  const [callType, setCallType] = useState('Sales discovery')

  const [transcript, setTranscript] = useState([
    { speaker: 'You', text: 'Thanks for joining today. I wanted to understand a bit more about how your team currently handles cultural diversity training.' },
    { speaker: 'Client', text: 'Honestly, we do an induction once a year but the feedback has been pretty mixed. People find it a bit generic.' },
    { speaker: 'You', text: 'What does your team structure look like — how many people are we talking about?' },
    { speaker: 'Client', text: "We've got about 40 people across two offices, Melbourne and Sydney." },
  ])

  const [nudges, setNudges] = useState([
    { nudge_id: 'nudge_001', nudge_type: 'warn', nudge_message: "You're doing most of the talking — let them lead.", helpful: null },
    { nudge_id: 'nudge_002', nudge_type: 'ask', nudge_message: "Budget hasn't come up yet. Good time to explore it.", helpful: null },
    { nudge_id: 'nudge_003', nudge_type: 'flag', nudge_message: "They said feedback was mixed — dig into this.", helpful: null },
  ])

  const [callStatus, setCallStatus] = useState('live')
  const [nudgeStatus, setNudgeStatus] = useState('idle')
  const [summary, setSummary] = useState('')
  const nudgeIntervalRef = useRef(null)

  const generateNudges = async () => {
    if (transcript.length === 0) return
    setNudgeStatus('generating')
    try {
      const res = await fetch(`${BACKEND}/generate-nudges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, call_type: callType }),
      })
      const data = await res.json()
      if (data.nudges) {
        setNudges(data.nudges.map(n => ({ ...n, helpful: null })))
        setNudgeStatus('done')
      }
    } catch (err) {
      console.error('Nudge generation failed:', err)
      setNudgeStatus('error')
    }
  }

  useEffect(() => {
    generateNudges()
    nudgeIntervalRef.current = setInterval(generateNudges, 30000)
    return () => clearInterval(nudgeIntervalRef.current)
  }, [])

  const saveCall = async () => {
    setCallStatus('saving')
    clearInterval(nudgeIntervalRef.current)

    // Step 1 — Sonnet generates summary
    let callSummary = 'Summary unavailable'
    try {
      const sumRes = await fetch(`${BACKEND}/generate-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, call_type: callType, nudges }),
      })
      const sumData = await sumRes.json()
      if (sumData.summary) {
        callSummary = sumData.summary
        setSummary(callSummary)
      }
    } catch (err) {
      console.error('Summary failed:', err)
    }

    // Step 2 — Save call with real summary
    const callData = {
      call_id: `call_${Date.now()}`,
      call_type: callType,
      timestamp: new Date().toISOString(),
      transcript,
      nudges: nudges.map(n => ({
        nudge_id: String(n.nudge_id),
        nudge_type: n.nudge_type,
        nudge_message: n.nudge_message,
        helpful: n.helpful ?? false,
      })),
      summary: callSummary,
    }

    try {
      const res = await fetch(`${BACKEND}/save-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(callData),
      })
      if (res.ok) setCallStatus('saved')
      else setCallStatus('error')
    } catch (err) {
      console.error('Save failed:', err)
      setCallStatus('error')
    }
  }

  const handleFeedback = (nudge_id, helpful) => {
    setNudges(prev =>
      prev.map(n => n.nudge_id === nudge_id ? { ...n, helpful } : n)
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%' }}>
      <TopBar />
      <div style={{ display: 'flex', flex: 1 }}>

        {/* LEFT 60% — Teams placeholder */}
        <div style={{
          width: '60%', backgroundColor: '#1a1a1a', color: '#888',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', fontSize: '20px', gap: '12px',
        }}>
          Microsoft Teams call appears here

          {/* Active call type indicator */}
          <div style={{ fontSize: '13px', color: '#3b82f6' }}>
            📋 Call type: <strong>{callType}</strong>
          </div>

          <button
            onClick={saveCall}
            disabled={callStatus === 'saving' || callStatus === 'saved'}
            style={{
              padding: '12px 32px',
              backgroundColor:
                callStatus === 'saved'  ? '#22c55e' :
                callStatus === 'error'  ? '#ef4444' :
                callStatus === 'saving' ? '#888'    : '#e11d48',
              color: 'white', border: 'none', borderRadius: '8px',
              fontSize: '16px',
              cursor: callStatus === 'saving' ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
            }}
          >
            {callStatus === 'live'   && '⏹ End Call & Save'}
            {callStatus === 'saving' && '💾 Saving + Generating Summary...'}
            {callStatus === 'saved'  && '✅ Call Saved!'}
            {callStatus === 'error'  && '❌ Save Failed — Retry'}
          </button>

          {/* Nudge status */}
          <div style={{ fontSize: '12px', color: '#555' }}>
            {nudgeStatus === 'generating' && '🤖 Haiku generating nudges...'}
            {nudgeStatus === 'done'       && '✅ Nudges updated'}
            {nudgeStatus === 'error'      && '⚠️ Nudge error'}
          </div>

          {/* Sonnet summary after call ends */}
          {summary && (
            <div style={{
              margin: '16px', padding: '16px',
              backgroundColor: '#1e293b',
              borderRadius: '8px',
              color: '#94a3b8',
              fontSize: '13px',
              maxWidth: '400px',
              textAlign: 'left',
              borderLeft: '3px solid #3b82f6',
              lineHeight: '1.6',
            }}>
              <div style={{ color: '#3b82f6', fontWeight: 'bold', marginBottom: '8px' }}>
                📝 AI Call Summary (Sonnet)
              </div>
              {summary}
            </div>
          )}
        </div>

        {/* RIGHT 40% — AIMIA panel */}
        <div style={{ width: '40%', display: 'flex' }}>
          <div style={{ width: '50%', borderRight: '1px solid #ddd', padding: '16px', overflowY: 'auto' }}>
            <CallSettings
              callType={callType}
              onCallTypeChange={setCallType}
            />
            <TranscriptPanel transcript={transcript} />
            <SessionStats />
          </div>
          <div style={{ width: '50%', padding: '16px', overflowY: 'auto' }}>
            <NudgeCards nudges={nudges} onFeedback={handleFeedback} />
          </div>
        </div>

      </div>
    </div>
  )
}

export default AimiaLayout