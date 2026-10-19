
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();

app.use(express.json());
app.use(cors());

// Connect to the database beside this server.js file
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

// Default account for first-time setup
const DEFAULT_ADMIN_EMAIL =
    process.env.ADMIN_EMAIL || 'admin@ecowifi.com';

const DEFAULT_ADMIN_PASSWORD =
    process.env.ADMIN_PASSWORD || 'admin123';

// Initialize database tables and default admin
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            mac_address TEXT,
            bottles_deposited INTEGER DEFAULT 0,
            minutes_earned INTEGER DEFAULT 0,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) console.error('Sessions table error:', err.message);
    });

    db.run(`
        CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL COLLATE NOCASE UNIQUE,
            password_hash TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error('Admins table error:', err.message);
            return;
        }

        db.get('SELECT id FROM admins LIMIT 1', [], (err, row) => {
            if (err) {
                console.error('Admin lookup failed:', err.message);
                return;
            }

            // Do not overwrite an existing admin
            if (row) {
                console.log('Admin account already exists.');
                return;
            }

            bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10, (err, hash) => {
                if (err) {
                    console.error('Password hashing failed:', err.message);
                    return;
                }

                db.run(
                    'INSERT INTO admins (email, password_hash) VALUES (?, ?)',
                    [DEFAULT_ADMIN_EMAIL, hash],
                    function (err) {
                        if (err) {
                            console.error('Admin creation failed:', err.message);
                            return;
                        }

                        console.log('Default admin account created.');
                        console.log('Email:', DEFAULT_ADMIN_EMAIL);
                    }
                );
            });
        });
    });
});

// ADMIN LOGIN: Check credentials against SQLite
app.post('/api/admin/login', (req, res) => {
    const { email, password } = req.body || {};

    if (
        typeof email !== 'string' ||
        typeof password !== 'string'
    ) {
        return res.status(400).json({
            success: false,
            message: 'Email and password are required.'
        });
    }

    db.get(
        'SELECT id, email, password_hash FROM admins WHERE email = ?',
        [email.trim()],
        (err, admin) => {
            if (err) {
                console.error('Login database error:', err.message);
                return res.status(500).json({
                    success: false,
                    message: 'Database error.'
                });
            }

            if (!admin) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password.'
                });
            }

            bcrypt.compare(password, admin.password_hash, (err, match) => {
                if (err) {
                    return res.status(500).json({
                        success: false,
                        message: 'Password verification failed.'
                    });
                }

                if (!match) {
                    return res.status(401).json({
                        success: false,
                        message: 'Invalid email or password.'
                    });
                }

                return res.json({
                    success: true,
                    message: 'Login successful.',
                    admin: {
                        id: admin.id,
                        email: admin.email
                    }
                });
            });
        }
    );
});

// Number of bottles waiting to be claimed
let pendingBottles = 0;

// ESP32: Called when a bottle drops
app.post('/api/hardware/drop', (req, res) => {
    pendingBottles += 1;

    console.log(
        `[HARDWARE] Bottle detected! Pending: ${pendingBottles}`
    );

    res.json({ success: true, pendingBottles });
});

// Portal: Check pending bottles
app.get('/api/portal/check-pending', (req, res) => {
    res.json({ pendingBottles });
});

// Portal: Claim WiFi reward
app.post('/api/portal/claim', (req, res) => {
    const { mac_address } = req.body || {};

    if (pendingBottles === 0) {
        return res.status(400).json({
            error: 'No bottles deposited yet.'
        });
    }

    if (typeof mac_address !== 'string' || !mac_address.trim()) {
        return res.status(400).json({
            error: 'MAC address is required.'
        });
    }

    const bottlesToClaim = pendingBottles;
    const minutesEarned = bottlesToClaim * 15;

    const sql = `
        INSERT INTO sessions
        (mac_address, bottles_deposited, minutes_earned)
        VALUES (?, ?, ?)
    `;

    db.run(
        sql,
        [mac_address.trim(), bottlesToClaim, minutesEarned],
        function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            pendingBottles -= bottlesToClaim;

            console.log(
                `[NETWORK] User ${mac_address} granted ${minutesEarned} mins.`
            );

            res.json({
                success: true,
                minutes: minutesEarned
            });
        }
    );
});

// Admin dashboard: Get statistics
app.get('/api/admin/stats', (req, res) => {
    db.get(`
        SELECT
            COUNT(*) AS total_users,
            COALESCE(SUM(bottles_deposited), 0) AS total_bottles,
            COALESCE(SUM(minutes_earned), 0) AS total_minutes
        FROM sessions
    `, [], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        res.json({
            totalUsers: row.total_users,
            totalBottles: row.total_bottles,
            totalMinutes: row.total_minutes,
            systemStatus: 'Online'
        });
    });
});

app.listen(3000, '0.0.0.0', () => {
    console.log('Backend API running on http://localhost:3000');
});
