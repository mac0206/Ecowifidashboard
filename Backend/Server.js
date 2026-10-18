const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());


const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL || 'admin@ecowifi.com';

const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD || 'admin123';

// ADMIN LOGIN ENDPOINT
app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body;

  if (
    typeof email !== 'string' ||
    typeof password !== 'string'
  ) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required.',
    });
  }

  if (
    email.trim().toLowerCase() ===
      ADMIN_EMAIL.toLowerCase() &&
    password === ADMIN_PASSWORD
  ) {
    return res.json({
      success: true,
      message: 'Login successful.',
    });
  }

  return res.status(401).json({
    success: false,
    message: 'Invalid email or password.',
  });
});


// Initialize SQLite Database
const path = require('path');

const db = new sqlite3.Database(
  path.join(__dirname, 'vending_data.db'),
  (err) => {
    if (err) {
      console.error('SQLite connection failed:', err.message);
    } else {
      console.log('Connected to vending_data.db');
    }
  }
);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mac_address TEXT,
      bottles_deposited INTEGER,
      minutes_earned INTEGER,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// Global state for prototype: Bottles waiting to be claimed
let pendingBottles = 0; 

// ENDPOINT 1: ESP32 Hardware calls this when a bottle drops
app.post('/api/hardware/drop', (req, res) => {
  pendingBottles += 1; 
  console.log(`[HARDWARE] Bottle detected! Pending: ${pendingBottles}`);
  res.json({ success: true, pendingBottles });
});

// ENDPOINT 2: React Portal polls this to update the UI
app.get('/api/portal/check-pending', (req, res) => {
  res.json({ pendingBottles });
});

// ENDPOINT 3: React Portal calls this when user clicks "Connect"
app.post('/api/portal/claim', (req, res) => {
  const { mac_address } = req.body;
  
  if (pendingBottles === 0) {
    return res.status(400).json({ error: "No bottles deposited yet." });
  }

  const minutesEarned = pendingBottles * 15; // 15 mins per bottle
  const sql = `INSERT INTO sessions (mac_address, bottles_deposited, minutes_earned) VALUES (?, ?, ?)`;
  
  db.run(sql, [mac_address, pendingBottles, minutesEarned], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    
    pendingBottles = 0; // Reset after successful claim
    console.log(`[NETWORK] User ${mac_address} granted ${minutesEarned} mins.`);
    
    // In production, trigger Nodogsplash here: exec(`ndsctl auth ${mac_address}`);
    res.json({ success: true, minutes: minutesEarned });
  });
});

// ENDPOINT 4: React Admin Dashboard gets stats
app.get('/api/admin/stats', (req, res) => {
  db.get(`SELECT COUNT(*) as users, SUM(bottles_deposited) as total_bottles FROM sessions`, [], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({
      totalUsers: row.users || 0,
      totalBottles: row.total_bottles || 0,
      systemStatus: "Online"
    });
  });
});

app.listen(3000, '0.0.0.0', () => {
  console.log('Backend API running on http://localhost:3000');
});