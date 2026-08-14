import { useEffect, useRef, useState } from 'react'

const SPEAKER_COLORS = { You: '#6B5CE7', Customer: '#d97706' }
const getColor = (name) => SPEAKER_COLORS[name] ?? '#0ea5e9'

export default function TranscriptPanel({
  transcript, setTranscript, isListening, setIsListening, agentName,
}) {
  const [status, setStatus] = useState('')

  const recognitionRef = useRef(null)
  const isActiveRef    = useRef(false)
  const bottomRef      = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

  useEffect(() => {
    if (isListening) startListening()
    else             stopListening()
    return () => stopListening()
  }, [isListening])

  const addLine = (speaker, text) => {
    setTranscript(prev => {
      const last = prev[prev.length - 1]
      if (last?.speaker === speaker && last?.text === text) return prev
      return [...prev, { speaker, text }]
    })
  }

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      setStatus('❌ Speech recognition requires Chrome.')
      setIsListening(false)
      return
    }

    isActiveRef.current = true
    setStatus('🎤 Listening...')

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

  const stopListening = () => {
    isActiveRef.current = false
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
            {isListening ? 'Listening — speak to see transcript...' : 'Start listening to see transcript here.'}
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