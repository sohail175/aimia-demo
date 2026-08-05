import { useEffect, useRef, useState } from 'react'

const BACKEND  = 'https://aimia-demo.onrender.com'
const CHUNK_MS = 3000

const SPEAKER_COLORS = { You: '#6B5CE7', Customer: '#d97706' }
const getColor = (name) => SPEAKER_COLORS[name] ?? '#0ea5e9'

export default function TranscriptPanel({
  transcript, setTranscript, isListening, setIsListening, agentName,
}) {
  const [status, setStatus]   = useState('')
  const micStreamRef          = useRef(null)
  const micRecorderRef        = useRef(null)
  const sysStreamRef          = useRef(null)
  const sysRecorderRef        = useRef(null)
  const isActiveRef           = useRef(false)
  const bottomRef             = useRef(null)

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
    try {
      isActiveRef.current = true

      setStatus('🎤 Requesting microphone…')
      let micStream
      try {
        micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl:  true,
            channelCount:     1,
            sampleRate:       16000,
          },
        })
        micStreamRef.current = micStream
      } catch {
        setStatus('❌ Microphone denied — allow mic access then refresh')
        setIsListening(false)
        return
      }

      setStatus('📺 Select your WhatsApp / YouTube tab → click Share')
      let displayStream
      try {
        displayStream = await navigator.mediaDevices.getDisplayMedia({
          audio: true,
          video: { width: 1, height: 1 },
        })
        displayStream.getVideoTracks().forEach(t => t.stop())
      } catch {
        setStatus('🎤 Mic only — customer audio unavailable (screen share cancelled)')
        startLoop(micStream, agentName || 'You', micRecorderRef)
        return
      }

      const sysAudio = displayStream.getAudioTracks()
      if (sysAudio.length === 0) {
        setStatus('⚠️ No tab audio — stop, retry and tick "Share tab audio"')
        startLoop(micStream, agentName || 'You', micRecorderRef)
        return
      }

      const sysStream      = new MediaStream(sysAudio)
      sysStreamRef.current = sysStream
      setStatus('🎙 Live — transcript updates every ~3 s')

      startLoop(micStream,  agentName || 'You', micRecorderRef)
      startLoop(sysStream,  'Customer',          sysRecorderRef)

    } catch (err) {
      setStatus('❌ ' + err.message)
      setIsListening(false)
    }
  }

  const startLoop = (stream, speaker, recorderRef) => {
    if (!isActiveRef.current) return
    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus' : 'audio/webm'

    const loop = () => {
      if (!isActiveRef.current) return
      const chunks = []
      let rec
      try { rec = new MediaRecorder(stream, { mimeType: mime }) } catch { return }
      recorderRef.current = rec
      rec.ondataavailable = (e) => { if (e.data?.size > 0) chunks.push(e.data) }
      rec.onstop = () => {
        const blob = new Blob(chunks, { type: mime })
        if (blob.size > 1000 && isActiveRef.current) sendChunk(blob, speaker)
        loop()
      }
      rec.start()
      setTimeout(() => { if (rec.state === 'recording') rec.stop() }, CHUNK_MS)
    }
    loop()
  }

  const sendChunk = async (blob, speaker) => {
    try {
      const form = new FormData()
      form.append('audio', blob, 'chunk.webm')
      const res  = await fetch(`${BACKEND}/transcribe-chunk`, { method: 'POST', body: form })
      if (!res.ok) return
      const { text } = await res.json()
      if (text?.trim()) addLine(speaker, text.trim())
    } catch {}
  }

  const stopAll = () => {
    isActiveRef.current = false
    for (const ref of [micRecorderRef, sysRecorderRef]) {
      try { if (ref.current?.state === 'recording') ref.current.stop() } catch {}
      ref.current = null
    }
    for (const ref of [micStreamRef, sysStreamRef]) {
      ref.current?.getTracks().forEach(t => t.stop())
      ref.current = null
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
            {isListening ? 'Listening — transcript updates every ~3 s…' : 'Start listening to see transcript here.'}
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