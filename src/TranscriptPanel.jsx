function TranscriptPanel({ transcript }) {
  return (
    <div className="transcript-box">
      <h2>Live Transcript</h2>
      {transcript.map((line, index) => (
        <p key={index}>
          <strong>{line.speaker}</strong>: {line.text}
        </p>
      ))}
    </div>
  )
}

export default TranscriptPanel