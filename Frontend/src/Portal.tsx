import { useState, useEffect } from 'react';
import './Portal.css';

export default function Portal() {
  const [macAddress] = useState<string>("AA:BB:CC:11:22"); 
  const [pendingBottles, setPendingBottles] = useState<number>(0);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [timeEarned, setTimeEarned] = useState<number>(0);

  useEffect(() => {
    if (isConnected) return;
    
    const interval = setInterval(() => {
      fetch('http://localhost:3000/api/portal/check-pending')
        .then(res => res.json())
        .then(data => {
          if (typeof data.pendingBottles === 'number') {
            setPendingBottles(data.pendingBottles);
          }
        })
        .catch(err => console.error("Error fetching bottle count", err));
    }, 2000); 

    return () => clearInterval(interval);
  }, [isConnected]);

  const handleConnect = () => {
    fetch('http://localhost:3000/api/portal/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mac_address: macAddress })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setTimeEarned(data.minutes);
        setIsConnected(true);
      }
    })
    .catch(err => console.error("Error connecting", err));
  };

  // Simulate a bottle drop (for testing on PC without the ESP32 hardware)
  const simulateHardwareDrop = () => {
    fetch('http://localhost:3000/api/hardware/drop', { method: 'POST' });
  };

  return (
    <div className="portal-card">
      <h2>Eco-Wi-Fi Vendo</h2>
      <p className="subtitle">Recycle PET bottles to claim free internet time!</p>
      
      {!isConnected ? (
        <>
          <div className="status-box">
            <p><strong>Status:</strong> Waiting for bottle...</p>
            <p><strong>Bottles Detected:</strong> <span className="highlight">{pendingBottles}</span></p>
            <p><strong>Time Available:</strong> <span className="highlight">{pendingBottles * 15} Mins</span></p>
          </div>
          
          <div className="action-group">
            <button className="btn-secondary" onClick={simulateHardwareDrop}>
              [Test] Simulate Bottle Drop
            </button>
            <button 
              className="btn-primary" 
              disabled={pendingBottles === 0} 
              onClick={handleConnect}
            >
              {pendingBottles > 0 ? `Claim ${pendingBottles * 15} Mins & Connect` : 'Insert Bottle'}
            </button>
          </div>
        </>
      ) : (
        <div className="success-banner">
          🎉 Connected! Enjoy your {timeEarned} minutes of Wi-Fi.
        </div>
      )}
    </div>
  );
}