
require('dotenv').config();

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('Set JWT_SECRET to at least 32 characters in Backend/.env');
}

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

app.use(cors());
app.use(express.json({ limit: '10kb' }));

const db = new sqlite3.Database(
    path.join(__dirname, 'vending_data.db'),
    (err) => {
        if (err) console.error('Database error:', err.message);
        else console.log('Connected to vending_data.db');
    }
);

function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) return reject(err);
            resolve({ id: this.lastID, changes: this.changes });
        });
    });
}

function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

function all(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
}

async function initializeDatabase() {
    await run(`
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            mac_address TEXT,
            bottles_deposited INTEGER DEFAULT 0,
            minutes_earned INTEGER DEFAULT 0,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await run(`
        CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL COLLATE NOCASE UNIQUE,
            password_hash TEXT NOT NULL,
            token_version INTEGER NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    const columns = await all('PRAGMA table_info(admins)');

    if (!columns.some((column) => column.name === 'token_version')) {
        await run(
            'ALTER TABLE admins ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0'
        );
    }

    await run(`
        CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            minutes_per_bottle INTEGER NOT NULL DEFAULT 15
        )
    `);

    await run(`
        INSERT OR IGNORE INTO settings (id, minutes_per_bottle)
        VALUES (1, 15)
    `);

    const existingAdmin = await get('SELECT id FROM admins LIMIT 1');

    if (!existingAdmin) {
        const email = process.env.ADMIN_EMAIL || 'admin@ecowifi.com';
        const password = process.env.ADMIN_PASSWORD || 'admin123';
        const passwordHash = await bcrypt.hash(password, 12);

        await run(
            'INSERT INTO admins (email, password_hash) VALUES (?, ?)',
            [email.trim(), passwordHash]
        );

        console.log('Initial administrator account created.');
        console.log('Initial email:', email);
        console.log('Change the default password after logging in.');
    } else {
        console.log('Existing administrator account found.');
    }
}

function createToken(admin) {
    return jwt.sign(
        {
            id: admin.id,
            tokenVersion: admin.token_version
        },
        JWT_SECRET,
        { expiresIn: '8h' }
    );
}

async function requireAdmin(req, res, next) {
    const authorization = req.headers.authorization || '';
    const [scheme, token] = authorization.split(' ');

    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({
            success: false,
            message: 'Please log in first.'
        });
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET);

        const admin = await get(
            `SELECT id, email, token_version
             FROM admins WHERE id = ?`,
            [payload.id]
        );

        if (!admin || admin.token_version !== payload.tokenVersion) {
            return res.status(401).json({
                success: false,
                message: 'Your session has expired. Please log in again.'
            });
        }

        req.admin = admin;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token.'
        });
    }
}

// ADMIN LOGIN
app.post('/api/admin/login', async (req, res) => {
    try {
        const { email, password } = req.body || {};

        if (
            typeof email !== 'string' ||
            typeof password !== 'string' ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required.'
            });
        }

        const admin = await get(
            `SELECT id, email, password_hash, token_version
             FROM admins WHERE email = ?`,
            [email.trim()]
        );

        if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        res.json({
            success: true,
            message: 'Login successful.',
            token: createToken(admin),
            admin: {
                id: admin.id,
                email: admin.email
            }
        });
    } catch (error) {
        console.error('Login error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Unable to log in.'
        });
    }
});

// GET ADMIN SETTINGS
app.get('/api/admin/settings', requireAdmin, async (req, res) => {
    try {
        const settings = await get(
            'SELECT minutes_per_bottle FROM settings WHERE id = 1'
        );

        res.json({
            email: req.admin.email,
            minutesPerBottle: settings.minutes_per_bottle
        });
    } catch (error) {
        console.error('Settings error:', error.message);
        res.status(500).json({
            message: 'Unable to load settings.'
        });
    }
});

