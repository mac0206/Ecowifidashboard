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

  // NEW LOGIC: When clicking "Done Inserting", close modal and connect automatically
  const handleDoneInserting = () => {
    setIsModalOpen(false);
    if (pendingBottles > 0) {
      handleConnect();
    }
  };

  // Helper to format minutes into "1 HR. 15 MIN." format
  const formatTime = (totalMinutes: number) => {
    if (totalMinutes === 0) return "0 MIN.";
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h > 0) return `${h} HR. ${m} MIN.`;
    return `${m} MIN.`;
  };

  return (
    <div className="portal-wrapper">
      <div className="portal-card" style={{ padding: '30px 20px' }}>
        {/* Header styling to match the reference layout */}
        <h2 style={{ color: '#064e3b', marginBottom: '5px' }}>Eco-Wi-Fi Vendo</h2>
        <div style={{ width: '100%', height: '120px', backgroundColor: '#e5e7eb', borderRadius: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
           {/* You can replace this div with an <img> tag for an ad or banner later */}
           Banner Image Area
        </div>

        {!isConnected ? (
          <>
            {/* Disconnected State */}
            <h3 style={{ color: '#ef4444', fontSize: '26px', margin: '10px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span style={{ fontSize: '30px' }}>❌</span> Disconnected
            </h3>
            <p style={{ fontSize: '13px', color: '#3b82f6', margin: '5px 0' }}>IP: 10.0.0.89 | MAC: {macAddress}</p>
            <p style={{ fontSize: '13px', color: '#3b82f6', fontWeight: 'bold', margin: '5px 0' }}>BOTTLES INSERTED: {pendingBottles}</p>
            
            <div style={{ margin: '20px 0' }}>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>REMAINING TIME:</p>
              <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#374151', margin: '5px 0' }}>-</p>
            </div>
            
            <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
              Insert Bottle Here
            </button>
          </>
        ) : (
          <>
            {/* Connected State */}
            <h3 style={{ color: '#10b981', fontSize: '26px', margin: '10px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span style={{ fontSize: '30px' }}>📶</span> Connected
            </h3>
            <p style={{ fontSize: '13px', color: '#3b82f6', margin: '5px 0' }}>IP: 10.0.0.89 | MAC: {macAddress}</p>
            <p style={{ fontSize: '13px', color: '#3b82f6', fontWeight: 'bold', margin: '5px 0' }}>BOTTLES INSERTED: {pendingBottles}</p>
            
            <div style={{ margin: '20px 0' }}>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>REMAINING TIME:</p>
              <h2 style={{ color: '#3b82f6', margin: '5px 0', fontSize: '28px' }}>{formatTime(timeEarned)}</h2>
            </div>
            
            {/* Allow adding more time while connected */}
            <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
              Insert More Bottles
            </button>
          </>
        )}

        {/* The Piso-WiFi Style Modal */}
        {isModalOpen && (
          <div style={overlayStyle}>
            <div style={modalStyle}>
              <h3 style={{ marginTop: 0, color: '#3b82f6', fontSize: '26px', fontWeight: 'normal' }}>Please Insert Bottle</h3>
              <p style={{ color: '#374151', fontSize: '15px', marginBottom: '15px' }}>Waiting for bottles...</p>
              
              {/* Fake Progress Bar matching the Piso Wifi aesthetic */}
              <div style={{ width: '100%', height: '24px', backgroundColor: '#3b82f6', borderRadius: '4px', marginBottom: '8px' }}></div>
              <div style={{ display: 'flex', height: '6px', gap: '4px', marginBottom: '24px' }}>
                <div style={{flex: 1, backgroundColor: '#a7f3d0', borderRadius: '2px'}}></div>
                <div style={{flex: 1, backgroundColor: '#fde68a', borderRadius: '2px'}}></div>
                <div style={{flex: 1, backgroundColor: '#fdba74', borderRadius: '2px'}}></div>
                <div style={{flex: 1, backgroundColor: '#fca5a5', borderRadius: '2px'}}></div>
                <div style={{flex: 1, backgroundColor: '#d8b4fe', borderRadius: '2px'}}></div>
                <div style={{flex: 1, backgroundColor: '#bfdbfe', borderRadius: '2px'}}></div>
              </div>
              
              {/* Detailed Breakdown Box */}
              <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', textAlign: 'left', marginBottom: '24px' }}>
                <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>🕒</span> 
                  <span style={{ color: '#374151', fontWeight: 'bold' }}>Time:</span> 
                  <span style={{ color: '#374151' }}>{formatTime(pendingBottles * 15)}</span>
                </div>
                <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>♻️</span> 
                  <span style={{ color: '#374151', fontWeight: 'bold' }}>Total Bottles:</span> 
                  <span style={{ color: '#374151' }}>{pendingBottles} pcs</span>
                </div>
              </div>
              
              {/* Red Done Button */}
              <button 
                onClick={handleDoneInserting} 
                style={doneButtonStyle}
              >
                Done Inserting
              </button>
            </div>
          </div>
        )}
      </div>
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
  padding: '30px 20px',
  borderRadius: '12px',
  textAlign: 'center',
  minWidth: '340px',
  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
};

const doneButtonStyle: React.CSSProperties = {
  backgroundColor: '#ef4444', // Red color to match "Done Paying" from the reference
  color: 'white',
  border: 'none',
  padding: '16px',
  borderRadius: '6px',
  fontWeight: 'normal',
  fontSize: '18px',
  cursor: 'pointer',
  width: '100%',
  transition: 'background-color 0.3s ease'
};