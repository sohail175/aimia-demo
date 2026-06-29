import { useEffect, useRef } from 'react'

function TranscriptPanel({ transcript, isListening, onTranscriptUpdate }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      console.error('Speech Recognition not supported')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-AU'

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          const text = result[0].transcript.trim()
          if (text) {
            onTranscriptUpdate({ speaker: 'You', text })
          }
        }
      }
    }

    recognition.onerror = (event) => {
      console.error('Speech error:', event.error)
    }

    if (isListening) {
      recognition.start()
    }

    return () => recognition.stop()
  }, [isListening])

  return (
    <div className="transcript-box">
      <h2>Live Transcript</h2>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginBottom: '8px',
        fontSize: '12px',
        color: isListening ? '#22c55e' : '#888'
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: isListening ? '#22c55e' : '#888',
          animation: isListening ? 'pulse 1.5s infinite' : 'none'
        }} />
        {isListening ? '🎤 Listening...' : '⏸ Microphone off'}
      </div>

      {transcript.length === 0 ? (
        <p style={{ color: '#888', fontSize: '13px' }}>
          Start speaking to see transcript...
        </p>
      ) : (
        transcript.map((line, index) => (
          <p key={index} style={{ marginBottom: '8px' }}>
            <strong style={{
              color: line.speaker === 'You' ? '#3b82f6' : '#f59e0b'
            }}>
              {line.speaker}
            </strong>: {line.text}
          </p>
        ))
      )}
      <div ref={bottomRef} />
    </div>
  )
}

export default TranscriptPanel