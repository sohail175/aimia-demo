import { useEffect, useRef, useState } from 'react'

const BACKEND    = 'https://aimia-demo.onrender.com'
const WS_BACKEND = 'wss://aimia-demo.onrender.com'

const SPEAKER_COLORS = { You: '#6B5CE7', Customer: '#d97706' }
const getColor = (name) => SPEAKER_COLORS[name] ?? '#0ea5e9'

const mapSpeaker = (speaker, agentName) => {
  if (!speaker) return agentName || 'You'
  const s = speaker.toLowerCase()
  if (s.includes('0') || s === 'agent' || s === 'host') return agentName || 'You'
  return 'Customer'
}

export default function TranscriptPanel({
  transcript, setTranscript, isListening, setIsListening, agentName, meetingUrl,
}) {
  const [status, setStatus] = useState('')
  const [botId, setBotId]   = useState(null)

  const sessionIdRef   = useRef(null)
  const wsRef          = useRef(null)
  const recognitionRef = useRef(null)
  const isActiveRef    = useRef(false)
  const bottomRef      = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

  useEffect(() => {
    if (isListening) startAll()
    else             stopAll()
    return () => stopAll()
  }, [isListening])

  const addLine = (speaker, text) => {
    setTranscript(prev => {
      const last = prev[prev.length - 1]
      if (last?.speaker === speaker && last?.text === text) return prev
      return [...prev, { speaker, text }]
    })
  }

  const startAll = async () => {
    isActiveRef.current  = true
    sessionIdRef.current = crypto.randomUUID()
    if (meetingUrl?.trim()) {
      await startBotMode()
    } else {
      await startBrowserMode()
    }
  }

  const startBotMode = async () => {
    setStatus('🔗 Connecting to backend...')

    const ws = new WebSocket(`${WS_BACKEND}/ws/${sessionIdRef.current}`)
    wsRef.current = ws

    ws.onmessage = (event) => {
      try {
        const data    = JSON.parse(event.data)
        const speaker = mapSpeaker(data.speaker, agentName)
        if (data.text?.trim()) addLine(speaker, data.text.trim())
      } catch {}
    }

    ws.onerror = () => setStatus('❌ WebSocket error — check backend is running')

    ws.onopen = async () => {
      try {
        const res = await fetch(`${BACKEND}/create-bot`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            meeting_url: meetingUrl.trim(),
            session_id:  sessionIdRef.current,
            bot_name:    'AIMIA Assistant',
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.detail || 'Bot creation failed')
        setBotId(data.bot_id)
        setStatus('🤖 AIMIA bot joining your Teams call — admit it in Teams when prompted...')
      } catch (err) {
        setStatus('❌ ' + err.message)
        setIsListening(false)
      }
    }

    ws.onclose = () => {
      if (isActiveRef.current) setStatus('⚠️ Connection dropped — try restarting the call')
    }
  }

  const startBrowserMode = async () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      setStatus('❌ Browser mode requires Chrome. Paste a Teams URL above for full capture.')
      setIsListening(false)
      return
    }

    setStatus('🎤 Mic only — paste a Teams meeting URL above for full call capture')

    const recognition          = new SR()
    recognition.continuous     = true
    recognition.interimResults = false
    recognition.lang           = 'en-AU'

    recognition.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          const text = e.results[i][0].transcript.trim()
          if (text) addLine(agentName || 'You', text)
        }
      }
    }

    recognition.onerror = (e) => {
      if (e.error !== 'no-speech') setStatus('⚠️ Mic error: ' + e.error)
    }

    recognition.onend = () => {
      if (isActiveRef.current) recognition.start()
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  const stopAll = () => {
    isActiveRef.current = false

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    if (botId && sessionIdRef.current) {
      fetch(`${BACKEND}/stop-bot`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ bot_id: botId, session_id: sessionIdRef.current }),
      }).catch(() => {})
      setBotId(null)
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }

    setStatus('')
  }

  const myName = agentName || 'You'

  return (
    <div>
      {status && (
        <div style={{
          fontSize: '12px', color: '#6B5CE7', marginBottom: '8px',
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '6px 10px', borderRadius: '7px',
          background: '#F4F3FF', border: '1px solid #DDD9FF',
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%', background: '#6B5CE7',
            display: 'inline-block', flexShrink: 0,
            animation: isListening ? 'tPulse 1.5s ease-in-out infinite' : 'none',
          }} />
          {status}
        </div>
      )}

      {isListening && (
        <div style={{ display: 'flex', gap: '14px', marginBottom: '8px', fontSize: '12px', color: '#6B7280' }}>
          <span><span style={{ color: getColor(myName) }}>●</span> {myName}</span>
          <span><span style={{ color: getColor('Customer') }}>●</span> Customer</span>
        </div>
      )}

      <div style={{
        background: '#ffffff', border: '1.5px solid #DDD9FF', borderRadius: '10px',
        padding: '12px 14px', minHeight: '80px', maxHeight: '260px',
        overflowY: 'auto', fontSize: '13px', lineHeight: 1.6,
        boxShadow: '0 1px 4px rgba(107,92,231,0.05)',
      }}>
        {transcript.length === 0 ? (
          <span style={{ color: '#9ca3af' }}>
            {isListening
              ? meetingUrl?.trim()
                ? 'Bot joining Teams... transcript appears once admitted (30–60 s)'
                : 'Listening — speak to see transcript...'
              : 'Paste your Teams meeting URL above, then start the call.'}
          </span>
        ) : transcript.map((line, i) => (
          <div key={i} style={{ marginBottom: '6px' }}>
            <span style={{ fontWeight: 700, color: getColor(line.speaker) }}>{line.speaker}:</span>{' '}
            <span style={{ color: '#1A1A2E' }}>{line.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <style>{`
        @keyframes tPulse {
          0%, 100% { opacity: 0.4; transform: scale(0.85); }
          50%       { opacity: 1;   transform: scale(1);    }
        }
      `}</style>
    </div>
  )
}