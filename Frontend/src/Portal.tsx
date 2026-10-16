import { useState, useEffect } from 'react';
import './Portal.css';

export default function Portal() {
  const [macAddress] = useState<string>("AA:BB:CC:11:22"); 
  const [pendingBottles, setPendingBottles] = useState<number>(0);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [timeEarned, setTimeEarned] = useState<number>(0);
  
  // Add state to control the modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

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

  return (
    <div className="portal-card">
      <h2>Eco-Wi-Fi Vendo</h2>
      <p className="subtitle">Recycle PET bottles to claim free internet time!</p>
      
      {!isConnected ? (
        <>
          <div className="status-box">
            <p><strong>Status:</strong> Waiting for bottle...</p>
            <p><strong>Bottles Detected:</strong> <span className="highlight">{pendingBottles}</span></p>
            <p><strong>Times Available:</strong> <span className="highlight">{pendingBottles * 15} Mins</span></p>
          </div>
          
          <div className="action-group">
            {/* The "Insert Bottle Here" button */}
            <button className="btn-secondary" onClick={() => setIsModalOpen(true)}>
              Insert Bottle Here
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

      {/* The Floating Screen Modal */}
      {isModalOpen && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3 style={{ marginTop: 0, color: '#333' }}>Inserting Bottles...</h3>
            
            {/* Values match the main dashboard */}
            <p style={{ color: '#333' }}>How many bottle inserted: <strong>{pendingBottles}</strong></p>
            <p style={{ color: '#333' }}>Time will get: <strong>{pendingBottles * 15} Mins</strong></p>
            
            <div style={{ marginTop: '20px' }}>
              <button 
                onClick={() => setIsModalOpen(false)} 
                style={doneButtonStyle}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Styles for the modal
const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000
};

const modalStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  padding: '24px',
  borderRadius: '8px',
  textAlign: 'center',
  minWidth: '300px',
  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
};

const doneButtonStyle: React.CSSProperties = {
  backgroundColor: '#10b981',
  color: 'white',
  border: 'none',
  padding: '8px 24px',
  borderRadius: '4px',
  fontWeight: 'bold',
  cursor: 'pointer'
};