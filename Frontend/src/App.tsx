import { useState } from 'react'
import './App.css'

function App() {
  // Mock data for the capstone prototype
  const [bottlesCollected, setBottlesCollected] = useState(142);
const activeUsers = 8;
const batteryLevel = 85;
const systemStatus = "Online";

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Eco-Wi-Fi Vendo Admin</h1>
        <p>Status: <span style={{ color: systemStatus === "Online" ? "#2ecc71" : "#e74c3c" }}>{systemStatus}</span></p>
      </header>

      <main className="metrics-grid">
        <div className="metric-card">
          <h3>PET Bottles Collected</h3>
          <p className="metric-value">{bottlesCollected}</p>
          <button onClick={() => setBottlesCollected(bottlesCollected + 1)}>Simulate Insertion</button>
        </div>

        <div className="metric-card">
          <h3>Active Wi-Fi Sessions</h3>
          <p className="metric-value">{activeUsers}</p>
        </div>

        <div className="metric-card">
          <h3>Solar Battery Level</h3>
          <p className="metric-value">{batteryLevel}%</p>
          <progress value={batteryLevel} max="100"></progress>
        </div>
      </main>
    </div>
  )
}

export default App
