-- D1 Database Schema for NoArousal Accountability

-- Singleton table for journey start settings
CREATE TABLE IF NOT EXISTS journey_metadata (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  journey_start TEXT NOT NULL,
  timezone TEXT NOT NULL
);

-- Entries table for refusal and pushups logs
CREATE TABLE IF NOT EXISTS entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,          -- 'refuse', 'pushups', 'relapse', 'loss'
  timestamp TEXT NOT NULL,     -- ISO-8601 or similar timestamp string
  count INTEGER DEFAULT NULL,  -- count of pushups, etc.
  meta TEXT DEFAULT NULL       -- JSON string for any extra attributes
);

-- Index for fast sorting of battle history logs
CREATE INDEX IF NOT EXISTS idx_entries_timestamp ON entries(timestamp);

-- Cache table for external APIs (like Strava)
CREATE TABLE IF NOT EXISTS fitness_cache (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