// UPDATE ADMIN EMAIL, PASSWORD, AND REWARD RATE
app.put('/api/admin/settings', requireAdmin, async (req, res) => {
    try {
        const {
            currentPassword,
            email,
            newPassword,
            minutesPerBottle
        } = req.body || {};

        if (
            typeof currentPassword !== 'string' ||
            !currentPassword
        ) {
            return res.status(400).json({
                success: false,
                message: 'Enter your current password.'
            });
        }

        const admin = await get(
            `SELECT id, email, password_hash, token_version
             FROM admins WHERE id = ?`,
            [req.admin.id]
        );

        if (!admin || !(await bcrypt.compare(
            currentPassword,
            admin.password_hash
        ))) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect.'
            });
        }

        let updatedEmail = admin.email;

        if (email !== undefined) {
            if (
                typeof email !== 'string' ||
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Enter a valid email address.'
                });
            }

            updatedEmail = email.trim();
        }

        let passwordHash = admin.password_hash;

        if (newPassword !== undefined && newPassword !== '') {
            if (
                typeof newPassword !== 'string' ||
                newPassword.length < 8
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'New password must be at least 8 characters.'
                });
            }

            passwordHash = await bcrypt.hash(newPassword, 12);
        }

        let rate;

        if (minutesPerBottle !== undefined) {
            rate = Number(minutesPerBottle);

            if (!Number.isInteger(rate) || rate < 1 || rate > 1440) {
                return res.status(400).json({
                    success: false,
                    message: 'Minutes per bottle must be between 1 and 1440.'
                });
            }
        }

        // Update account and invalidate existing tokens.
        await run(
            `UPDATE admins
             SET email = ?,
                 password_hash = ?,
                 token_version = token_version + 1
             WHERE id = ?`,
            [updatedEmail, passwordHash, admin.id]
        );

        if (rate !== undefined) {
            await run(
                'UPDATE settings SET minutes_per_bottle = ? WHERE id = 1',
                [rate]
            );
        }

        const updatedAdmin = await get(
            'SELECT id, email, token_version FROM admins WHERE id = ?',
            [admin.id]
        );

        const settings = await get(
            'SELECT minutes_per_bottle FROM settings WHERE id = 1'
        );

        res.json({
            success: true,
            message: 'Settings saved successfully.',
            token: createToken(updatedAdmin),
            email: updatedAdmin.email,
            minutesPerBottle: settings.minutes_per_bottle
        });
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT') {
            return res.status(409).json({
                success: false,
                message: 'That email address is already being used.'
            });
        }

        console.error('Settings update error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Unable to save settings.'
        });
    }
});

// ADMIN DASHBOARD STATISTICS
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
    try {
        const stats = await get(`
            SELECT
                COUNT(DISTINCT mac_address) AS total_users,
                COALESCE(SUM(bottles_deposited), 0) AS total_bottles,
                COALESCE(SUM(minutes_earned), 0) AS total_minutes
            FROM sessions
        `);

        res.json({
            totalUsers: stats.total_users || 0,
            totalBottles: stats.total_bottles || 0,
            totalMinutes: stats.total_minutes || 0,
            systemStatus: 'Online'
        });
    } catch (error) {
        console.error('Stats error:', error.message);
        res.status(500).json({
            message: 'Unable to load dashboard statistics.'
        });
    }
});

// Bottle count waiting to be claimed.
// This prototype count resets when the backend restarts.
let pendingBottles = 0;

// ESP32: REGISTER A BOTTLE DROP
app.post('/api/hardware/drop', (req, res) => {
    pendingBottles += 1;

    console.log(`Bottle detected. Pending: ${pendingBottles}`);

    res.json({
        success: true,
        pendingBottles
    });
});

// PORTAL: CHECK PENDING BOTTLES
app.get('/api/portal/check-pending', (req, res) => {
    res.json({ pendingBottles });
});

// PORTAL: CLAIM WIFI REWARD
app.post('/api/portal/claim', async (req, res) => {
    try {
        const { mac_address } = req.body || {};

        if (pendingBottles <= 0) {
            return res.status(400).json({
                success: false,
                error: 'No bottles deposited yet.'
            });
        }

        if (
            typeof mac_address !== 'string' ||
            !mac_address.trim()
        ) {
            return res.status(400).json({
                success: false,
                error: 'MAC address is required.'
            });
        }

        const settings = await get(
            'SELECT minutes_per_bottle FROM settings WHERE id = 1'
        );

        const bottles = pendingBottles;
        const minutes = bottles * settings.minutes_per_bottle;

        const result = await run(
            `INSERT INTO sessions
             (mac_address, bottles_deposited, minutes_earned)
             VALUES (?, ?, ?)`,
            [mac_address.trim(), bottles, minutes]
        );

        pendingBottles -= bottles;

        console.log(
            `${mac_address.trim()} claimed ${bottles} bottle(s), ${minutes} minutes.`
        );

        res.json({
            success: true,
            sessionId: result.id,
            bottles,
            minutes
        });
    } catch (error) {
        console.error('Claim error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Unable to claim reward.'
        });
    }
});

initializeDatabase()
    .then(() => {
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Eco WiFi API running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error('Database initialization failed:', error.message);
        process.exit(1);
    });
