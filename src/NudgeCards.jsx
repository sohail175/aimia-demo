function NudgeCards({ nudges, onFeedback }) {
  return (
    <div className="nudge-list">
      <h2>AIMIA Assistant</h2>
      {nudges.map((nudge) => (
        <div key={nudge.nudge_id} className={`nudge-card nudge-${nudge.nudge_type}`}>
          <div className="nudge-label">{nudge.nudge_type.toUpperCase()}</div>
          <p>{nudge.nudge_message}</p>

          {/* THUMBS UP / DOWN FEEDBACK */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button
              onClick={() => onFeedback(nudge.nudge_id, true)}
              style={{
                background: nudge.helpful === true ? '#22c55e' : '#eee',
                border: 'none', borderRadius: '4px',
                padding: '4px 10px', cursor: 'pointer',
              }}
            >👍</button>
            <button
              onClick={() => onFeedback(nudge.nudge_id, false)}
              style={{
                background: nudge.helpful === false ? '#ef4444' : '#eee',
                border: 'none', borderRadius: '4px',
                padding: '4px 10px', cursor: 'pointer',
              }}
            >👎</button>
          </div>
        </div>
      ))}
    </div>
  )
}

export default NudgeCards