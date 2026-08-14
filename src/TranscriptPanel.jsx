import { useEffect, useRef, useState } from 'react'

const BACKEND = 'https://aimia-demo.onrender.com'
const SPEAKER_COLORS = { You: '#6B5CE7', Customer: '#d97706' }
const getColor = (name) => SPEAKER_COLORS[name] ?? '#0ea5e9'

export default function TranscriptPanel({
  transcript, setTranscript, isListening, setIsListening, agentName,
}) {
  const [status, setStatus]       = useState('')
  const [sourceType, setSourceType] = useState(null) // 'screen' | 'mic'

  const mediaRecorderRef = useRef(null)
  const streamRef        = useRef(null)
  const recognitionRef   = useRef(null)
  const isActiveRef      = useRef(false)
  const chunkQueueRef    = useRef(Promise.resolve())
  const bottomRef        = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

  useEffect(() => {
    if (isListening) startListening()
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

  // ── MAIN ENTRY: show screen/tab/window picker ─────────────────────────────
  const startListening = async () => {
    isActiveRef.current = true
    setStatus('🖥️ Select a screen, window, or browser tab to record...')

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: { echoCancellation: true, noiseSuppression: true },
      })

      streamRef.current = stream
      setSourceType('screen')
      setStatus('🔴 Recording — transcript appears every few seconds...')

      // If user clicks "Stop sharing" in the browser bar
      stream.getVideoTracks()[0].onended = () => {
        if (isActiveRef.current) {
          setStatus('⏹ Screen sharing stopped')
          setIsListening(false)
        }
      }

      startMediaRecorder(stream)

    } catch (err) {
      // User cancelled the picker — fall back to mic
      setStatus('🎤 No screen selected — using microphone instead')
      startMicMode()
    }
  }

  // ── SCREEN MODE: capture audio from selected stream ───────────────────────
  const startMediaRecorder = (stream) => {
    const audioCtx = new AudioContext()
    const source   = audioCtx.createMediaStreamSource(stream)
    const dest     = audioCtx.createMediaStreamDestination()
    source.connect(dest)

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm'

    const recorder = new MediaRecorder(dest.stream, { mimeType })
    mediaRecorderRef.current = recorder

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        // Queue chunks so they don't overlap
        chunkQueueRef.current = chunkQueueRef.current.then(() => sendChunk(e.data))
      }
    }

    recorder.start(4000) // send chunk every 4 seconds
  }

  const sendChunk = async (blob) => {
    if (!isActiveRef.current) return
    try {
      const form = new FormData()
      form.append('audio', blob, 'chunk.webm')
      const res  = await fetch(`${BACKEND}/transcribe-chunk`, { method: 'POST', body: form })
      const data = await res.json()
      const text = data.text?.trim()
      if (text) addLine(agentName || 'You', text)
    } catch {}
  }

  // ── MIC MODE: Web Speech API fallback ────────────────────────────────────
  const startMicMode = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      setStatus('❌ Speech recognition requires Chrome.')
      setIsListening(false)
      return
    }

    setSourceType('mic')
    setStatus('🎤 Listening via microphone...')

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

  // ── STOP ─────────────────────────────────────────────────────────────────
  const stopAll = () => {
    isActiveRef.current = false

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }

    setStatus('')
    setSourceType(null)
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
          <span style={{ marginLeft: 'auto', fontWeight: 600, color: sourceType === 'screen' ? '#6B5CE7' : '#9ca3af' }}>
            {sourceType === 'screen' ? '🖥️ Screen capture' : '🎤 Mic only'}
          </span>
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
              ? sourceType === 'screen'
                ? 'Recording screen — transcript appears every few seconds...'
                : 'Listening — speak to see transcript...'
              : 'Start listening to see transcript here.'}
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