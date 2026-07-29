import { useEffect, useRef, useState } from 'react'

const BACKEND = 'https://aimia-demo.onrender.com'
const SYS_CHUNK_MS = 5000

const SPEAKER_COLORS = { 'You': '#6B5CE7', 'Customer': '#d97706' }
const getColor = (name) => SPEAKER_COLORS[name] ?? '#0ea5e9'

export default function TranscriptPanel({ transcript, setTranscript, isListening, setIsListening, agentName }) {
  const [status, setStatus] = useState('')
  const recognitionRef = useRef(null)
  const sysRecorderRef = useRef(null)
  const sysStreamRef   = useRef(null)
  const isActiveRef    = useRef(false)
  const bottomRef      = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

  useEffect(() => {
    if (isListening) startAll()
    else stopAll()
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
    try {
      isActiveRef.current = true

      // ── A. Web Speech API (mic → You) ─────────────────────────────────────
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition
      if (!SR) {
        setStatus('Web Speech API not supported in this browser')
      } else {
        const r = new SR()
        r.continuous     = true
        r.interimResults = true
        r.lang           = 'en-US'

        r.onstart = () => setStatus('Mic active — now select screen for customer audio…')

        r.onresult = (ev) => {
          for (let i = ev.resultIndex; i < ev.results.length; i++) {
            if (ev.results[i].isFinal) {
              const text = ev.results[i][0].transcript.trim()
              if (text) addLine(agentName || 'You', text)
            }
          }
        }

        r.onerror = (e) => {
          console.error('Speech recognition error:', e.error)
          if (e.error === 'not-allowed') setStatus('Microphone permission denied — please allow mic access')
          else if (e.error === 'network')  setStatus('Network error — Web Speech API needs internet')
        }

        r.onend = () => { if (isActiveRef.current) r.start() }
        r.start()
        recognitionRef.current = r
      }

      // ── B. Screen share (system audio → Customer) ─────────────────────────
      setStatus('Select screen — tick "Share system audio" then click Share…')
      let displayStream
      try {
        displayStream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: true })
        displayStream.getVideoTracks().forEach(t => t.stop())
      } catch {
        setStatus('Mic active — screen share skipped (customer audio unavailable)')
        return
      }

      const sysAudio = displayStream.getAudioTracks()
      if (sysAudio.length > 0) {
        const sysStream = new MediaStream(sysAudio)
        sysStreamRef.current = sysStream
        setStatus('Recording — your speech is instant · customer speech every ~5s')
        recordChunk(sysStream)
      } else {
        setStatus('Recording — mic only (no system audio in screen share)')
      }

    } catch (err) {
      setStatus('Error: ' + err.message)
      setIsListening(false)
    }
  }

  const recordChunk = (sysStream) => {
    if (!isActiveRef.current) return
    const chunks = []
    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus' : 'audio/webm'
    const recorder = new MediaRecorder(sysStream, { mimeType: mime })
    sysRecorderRef.current = recorder

    recorder.ondataavailable = (e) => { if (e.data?.size > 0) chunks.push(e.data) }
    recorder.onstop = async () => {
      if (chunks.length > 0 && isActiveRef.current) sendChunk(new Blob(chunks, { type: mime }))
      recordChunk(sysStream)
    }

    recorder.start()
    setTimeout(() => { if (recorder.state === 'recording') recorder.stop() }, SYS_CHUNK_MS)
  }

  const sendChunk = async (blob) => {
    try {
      const form = new FormData()
      form.append('audio', blob, 'chunk.webm')
      const res = await fetch(`${BACKEND}/transcribe-chunk`, { method: 'POST', body: form })
      if (!res.ok) return
      const { text } = await res.json()
      if (text?.trim()) addLine('Customer', text.trim())
    } catch { /* silent */ }
  }

  const stopAll = () => {
    isActiveRef.current = false
    recognitionRef.current?.stop()
    recognitionRef.current = null
    if (sysRecorderRef.current?.state === 'recording') sysRecorderRef.current.stop()
    sysRecorderRef.current = null
    sysStreamRef.current?.getTracks().forEach(t => t.stop())
    setStatus('')
  }

  const myName = agentName || 'You'

  return (
    <div>
      {/* Status bar */}
      {status && (
        <div style={{
          fontSize: '12px', color: '#6B5CE7',
          marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px',
          padding: '6px 10px', borderRadius: '7px',
          background: '#F4F3FF', border: '1px solid #DDD9FF',
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%', background: '#6B5CE7',
            display: 'inline-block', flexShrink: 0,
            animation: isListening ? 'transcriptPulse 1.5s ease-in-out infinite' : 'none',
          }} />
          {status}
        </div>
      )}

      {/* Speaker legend */}
      {isListening && (
        <div style={{ display: 'flex', gap: '14px', marginBottom: '8px', fontSize: '12px', color: '#6B7280' }}>
          <span><span style={{ color: getColor(myName) }}>●</span> {myName}</span>
          <span><span style={{ color: getColor('Customer') }}>●</span> Customer</span>
        </div>
      )}

      {/* Transcript box */}
      <div style={{
        background: '#ffffff',
        border: '1.5px solid #DDD9FF',
        borderRadius: '10px',
        padding: '12px 14px',
        minHeight: '80px',
        maxHeight: '260px',
        overflowY: 'auto',
        fontSize: '13px',
        lineHeight: 1.6,
        boxShadow: '0 1px 4px rgba(107,92,231,0.05)',
      }}>
        {transcript.length === 0 ? (
          <span style={{ color: '#9ca3af' }}>
            {isListening
              ? 'Speak now — your words appear instantly…'
              : 'Start listening to see transcript here.'}
          </span>
        ) : transcript.map((line, i) => (
          <div key={i} style={{ marginBottom: '6px' }}>
            <span style={{ fontWeight: 700, color: getColor(line.speaker) }}>
              {line.speaker}:
            </span>
            {' '}
            <span style={{ color: '#1A1A2E' }}>{line.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <style>{`
        @keyframes transcriptPulse {
          0%, 100% { opacity: 0.4; transform: scale(0.85); }
          50%       { opacity: 1;   transform: scale(1);    }
        }
      `}</style>
    </div>
  )
}