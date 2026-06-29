import { useState } from 'react'

function CallSettings({ callType, onCallTypeChange, isListening, onListeningChange }) {
  const options = ['Sales discovery', 'Requirements', 'Internal']

  return (
    <div className="call-settings">
      <h2>Call Settings</h2>
      <div className="call-type-row">
        {options.map((option) => (
          <button
            key={option}
            className={`chip ${callType === option ? 'chip-active' : ''}`}
            onClick={() => onCallTypeChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
      <button
        className="listen-button"
        onClick={() => onListeningChange(!isListening)}
        style={{
          backgroundColor: isListening ? '#ef4444' : '#22c55e',
          color: 'white',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: 'bold',
          width: '100%',
          marginTop: '8px'
        }}
      >
        {isListening ? '⏹ Stop listening' : '🎤 Start listening'}
      </button>
    </div>
  )
}

export default CallSettings