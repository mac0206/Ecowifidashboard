
import { useState, useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import Portal from './Portal';
import './App.css';

interface SystemStats {
  totalUsers: number;
  totalBottles: number;
  systemStatus: string;
}

function AdminDashboard({
  onLogout,
}: {
  onLogout: () => void;
}) {
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    totalBottles: 0,
    systemStatus: 'Loading...',
  });

  const fetchStats = async () => {
    try {
      const response = await fetch(
        'http://localhost:3000/api/admin/stats'
      );

      if (!response.ok) {
        throw new Error('Failed to fetch statistics');
      }

      const data = await response.json();
      setStats(data);
    } catch {
      setStats((prev) => ({
        ...prev,
        systemStatus: 'Offline',
      }));
    }
  };

  useEffect(() => {
    fetchStats();

    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const isOnline = stats.systemStatus === 'Online';

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="admin-brand">
          <div className="admin-logo">E</div>
          <div>
            <h1>Eco-Wi-Fi Vendo</h1>
            <p>Administrator Dashboard</p>
          </div>
        </div>

        <div className="admin-header-actions">
          <div className="admin-status">
            <span
              className={`status-dot ${
                isOnline ? 'online' : 'offline'
              }`}
            />
            {stats.systemStatus}
          </div>

          <button
            className="logout-button"
            onClick={onLogout}
          >
            Logout
          </button>
        </div>
      </header>

      <main className="admin-main">
        <section className="admin-welcome">
          <div>
            <span className="admin-eyebrow">
              SYSTEM OVERVIEW
            </span>
            <h2>Welcome, Administrator!</h2>
            <p>
              Monitor your Eco-Wi-Fi machine and recycling
              activity in one place.
            </p>
          </div>

          <button
            className="refresh-button"
            onClick={fetchStats}
          >
            ↻ Refresh Data
          </button>
        </section>

        <section className="admin-metrics">
          <article className="admin-card">
            <div className="metric-top">
              <div className="metric-icon bottle-icon">
                ♻
              </div>
              <span className="metric-label">
                RECYCLING
              </span>
            </div>

            <h3>Total PET Bottles</h3>
            <p className="metric-value">
              {stats.totalBottles}
            </p>
            <p className="metric-description">
              Bottles collected by the machine
            </p>
          </article>

          <article className="admin-card">
            <div className="metric-top">
              <div className="metric-icon users-icon">
                ♙
              </div>
              <span className="metric-label">
                CONNECTIVITY
              </span>
            </div>

            <h3>Connected Users</h3>
            <p className="metric-value">
              {stats.totalUsers}
            </p>
            <p className="metric-description">
              Users reported by your system
            </p>
          </article>

          <article className="admin-card">
            <div className="metric-top">
              <div className="metric-icon battery-icon">
                ⚡
              </div>
              <span className="metric-label">
                POWER
              </span>
            </div>

            <h3>Solar Battery</h3>
            <p className="metric-value">92%</p>
            <div className="battery-track">
              <div
                className="battery-fill"
                style={{ width: '92%' }}
              />
            </div>
            <p className="metric-description">
              Demo value — connect a real sensor to update it
            </p>
          </article>
        </section>

        <section className="admin-lower-grid">
          <article className="admin-panel">
            <div className="panel-heading">
              <div>
                <h3>Machine Status</h3>
                <p>Current system condition</p>
              </div>
              <span
                className={`status-badge ${
                  isOnline ? 'badge-online' : 'badge-offline'
                }`}
              >
                {stats.systemStatus}
              </span>
            </div>

            <div className="machine-status-row">
              <span>Wi-Fi System</span>
              <strong>{stats.systemStatus}</strong>
            </div>

            <div className="machine-status-row">
              <span>Statistics API</span>
              <strong>
                {stats.systemStatus === 'Offline'
                  ? 'Unavailable'
                  : 'Responding'}
              </strong>
            </div>

            <div className="machine-status-row">
              <span>Battery Monitoring</span>
              <strong className="demo-label">
                Demo Data
              </strong>
            </div>
          </article>

          <article className="admin-panel">
            <div className="panel-heading">
              <div>
                <h3>Quick Actions</h3>
                <p>Manage your dashboard</p>
              </div>
            </div>

            <button
              className="action-button"
              onClick={fetchStats}
            >
              <span>↻</span>
              Refresh Statistics
            </button>

            <button
              className="action-button"
              onClick={() =>
                window.open('/', '_self')
              }
            >
              <span>⌂</span>
              View Wi-Fi Portal
            </button>
          </article>
        </section>

        <footer className="admin-footer">
          <span>Eco-Wi-Fi Vendo</span>
          <span>Recycling for a greener community</span>
        </footer>
      </main>
    </div>
  );
}


function LoginScreen({
  onLogin,
}: {
  onLogin: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (
      email.trim().toLowerCase() === 'admin@ecowifi.com' &&
      password === 'admin123'
    ) {
      setError('');
      onLogin();
    } else {
      setError('Invalid email or password.');
    }
  };

  return (
    <div className="admin-page login-page">
      <form
        className="admin-login-card"
        onSubmit={handleLogin}
      >
        <div className="login-logo">E</div>

        <h1>Eco-Wi-Fi Vendo</h1>
        <p className="login-subtitle">
          Admin Panel Login
        </p>

        <label htmlFor="admin-email">
          Email Address
        </label>

        <input
          id="admin-email"
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          required
        />

        <label htmlFor="admin-password">
          Password
        </label>

        <input
          id="admin-password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        {error && (
          <p className="login-error">{error}</p>
        )}

        <button className="login-button" type="submit">
          Login
        </button>

        <p className="login-footer">
          Eco-Wi-Fi · Smart Recycling System
        </p>
      </form>
    </div>
  );
}


export default function App() {
  const [isAuthenticated, setIsAuthenticated] =
    useState(false);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Portal />} />

        <Route
          path="/admin"
          element={
            isAuthenticated ? (
              <AdminDashboard
                onLogout={() => setIsAuthenticated(false)}
              />
            ) : (
              <LoginScreen
                onLogin={() => setIsAuthenticated(true)}
              />
            )
          }
        />

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}
