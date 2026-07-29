import { useState, useEffect, useRef } from 'react'
import TranscriptPanel from './TranscriptPanel'
import NudgeCards from './NudgeCards'
import CallSettings from './CallSettings'
import SessionStats from './SessionStats'
import TopBar from './TopBar'

const BACKEND = 'https://aimia-demo.onrender.com'

function AimiaLayout({ onViewChange }) {
  const [callType, setCallType] = useState('Sales discovery')
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState([])
  const [agentName, setAgentName] = useState('')

  const [preCallInput, setPreCallInput] = useState('')
  const [contextChips, setContextChips] = useState([])
  const [preCallImages, setPreCallImages] = useState([])
  const [isDragging, setIsDragging] = useState(false)

  const [currentNudge, setCurrentNudge] = useState(null)
  const [nudgeHistory, setNudgeHistory] = useState([])
  const [isGenerating, setIsGenerating] = useState(false)

  const [callStatus, setCallStatus] = useState('live')
  const [summary, setSummary] = useState('')

  const transcriptRef = useRef([])
  const contextChipsRef = useRef([])
  const preCallImagesRef = useRef([])
  const fileInputRef = useRef(null)
  const imageInputRef = useRef(null)
  const idRef = useRef(0)
  const firstNudgeFiredRef = useRef(false)

  useEffect(() => { transcriptRef.current = transcript }, [transcript])
  useEffect(() => { contextChipsRef.current = contextChips }, [contextChips])
  useEffect(() => { preCallImagesRef.current = preCallImages }, [preCallImages])

  const nextId = () => ++idRef.current
  const canSubmit = preCallInput.trim().length > 0 || preCallImages.length > 0

  const handleTranscriptUpdate = (newLine) => {
    setTranscript(prev => [...prev, newLine])
  }

  const generateNudge = async () => {
    const currentTranscript = transcriptRef.current
    if (currentTranscript.length === 0) return
    setIsGenerating(true)
    setCurrentNudge(null)
    try {
      const preCallContext = contextChipsRef.current
        .filter(c => !c.isImage)
        .map(c => c.text)
        .join('\n')
      const res = await fetch(`${BACKEND}/generate-nudges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: currentTranscript, call_type: callType, pre_call_context: preCallContext }),
      })
      const data = await res.json()
      if (data.nudges && data.nudges.length > 0) {
        setCurrentNudge({ ...data.nudges[0], helpful: null })
      }
    } catch (err) {
      console.error('Nudge generation failed:', err)
    } finally {
      setIsGenerating(false)
    }
  }

  useEffect(() => {
    if (isListening) {
      firstNudgeFiredRef.current = false
      setCurrentNudge(null)
      setNudgeHistory([])
      setIsGenerating(false)
      setCallStatus('live')
      setSummary('')
    }
  }, [isListening])

  useEffect(() => {
    if (isListening && !firstNudgeFiredRef.current && !isGenerating && transcriptRef.current.length >= 1) {
      firstNudgeFiredRef.current = true
      generateNudge()
    }
  }, [transcript])

  const handleFeedback = (helpful) => {
    if (!currentNudge) return
    setNudgeHistory(prev => [...prev, {
      nudge_id: String(currentNudge.nudge_id),
      nudge_type: currentNudge.nudge_type,
      nudge_message: currentNudge.nudge_message,
      helpful,
    }])
    setCurrentNudge(null)
    generateNudge()
  }

  const saveCall = async () => {
    setCallStatus('saving')
    setIsListening(false)
    const allNudges = [
      ...nudgeHistory,
      ...(currentNudge ? [{ nudge_id: String(currentNudge.nudge_id), nudge_type: currentNudge.nudge_type, nudge_message: currentNudge.nudge_message, helpful: false }] : []),
    ]
    let callSummary = 'Summary unavailable'
    try {
      const sumRes = await fetch(`${BACKEND}/generate-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, call_type: callType, nudges: allNudges }),
      })
      const sumData = await sumRes.json()
      if (sumData.summary) { callSummary = sumData.summary; setSummary(callSummary) }
    } catch (err) { console.error('Summary failed:', err) }

    const callData = {
      call_id: `call_${Date.now()}`,
      call_type: callType,
      agent_name: agentName.trim() || 'Unknown',
      timestamp: new Date().toISOString(),
      transcript, nudges: allNudges, summary: callSummary, comments: [],
    }
    try {
      const res = await fetch(`${BACKEND}/save-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(callData),
      })
      if (res.ok) setCallStatus('saved')
      else setCallStatus('error')
    } catch (err) { console.error('Save failed:', err); setCallStatus('error') }
  }

  const addContextChip = (text) => {
    if (!text.trim()) return
    setContextChips(prev => [...prev, { id: nextId(), text: text.trim(), isFile: false, isImage: false }])
  }

  const handleAddClick = () => {
    if (preCallInput.trim()) { addContextChip(preCallInput); setPreCallInput('') }
    if (preCallImages.length > 0) {
      preCallImages.forEach(img => {
        setContextChips(prev => [...prev, { id: nextId(), text: img.name, isFile: false, isImage: true, src: img.src }])
      })
      setPreCallImages([])
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && canSubmit) { e.preventDefault(); handleAddClick() }
  }

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || [])
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (ev) => setPreCallImages(prev => [...prev, { id: nextId(), name: file.name, src: ev.target.result }])
        reader.readAsDataURL(file)
      } else {
        setContextChips(prev => [...prev, { id: nextId(), text: file.name, isFile: true, isImage: false }])
      }
    })
    e.target.value = ''
  }

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files || [])
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (ev) => setPreCallImages(prev => [...prev, { id: nextId(), name: file.name, src: ev.target.result }])
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  const handlePaste = (e) => {
    const items = e.clipboardData?.items || []
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        const reader = new FileReader()
        reader.onload = (ev) => setPreCallImages(prev => [...prev, { id: nextId(), name: 'pasted-image.png', src: ev.target.result }])
        reader.readAsDataURL(file)
        return
      }
    }
  }

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = () => setIsDragging(false)
  const handleDrop = (e) => {
    e.preventDefault(); setIsDragging(false)
    const files = Array.from(e.dataTransfer.files || [])
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (ev) => setPreCallImages(prev => [...prev, { id: nextId(), name: file.name, src: ev.target.result }])
        reader.readAsDataURL(file)
      } else {
        setContextChips(prev => [...prev, { id: nextId(), text: file.name, isFile: true, isImage: false }])
      }
    })
  }

  const removeImage = (id) => setPreCallImages(prev => prev.filter(img => img.id !== id))
  const removeChip = (id) => setContextChips(prev => prev.filter(c => c.id !== id))

  const allNudgesForStats = [...nudgeHistory, ...(currentNudge ? [currentNudge] : [])]

  // ── Atlas colour tokens ──────────────────────────────────────────────────
  const purple = '#6B5CE7'
  const purpleLight = '#F4F3FF'
  const purpleBorder = '#DDD9FF'
  const purpleMid = '#EEF2FF'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', fontFamily: 'Inter, "Segoe UI", sans-serif', background: '#F8F7FF' }}>
      <TopBar isListening={isListening} currentView="live" onViewChange={onViewChange} />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── LEFT PANEL ── */}
        <div style={{
          width: '60%', borderRight: `1px solid ${purpleBorder}`,
          padding: '16px', overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: '12px',
          background: '#ffffff',
        }}>

          {/* Agent Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', whiteSpace: 'nowrap' }}>
              Your name:
            </label>
            <input
              type="text"
              value={agentName}
              onChange={e => setAgentName(e.target.value)}
              placeholder="Enter your name"
              style={{
                flex: 1, padding: '6px 10px',
                border: `1px solid ${purpleBorder}`, borderRadius: '7px',
                fontSize: '13px', outline: 'none', fontFamily: 'inherit',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => e.target.style.borderColor = purple}
              onBlur={e => e.target.style.borderColor = purpleBorder}
            />
          </div>

          {/* Pre-call Context */}
          <div
            style={{
              border: `1.5px solid ${isDragging ? purple : purpleBorder}`,
              borderRadius: '12px', padding: '10px 12px',
              background: isDragging ? purpleLight : '#fff',
              transition: 'border-color 0.15s, background 0.15s',
              boxShadow: '0 1px 4px rgba(107,92,231,0.05)',
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: purple, marginBottom: '6px', letterSpacing: '0.06em' }}>
              PRE-CALL CONTEXT
            </div>

            {preCallImages.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                {preCallImages.map(img => (
                  <div key={img.id} style={{ position: 'relative' }}>
                    <img src={img.src} alt={img.name}
                      style={{ width: '52px', height: '52px', objectFit: 'cover', borderRadius: '8px', border: `1.5px solid ${purpleBorder}`, display: 'block' }} />
                    <button onClick={() => removeImage(img.id)}
                      style={{ position: 'absolute', top: '-5px', right: '-5px', width: '16px', height: '16px', borderRadius: '50%', background: '#ef4444', color: 'white', border: 'none', cursor: 'pointer', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
              <textarea
                value={preCallInput}
                onChange={e => setPreCallInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder={isDragging ? 'Drop here…' : 'Add LinkedIn URL, prospect details, deal notes, or drag & drop files…'}
                rows={2}
                style={{ flex: 1, resize: 'none', border: 'none', outline: 'none', fontSize: '13px', color: '#111827', background: 'transparent', lineHeight: 1.5, fontFamily: 'inherit' }}
              />
              <div style={{ display: 'flex', gap: '4px', flexShrink: 0, alignItems: 'center' }}>
                <button onClick={() => imageInputRef.current?.click()} title="Upload image"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#9ca3af', fontSize: '16px' }}>🖼</button>
                <button onClick={() => fileInputRef.current?.click()} title="Upload file"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#9ca3af', fontSize: '16px' }}>📎</button>
                <button onClick={handleAddClick} disabled={!canSubmit} title="Add to context"
                  style={{
                    width: '30px', height: '30px', borderRadius: '8px',
                    background: canSubmit ? purple : '#e5e7eb',
                    color: canSubmit ? 'white' : '#9ca3af',
                    border: 'none', cursor: canSubmit ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '15px', fontWeight: 'bold',
                    transition: 'background 0.15s, color 0.15s', flexShrink: 0,
                    boxShadow: canSubmit ? '0 2px 6px rgba(107,92,231,0.3)' : 'none',
                  }}>↑</button>
              </div>
            </div>

            <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={handleFileSelect} />
            <input ref={imageInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleImageSelect} />
          </div>

          {/* Context Chips */}
          {contextChips.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
              {contextChips.map(chip => (
                chip.isImage ? (
                  <div key={chip.id} style={{ position: 'relative' }}>
                    <img src={chip.src} alt={chip.text}
                      style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px', border: `1.5px solid ${purpleBorder}`, display: 'block' }} />
                    <button onClick={() => removeChip(chip.id)}
                      style={{ position: 'absolute', top: '-5px', right: '-5px', width: '14px', height: '14px', borderRadius: '50%', background: '#ef4444', color: 'white', border: 'none', cursor: 'pointer', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                      ×
                    </button>
                  </div>
                ) : (
                  <div key={chip.id} style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '3px 10px', borderRadius: '20px', fontSize: '11px', maxWidth: '240px',
                    background: chip.isFile ? '#f1f5f9' : purpleLight,
                    border: `0.5px solid ${chip.isFile ? '#cbd5e1' : purpleBorder}`,
                    color: chip.isFile ? '#475569' : purple,
                  }}>
                    <span>{chip.isFile ? '📄' : '✓'}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {chip.text.length > 38 ? chip.text.slice(0, 38) + '…' : chip.text}
                    </span>
                    <button onClick={() => removeChip(chip.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', padding: 0, opacity: 0.5, lineHeight: 1, flexShrink: 0 }}>×</button>
                  </div>
                )
              ))}
              <button onClick={() => { setContextChips([]); setPreCallImages([]) }}
                style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', border: `0.5px solid ${purpleBorder}`, background: purpleLight, color: purple, cursor: 'pointer' }}>
                Clear all
              </button>
            </div>
          )}

          <CallSettings callType={callType} onCallTypeChange={setCallType} isListening={isListening} onListeningChange={setIsListening} />
          <TranscriptPanel
            transcript={transcript}
            setTranscript={setTranscript}
            isListening={isListening}
            setIsListening={setIsListening}
            agentName={agentName}
          />
          <SessionStats transcript={transcript} nudges={allNudgesForStats} isListening={isListening} />

          {/* End Call Button */}
          <button
            onClick={saveCall}
            disabled={callStatus === 'saving' || callStatus === 'saved'}
            style={{
              padding: '12px 32px',
              backgroundColor:
                callStatus === 'saved'  ? '#22c55e' :
                callStatus === 'error'  ? '#ef4444' :
                callStatus === 'saving' ? '#9ca3af' : '#e11d48',
              color: 'white', border: 'none', borderRadius: '9px',
              fontSize: '14px', fontWeight: '700', marginTop: '8px',
              cursor: callStatus === 'saving' ? 'not-allowed' : 'pointer',
              boxShadow: callStatus === 'live' ? '0 2px 8px rgba(225,29,72,0.3)' : 'none',
              transition: 'all 0.2s',
            }}>
            {callStatus === 'live'   && '⏹ End Call & Save'}
            {callStatus === 'saving' && '💾 Saving + Generating Summary…'}
            {callStatus === 'saved'  && '✅ Call Saved!'}
            {callStatus === 'error'  && '❌ Save Failed — Retry'}
          </button>

          {/* Summary */}
          {summary && (
            <div style={{
              padding: '16px', borderRadius: '10px',
              background: purpleLight, border: `1px solid ${purpleBorder}`,
              borderLeft: `3px solid ${purple}`,
              fontSize: '13px', lineHeight: '1.6', color: '#1A1A2E',
            }}>
              <div style={{ color: purple, fontWeight: '700', marginBottom: '8px' }}>📝 AI Call Summary</div>
              {summary}
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={{ width: '40%', padding: '16px', overflowY: 'auto', background: '#F8F7FF' }}>
          <NudgeCards
            currentNudge={currentNudge}
            isGenerating={isGenerating}
            isListening={isListening}
            nudgeCount={allNudgesForStats.length}
            onFeedback={handleFeedback}
          />
        </div>

      </div>
    </div>
  )
}

export default AimiaLayout