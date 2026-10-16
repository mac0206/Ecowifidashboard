import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Portal from './Portal';
import './App.css';

interface SystemStats {
  totalUsers: number;
  totalBottles: number;
  systemStatus: string;
}

function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [stats, setStats] = useState<SystemStats>({ 
    totalUsers: 0, 
    totalBottles: 0, 
    systemStatus: 'Loading...' 
  });

  const fetchStats = () => {
    fetch('http://localhost:3000/api/admin/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(() => setStats(prev => ({ ...prev, systemStatus: 'Offline' })));
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Eco-Wi-Fi Admin Panel</h1>
        <div>
          <span style={{ marginRight: '20px', color: stats.systemStatus === 'Online' ? '#2ecc71' : '#e74c3c' }}>
            Status: {stats.systemStatus}
          </span>
          <button style={{ backgroundColor: '#e74c3c' }} onClick={onLogout}>Logout</button>
        </div>
      </header>
      <main className="metrics-grid">
        <div className="metric-card">
          <h3>Total PET Bottles</h3>
          <p className="metric-value">{stats.totalBottles}</p>
        </div>
        <div className="metric-card">
          <h3>Total Users Connected</h3>
          <p className="metric-value">{stats.totalUsers}</p>
        </div>
        <div className="metric-card">
          <h3>Solar Battery</h3>
          <p className="metric-value">92%</p>
          <progress value="92" max="100"></progress>
        </div>
      </main>C
    </div>
  );
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (password === 'admin123') onLogin();
    else setError('Incorrect password');
  };

  return (
    <div className="portal-card" style={{ marginTop: '100px' }}>
      <h2>Admin Login</h2>
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input 
          type="password" 
          placeholder="Enter Admin Password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: '10px', fontSize: '16px', borderRadius: '5px', border: '1px solid #ccc' }}
        />
        {error && <p style={{ color: '#e74c3c', margin: 0 }}>{error}</p>}
        <button className="btn-primary" type="submit">Login</button>
      </form>
    </div>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Portal />} />
        <Route 
          path="/admin" 
          element={
            isAuthenticated ? 
              <AdminDashboard onLogout={() => setIsAuthenticated(false)} /> : 
              <LoginScreen onLogin={() => setIsAuthenticated(true)} />
          } 
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}