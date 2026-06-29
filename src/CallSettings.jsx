import { useState } from 'react'

function CallSettings({ callType, onCallTypeChange }) {
  const [listening, setListening] = useState(true)
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
        onClick={() => setListening(!listening)}
      >
        {listening ? 'Stop listening' : 'Start listening'}
      </button>
    </div>
  )
}

export default CallSettings