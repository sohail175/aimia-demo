import { useState, useEffect } from 'react'
import TopBar from './TopBar'

const BACKEND = 'http://127.0.0.1:8000'

// ── Atlas tokens ─────────────────────────────────────────────────────────────
const purple       = '#6B5CE7'
const purpleLight  = '#F4F3FF'
const purpleBorder = '#DDD9FF'
const purpleMid    = '#EEF2FF'
const dark         = '#1A1A2E'

function CallHistory({ onViewChange }) {
  const [calls, setCalls] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  const [commentName, setCommentName] = useState('')
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState({})

  useEffect(() => { fetchCalls() }, [])

  const fetchCalls = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${BACKEND}/get-calls`)
      const data = await res.json()
      setCalls(data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)))
    } catch (err) {
      console.error('Failed to fetch calls:', err)
    }
    setLoading(false)
  }

  const addComment = async (callId) => {
    if (!commentName.trim() || !commentText.trim()) return
    setSubmitting(true)
    try {
      await fetch(`${BACKEND}/add-comment/${callId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commenter_name: commentName,
          comment_text: commentText,
          timestamp: new Date().toISOString(),
        }),
      })
      setCommentText('')
      await fetchCalls()
    } catch (err) {
      console.error('Failed to add comment:', err)
    }
    setSubmitting(false)
  }

  const downloadCall = (call) => {
    const date = new Date(call.timestamp).toLocaleString()
    const transcriptText = (call.transcript || []).map(t => `${t.speaker}: ${t.text}`).join('\n')
    const nudgeText      = (call.nudges    || []).map(n => `[${(n.nudge_type || '').toUpperCase()}] ${n.nudge_message} — ${n.helpful ? 'Helpful 👍' : 'Not helpful 👎'}`).join('\n')
    const commentsText   = (call.comments  || []).map(c => `${c.commenter_name} (${new Date(c.timestamp).toLocaleString()}):\n  ${c.comment_text}`).join('\n\n')

    const content = `AIMIA CALL REPORT
=================
Date       : ${date}
Agent      : ${call.agent_name || 'Unknown'}
Call Type  : ${call.call_type}
Call ID    : ${call.call_id}

TRANSCRIPT
----------
${transcriptText || 'No transcript available'}

AI NUDGES
---------
${nudgeText || 'No nudges recorded'}

CALL SUMMARY
------------
${call.summary || 'No summary available'}

TEAM COMMENTS
-------------
${commentsText || 'No comments yet'}`.trim()

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `AIMIA_${(call.agent_name || 'Unknown').replace(/\s/g, '_')}_${date.replace(/[/,: ]/g, '-')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const nudgeBg     = { warn: '#fef3c7', ask: '#dbeafe', flag: '#fce7f3', nudge: purpleLight }
  const nudgeBorder = { warn: '#f59e0b', ask: '#3b82f6', flag: '#ec4899', nudge: purple }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'Inter, "Segoe UI", sans-serif', background: '#F8F7FF' }}>
      <TopBar isListening={false} currentView="history" onViewChange={onViewChange} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', backgroundColor: '#F8F7FF' }}>

        {/* ── Page header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: dark }}>📋 Call History</h2>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6b7280' }}>
              {calls.length} calls saved — visible to all team members
            </p>
          </div>
          <button
            onClick={fetchCalls}
            style={{
              padding: '6px 14px', borderRadius: '8px',
              border: `1px solid ${purpleBorder}`,
              background: purpleLight, cursor: 'pointer',
              fontSize: '12px', color: purple, fontWeight: '600',
            }}>
            🔄 Refresh
          </button>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', color: '#6b7280', padding: '40px' }}>Loading calls…</div>
        )}
        {!loading && calls.length === 0 && (
          <div style={{ textAlign: 'center', color: '#6b7280', padding: '40px' }}>
            No calls saved yet. Complete a call to see it here.
          </div>
        )}

        {calls.map(call => {
          const isExpanded = expandedId === call.call_id
          const tab  = activeTab[call.call_id] || 'summary'
          const date = new Date(call.timestamp)

          return (
            <div key={call.call_id} style={{
              background: '#ffffff',
              borderRadius: '12px',
              border: `1px solid ${purpleBorder}`,
              marginBottom: '12px',
              overflow: 'hidden',
              boxShadow: '0 1px 4px rgba(107,92,231,0.07)',
            }}>

              {/* ── Card header ── */}
              <div
                style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => setExpandedId(isExpanded ? null : call.call_id)}
              >
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {/* Avatar */}
                  <div style={{
                    width: '38px', height: '38px', borderRadius: '50%',
                    background: `linear-gradient(135deg, ${purple} 0%, #a78bfa 100%)`,
                    color: 'white', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '14px', fontWeight: '700', flexShrink: 0,
                  }}>
                    {(call.agent_name || 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '14px', color: dark }}>
                      {call.agent_name || 'Unknown Agent'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>
                      {date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {' · '}
                      {date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{
                    padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600',
                    background: '#f0fdf4', color: '#166534', border: '1px solid #86efac',
                  }}>
                    {call.call_type}
                  </span>
                  <span style={{
                    padding: '3px 10px', borderRadius: '20px', fontSize: '11px',
                    background: purpleLight, color: purple, border: `1px solid ${purpleBorder}`,
                  }}>
                    💬 {(call.comments || []).length} comments
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); downloadCall(call) }}
                    style={{
                      padding: '4px 10px', borderRadius: '6px',
                      border: `1px solid ${purpleBorder}`,
                      background: purpleLight, cursor: 'pointer',
                      fontSize: '11px', color: purple, fontWeight: '500',
                    }}>
                    ⬇ Download
                  </button>
                  <span style={{ fontSize: '12px', color: '#9ca3af' }}>{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>

              {/* ── Collapsed summary preview ── */}
              {!isExpanded && call.summary && (
                <div style={{
                  padding: '0 16px 14px 66px',
                  fontSize: '12px', color: '#6b7280',
                  borderTop: `1px solid ${purpleMid}`,
                  paddingTop: '10px',
                }}>
                  {call.summary.slice(0, 160)}{call.summary.length > 160 ? '…' : ''}
                </div>
              )}

              {/* ── Expanded content ── */}
              {isExpanded && (
                <div style={{ borderTop: `1px solid ${purpleBorder}` }}>

                  {/* Tabs */}
                  <div style={{ display: 'flex', borderBottom: `1px solid ${purpleBorder}`, background: purpleLight }}>
                    {['summary', 'transcript', 'nudges', 'comments'].map(t => (
                      <button
                        key={t}
                        onClick={() => setActiveTab(prev => ({ ...prev, [call.call_id]: t }))}
                        style={{
                          padding: '10px 18px', border: 'none', cursor: 'pointer',
                          fontSize: '12px', fontWeight: tab === t ? '700' : '400',
                          color: tab === t ? purple : '#6b7280',
                          background: 'transparent',
                          borderBottom: tab === t ? `2px solid ${purple}` : '2px solid transparent',
                          transition: 'color 0.15s',
                        }}>
                        {t === 'summary'    ? '📝 Summary'
                          : t === 'transcript' ? '🎙 Transcript'
                          : t === 'nudges'     ? '💡 Nudges'
                          :                      `💬 Comments (${(call.comments || []).length})`}
                      </button>
                    ))}
                  </div>

                  <div style={{ padding: '16px' }}>

                    {/* Summary */}
                    {tab === 'summary' && (
                      <div style={{ fontSize: '13px', color: '#374151', lineHeight: '1.7' }}>
                        {call.summary || 'No summary available.'}
                      </div>
                    )}

                    {/* Transcript */}
                    {tab === 'transcript' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                        {(call.transcript || []).map((line, i) => (
                          <div key={i} style={{
                            padding: '8px 12px', borderRadius: '8px',
                            background: purpleLight,
                            border: `1px solid ${purpleBorder}`,
                            fontSize: '13px',
                          }}>
                            <span style={{ fontWeight: '700', color: purple, marginRight: '8px' }}>
                              {line.speaker}:
                            </span>
                            <span style={{ color: dark }}>{line.text}</span>
                          </div>
                        ))}
                        {(call.transcript || []).length === 0 && (
                          <div style={{ color: '#9ca3af', fontSize: '13px' }}>No transcript available.</div>
                        )}
                      </div>
                    )}

                    {/* Nudges */}
                    {tab === 'nudges' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(call.nudges || []).map((n, i) => (
                          <div key={i} style={{
                            padding: '10px 14px', borderRadius: '8px',
                            background: nudgeBg[n.nudge_type]     || purpleLight,
                            border: `1px solid ${nudgeBorder[n.nudge_type] || purpleBorder}`,
                            fontSize: '13px',
                          }}>
                            <span style={{
                              fontSize: '10px', fontWeight: '700',
                              color: nudgeBorder[n.nudge_type] || purple,
                              letterSpacing: '0.05em', display: 'block', marginBottom: '4px',
                            }}>
                              {(n.nudge_type || '').toUpperCase()}
                            </span>
                            <span style={{ color: dark }}>{n.nudge_message}</span>
                            <span style={{ float: 'right' }}>{n.helpful ? '👍' : '👎'}</span>
                          </div>
                        ))}
                        {(call.nudges || []).length === 0 && (
                          <div style={{ color: '#9ca3af', fontSize: '13px' }}>No nudges recorded.</div>
                        )}
                      </div>
                    )}

                    {/* Comments */}
                    {tab === 'comments' && (
                      <div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                          {(call.comments || []).map((c, i) => (
                            <div key={i} style={{
                              padding: '10px 14px', borderRadius: '8px',
                              background: purpleLight, border: `1px solid ${purpleBorder}`,
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span style={{ fontWeight: '700', fontSize: '12px', color: purple }}>
                                  {c.commenter_name}
                                </span>
                                <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                                  {new Date(c.timestamp).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <div style={{ fontSize: '13px', color: dark }}>{c.comment_text}</div>
                            </div>
                          ))}
                          {(call.comments || []).length === 0 && (
                            <div style={{ color: '#9ca3af', fontSize: '13px' }}>No comments yet. Be the first.</div>
                          )}
                        </div>

                        {/* Add comment */}
                        <div style={{ borderTop: `1px solid ${purpleBorder}`, paddingTop: '14px' }}>
                          <div style={{ fontSize: '12px', fontWeight: '700', color: purple, marginBottom: '8px' }}>
                            Add a comment
                          </div>
                          <input
                            value={commentName}
                            onChange={e => setCommentName(e.target.value)}
                            placeholder="Your name"
                            style={{
                              width: '100%', padding: '7px 10px', borderRadius: '7px',
                              border: `1px solid ${purpleBorder}`, fontSize: '12px',
                              marginBottom: '6px', boxSizing: 'border-box',
                              outline: 'none', fontFamily: 'inherit',
                            }}
                            onFocus={e => e.target.style.borderColor = purple}
                            onBlur={e => e.target.style.borderColor = purpleBorder}
                          />
                          <textarea
                            value={commentText}
                            onChange={e => setCommentText(e.target.value)}
                            placeholder="Write your comment…"
                            rows={2}
                            style={{
                              width: '100%', padding: '7px 10px', borderRadius: '7px',
                              border: `1px solid ${purpleBorder}`, fontSize: '12px',
                              resize: 'none', boxSizing: 'border-box',
                              fontFamily: 'inherit', outline: 'none',
                            }}
                            onFocus={e => e.target.style.borderColor = purple}
                            onBlur={e => e.target.style.borderColor = purpleBorder}
                          />
                          <button
                            onClick={() => addComment(call.call_id)}
                            disabled={submitting || !commentName.trim() || !commentText.trim()}
                            style={{
                              marginTop: '6px', padding: '7px 18px', borderRadius: '7px',
                              border: 'none',
                              background: (commentName.trim() && commentText.trim()) ? purple : '#e5e7eb',
                              color:      (commentName.trim() && commentText.trim()) ? 'white'  : '#9ca3af',
                              cursor:     (commentName.trim() && commentText.trim()) ? 'pointer' : 'default',
                              fontSize: '12px', fontWeight: '600',
                              boxShadow: (commentName.trim() && commentText.trim()) ? '0 2px 6px rgba(107,92,231,0.3)' : 'none',
                              transition: 'all 0.15s',
                            }}>
                            {submitting ? 'Posting…' : 'Post Comment'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default CallHistory