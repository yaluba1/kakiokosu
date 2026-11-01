-- Migration: 0001_init.sql
-- Description: Initialize sessions and segments tables for transcription storage with 90-day retention

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    language TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    ended_at INTEGER
);

-- Segments table
CREATE TABLE IF NOT EXISTS segments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    speaker INTEGER NOT NULL DEFAULT 0,
    transcript TEXT NOT NULL,
    is_muted INTEGER NOT NULL DEFAULT 0,
    start_sec REAL,
    end_sec REAL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Indexes for performance and retention sweep
CREATE INDEX IF NOT EXISTS idx_sessions_user_started ON sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at ASC);
CREATE INDEX IF NOT EXISTS idx_segments_session_created ON segments(session_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_segments_user_created ON segments(user_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_segments_created_at ON segments(created_at ASC);

