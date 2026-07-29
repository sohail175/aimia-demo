import { useState } from 'react'
import AimiaLayout from './AimiaLayout'
import CallHistory from './CallHistory'
import './App.css'

function App() {
  const [currentView, setCurrentView] = useState('live')
  return currentView === 'live'
    ? <AimiaLayout onViewChange={setCurrentView} />
    : <CallHistory onViewChange={setCurrentView} />
}

export default App