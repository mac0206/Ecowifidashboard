
import { useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import Portal from './Portal';
import './App.css';

const API = 'http://localhost:3000/api';

type Stats = {
  totalUsers: number;
  totalBottles: number;
  totalMinutes: number;
  systemStatus: string;
};

type Settings = {
  email: string;
  minutesPerBottle: number;
};

async function adminRequest(
  token: string,
  endpoint: string,
  options: RequestInit = {}
) {
  return fetch(`${API}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
}

function AdminLogin({ onLogin }: {
  onLogin: (token: string, email: string) => void;
}) {
  const [email, setEmail] = useState('admin@ecowifi.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success || !data.token) {
        setError(data.message || 'Login failed.');
        return;
      }

      localStorage.setItem('adminToken', data.token);
      onLogin(data.token, data.admin.email);
      navigate('/admin', { replace: true });
    } catch {
      setError('Cannot connect to the backend. Check that it is running.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleLogin}>
        <div className="brand-mark">♻</div>
        <h1>Eco WiFi</h1>
        <p className="muted">Administrator Login</p>

        <label htmlFor="login-email">Email</label>
        <input
          id="login-email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label htmlFor="login-password">Password</label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <p className="error-message">{error}</p>}

        <button className="primary-button" disabled={loading}>
          {loading ? 'Logging in...' : 'Log In'}
        </button>
        <p className="login-hint">Eco WiFi Administration</p>
      </form>
    </div>
  );
}

function AdminDashboard({
  token,
  onLogout,
  onTokenUpdate,
}: {
  token: string;
  onLogout: () => void;
  onTokenUpdate: (token: string, email: string) => void;
}) {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalBottles: 0,
    totalMinutes: 0,
    systemStatus: 'Checking...',
  });

  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    email: '',
    minutesPerBottle: 15,
  });
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [settingsMessage, setSettingsMessage] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const response = await adminRequest(token, '/admin/stats');

      if (response.status === 401) {
        onLogout();
        return;
      }

      if (!response.ok) return;

      const data = await response.json();
      setStats(data);
    } catch {
      setStats((old) => ({ ...old, systemStatus: 'Offline' }));
    }
  }, [token, onLogout]);

  useEffect(() => {
    void loadStats();
    const interval = window.setInterval(() => {
      void loadStats();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [loadStats]);

  async function openSettings() {
    setMenuOpen(false);
    setSettingsError('');
    setSettingsMessage('');

    try {
      const response = await adminRequest(token, '/admin/settings');

      if (response.status === 401) {
        onLogout();
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        setSettingsError(data.message || 'Unable to load settings.');
        return;
      }

      setSettings({
        email: data.email,
        minutesPerBottle: data.minutesPerBottle,
      });
      setCurrentPassword('');
      setNewPassword('');
      setSettingsOpen(true);
    } catch {
      setSettingsError('Cannot connect to the backend.');
      setSettingsOpen(true);
    }
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSettingsError('');
    setSettingsMessage('');
    setSaving(true);

    try {
      const response = await adminRequest(token, '/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword,
          email: settings.email,
          newPassword,
          minutesPerBottle: settings.minutesPerBottle,
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        if (data.message?.toLowerCase().includes('current password')) {
          setSettingsError(data.message);
        } else {
          onLogout();
        }
        return;
      }

      if (!response.ok) {
        setSettingsError(data.message || 'Could not save settings.');
        return;
      }

      localStorage.setItem('adminToken', data.token);
      onTokenUpdate(data.token, data.email);

      setSettings({
        email: data.email,
        minutesPerBottle: data.minutesPerBottle,
      });
      setCurrentPassword('');
      setNewPassword('');
      setSettingsMessage('Settings saved successfully.');
      void loadStats();
    } catch {
      setSettingsError('Cannot connect to the backend.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div className="header-brand">
          <span className="brand-icon">♻</span>
          <div>
            <h1>Eco WiFi</h1>
            <p>Administrator Dashboard</p>
          </div>
        </div>

        <div className="header-menu-wrap">
          <button
            className="menu-button"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span></span><span></span><span></span>
          </button>

          {menuOpen && (
            <div className="dropdown-menu">
              <button onClick={() => void openSettings()}>
                <span>⚙</span> Settings
              </button>
              <button onClick={onLogout}>
                <span>↪</span> Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="dashboard-main">
        <div className="welcome-row">
          <div>
            <h2>Dashboard Overview</h2>
            <p>Monitor your Eco WiFi bottle rewards.</p>
          </div>
          <span className={`status-pill ${stats.systemStatus === 'Online' ? 'online' : ''}`}>
            <span className="status-dot"></span>
            {stats.systemStatus}
          </span>
        </div>

        <div className="metrics-grid">
          <article className="metric-card">
            <div className="metric-icon bottle-icon">♻</div>
            <div>
              <p>Total PET Bottles</p>
              <h3>{Number(stats.totalBottles).toLocaleString()}</h3>
              <span className="metric-description">Bottles redeemed</span>
            </div>
          </article>

          <article className="metric-card">
            <div className="metric-icon device-icon">⌁</div>
            <div>
              <p>Connected Devices</p>
              <h3>{Number(stats.totalUsers).toLocaleString()}</h3>
              <span className="metric-description">Distinct devices in session history</span>
            </div>
          </article>
        </div>

        <section className="info-panel">
          <div className="panel-symbol">i</div>
          <div>
            <h3>Reward Settings</h3>
            <p>
              Each PET bottle earns <strong>{settings.minutesPerBottle} minutes</strong>
              {' '}of WiFi access. Open Settings in the menu to change the rate.
            </p>
          </div>
        </section>

        <div className="dashboard-footer">
          <span>♻ Eco WiFi Recycling System</span>
          <span>Dashboard refreshes every 5 seconds</span>
        </div>
      </main>

      {settingsOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSettingsOpen(false);
          }}
        >
          <section
            className="settings-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
          >
            <div className="modal-header">
              <div>
                <span className="modal-eyebrow">ADMINISTRATION</span>
                <h2 id="settings-title">Settings</h2>
                <p>Update your account and bottle reward rate.</p>
              </div>
              <button
                className="close-button"
                aria-label="Close settings"
                onClick={() => setSettingsOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={saveSettings}>
              <label htmlFor="settings-email">Admin Email</label>
              <input
                id="settings-email"
                type="email"
                value={settings.email}
                onChange={(e) =>
                  setSettings({ ...settings, email: e.target.value })
                }
                required
              />

              <label htmlFor="settings-new-password">New Password</label>
              <input
                id="settings-new-password"
                type="password"
                autoComplete="new-password"
                placeholder="Leave blank to keep current password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
              />
              <p className="field-hint">Use at least 8 characters if changing it.</p>

              <div className="form-divider"></div>

              <label htmlFor="settings-rate">Minutes per PET Bottle</label>
              <div className="rate-input-wrap">
                <input
                  id="settings-rate"
                  type="number"
                  min={1}
                  max={1440}
                  step={1}
                  value={settings.minutesPerBottle}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      minutesPerBottle: Number(e.target.value),
                    })
                  }
                  required
                />
                <span>minutes / bottle</span>
              </div>

              <div className="reward-preview">
                <span>Example reward</span>
                <strong>3 bottles = {settings.minutesPerBottle * 3} minutes</strong>
              </div>

              <label htmlFor="settings-current-password">Current Password</label>
              <input
                id="settings-current-password"
                type="password"
                autoComplete="current-password"
                placeholder="Required to save changes"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />

              {settingsError && <p className="error-message">{settingsError}</p>}
              {settingsMessage && <p className="success-message">{settingsMessage}</p>}

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setSettingsOpen(false)}
                >
                  Cancel
                </button>
                <button className="primary-button" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

function AdminRoute() {
  const [token, setToken] = useState(
    () => localStorage.getItem('adminToken') || ''
  );
  const [adminEmail, setAdminEmail] = useState('');

  const logout = useCallback(() => {
    localStorage.removeItem('adminToken');
    setToken('');
    setAdminEmail('');
  }, []);

  function updateToken(newToken: string, email: string) {
    setToken(newToken);
    setAdminEmail(email);
  }

  if (!token) {
    return <AdminLogin onLogin={updateToken} />;
  }

  return (
    <AdminDashboard
      token={token}
      onLogout={logout}
      onTokenUpdate={updateToken}
    />
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Portal />} />
        <Route path="/admin" element={<AdminRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
