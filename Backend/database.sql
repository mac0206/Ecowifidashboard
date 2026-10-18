
-- Create the sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mac_address TEXT,
    bottles_deposited INTEGER DEFAULT 0,
    minutes_earned INTEGER DEFAULT 0,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- View all sessions
SELECT * FROM sessions;

-- View total users and bottles
SELECT
    COUNT(*) AS total_users,
    COALESCE(SUM(bottles_deposited), 0) AS total_bottles,
    COALESCE(SUM(minutes_earned), 0) AS total_minutes
FROM sessions;

-- View the latest 10 sessions
SELECT *
FROM sessions
ORDER BY id DESC
LIMIT 10;
