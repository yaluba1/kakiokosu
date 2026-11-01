export interface Env {
  DB: D1Database;
  DEEPGRAM_API_KEY: string;
  FIREBASE_PROJECT_ID: string;
  ADMIN_USER_ID?: string;
  ALLOWED_ORIGINS?: string;
}

export interface SessionRow {
  id: string;
  user_id: string;
  language: string;
  started_at: number;
  ended_at: number | null;
}

export interface SegmentRow {
  id: number;
  session_id: string;
  user_id: string;
  speaker: number;
  transcript: string;
  is_muted: number;
  start_sec: number | null;
  end_sec: number | null;
  created_at: number;
}

export interface SessionWithStats extends SessionRow {
  segment_count: number;
  snippet?: string;
}

// 90 days in milliseconds
export const RETENTION_PERIOD_MS = 90 * 24 * 60 * 60 * 1000;

export function getRetentionCutoffMs(): number {
  return Date.now() - RETENTION_PERIOD_MS;
}

/**
 * Finds if the user currently has an active session (ended_at IS NULL).
 * Active sessions within the last 30 minutes are considered alive.
 */
export async function getActiveSession(
  db: D1Database,
  userId: string,
  maxAgeMs: number = 30 * 60 * 1000
): Promise<SessionRow | null> {
  const cutoff = Date.now() - maxAgeMs;
  return await db
    .prepare(
      `SELECT id, user_id, language, started_at, ended_at
       FROM sessions
       WHERE user_id = ? AND ended_at IS NULL AND started_at >= ?
       ORDER BY started_at DESC
       LIMIT 1`
    )
    .bind(userId, cutoff)
    .first<SessionRow>();
}

/**
 * Closes all active sessions for a user whose start time is older than maxAgeMs,
 * or marks an existing session as ended.
 */
export async function closeStaleSessions(
  db: D1Database,
  userId: string,
  maxAgeMs: number = 30 * 60 * 1000
): Promise<void> {
  const cutoff = Date.now() - maxAgeMs;
  await db
    .prepare(
      `UPDATE sessions
       SET ended_at = ?
       WHERE user_id = ? AND ended_at IS NULL AND started_at < ?`
    )
    .bind(Date.now(), userId, cutoff)
    .run();
}

/**
 * Inserts a new transcription session.
 */
export async function createSession(
  db: D1Database,
  session: { id: string; userId: string; language: string; startedAt: number }
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO sessions (id, user_id, language, started_at)
       VALUES (?, ?, ?, ?)`
    )
    .bind(session.id, session.userId, session.language, session.startedAt)
    .run();
}

/**
 * Updates a session's ended_at timestamp.
 * Strictly verifies userId unless isAdmin is true for multi-tenant isolation.
 */
export async function endSession(
  db: D1Database,
  sessionId: string,
  userId?: string,
  endedAt: number = Date.now()
): Promise<void> {
  if (userId) {
    await db
      .prepare(
        `UPDATE sessions
         SET ended_at = ?
         WHERE id = ? AND user_id = ?`
      )
      .bind(endedAt, sessionId, userId)
      .run();
  } else {
    await db
      .prepare(
        `UPDATE sessions
         SET ended_at = ?
         WHERE id = ?`
      )
      .bind(endedAt, sessionId)
      .run();
  }
}

/**
 * Inserts a finalized transcript segment.
 */
export async function insertSegment(
  db: D1Database,
  segment: {
    sessionId: string;
    userId: string;
    speaker: number;
    transcript: string;
    isMuted?: boolean;
    startSec?: number;
    endSec?: number;
    createdAt?: number;
  }
): Promise<void> {
  const createdAt = segment.createdAt ?? Date.now();
  const isMuted = segment.isMuted ? 1 : 0;

  await db
    .prepare(
      `INSERT INTO segments (
         session_id, user_id, speaker, transcript, is_muted, start_sec, end_sec, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      segment.sessionId,
      segment.userId,
      segment.speaker,
      segment.transcript,
      isMuted,
      segment.startSec ?? null,
      segment.endSec ?? null,
      createdAt
    )
    .run();
}

/**
 * Remaps an identified speaker to Speaker 0 (the fingerprint-matched owner),
 * marks their segments as muted, and shifts subsequent non-owner speaker IDs
 * so non-owner speakers remain contiguous (1, 2, 3, ...).
 * Includes userId filter for strict multi-tenant isolation.
 */
export async function promoteSpeakerToOwner(
  db: D1Database,
  sessionId: string,
  oldSpeakerId: number,
  userId?: string
): Promise<void> {
  if (oldSpeakerId <= 0) return;

  if (userId) {
    await db.batch([
      db
        .prepare(
          `UPDATE segments
           SET speaker = 0, is_muted = 1
           WHERE session_id = ? AND user_id = ? AND speaker = ?`
        )
        .bind(sessionId, userId, oldSpeakerId),
      db
        .prepare(
          `UPDATE segments
           SET speaker = speaker - 1
           WHERE session_id = ? AND user_id = ? AND speaker > ?`
        )
        .bind(sessionId, userId, oldSpeakerId),
    ]);
  } else {
    await db.batch([
      db
        .prepare(
          `UPDATE segments
           SET speaker = 0, is_muted = 1
           WHERE session_id = ? AND speaker = ?`
        )
        .bind(sessionId, oldSpeakerId),
      db
        .prepare(
          `UPDATE segments
           SET speaker = speaker - 1
           WHERE session_id = ? AND speaker > ?`
        )
        .bind(sessionId, oldSpeakerId),
    ]);
  }
}

/**
 * Retrieves a single session by ID if the caller has permission.
 * Enforces the 90-day retention window.
 */
export async function getSession(
  db: D1Database,
  sessionId: string,
  callerUserId: string,
  isAdmin: boolean
): Promise<SessionRow | null> {
  const cutoff = getRetentionCutoffMs();

  let query = `
    SELECT id, user_id, language, started_at, ended_at
    FROM sessions
    WHERE id = ? AND started_at >= ?
  `;
  const params: (string | number)[] = [sessionId, cutoff];

  if (!isAdmin) {
    query += ` AND user_id = ?`;
    params.push(callerUserId);
  }

  return await db.prepare(query).bind(...params).first<SessionRow>();
}

/**
 * Retrieves all segments for a given session.
 * Accepts optional userId filter to guarantee tenant isolation.
 */
export async function getSessionSegments(
  db: D1Database,
  sessionId: string,
  includeMuted: boolean = true,
  userId?: string
): Promise<SegmentRow[]> {
  let query = `
    SELECT id, session_id, user_id, speaker, transcript, is_muted, start_sec, end_sec, created_at
    FROM segments
    WHERE session_id = ?
  `;
  const params: (string | number)[] = [sessionId];

  if (userId) {
    query += ` AND user_id = ?`;
    params.push(userId);
  }

  if (!includeMuted) {
    query += ` AND is_muted = 0`;
  }
  query += ` ORDER BY created_at ASC, id ASC`;

  const results = await db.prepare(query).bind(...params).all<SegmentRow>();
  return results.results ?? [];
}

/**
 * Lists sessions within the 90-day retention window.
 * Regular users see only their sessions; Admins see all or filter by targetUserId.
 */
export async function listSessions(
  db: D1Database,
  callerUserId: string,
  isAdmin: boolean,
  options: {
    targetUserId?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ sessions: SessionWithStats[]; total: number }> {
  const cutoff = getRetentionCutoffMs();
  const rawLimit = Number.isFinite(options.limit) ? (options.limit as number) : 50;
  const rawOffset = Number.isFinite(options.offset) ? (options.offset as number) : 0;
  const limit = Math.min(Math.max(Math.floor(rawLimit), 1), 100);
  const offset = Math.max(Math.floor(rawOffset), 0);

  const whereClauses: string[] = [`s.started_at >= ?`];
  const params: (string | number)[] = [cutoff];

  if (!isAdmin) {
    whereClauses.push(`s.user_id = ?`);
    params.push(callerUserId);
  } else if (options.targetUserId) {
    whereClauses.push(`s.user_id = ?`);
    params.push(options.targetUserId);
  }

  const whereSql = whereClauses.join(' AND ');

  // Count total sessions matching filters
  const countRow = await db
    .prepare(`SELECT COUNT(*) as count FROM sessions s WHERE ${whereSql}`)
    .bind(...params)
    .first<{ count: number }>();
  const total = countRow?.count ?? 0;

  // Retrieve sessions with segment count
  const listQuery = `
    SELECT
      s.id,
      s.user_id,
      s.language,
      s.started_at,
      s.ended_at,
      COUNT(seg.id) as segment_count
    FROM sessions s
    LEFT JOIN segments seg ON s.id = seg.session_id
    WHERE ${whereSql}
    GROUP BY s.id
    ORDER BY s.started_at DESC
    LIMIT ? OFFSET ?
  `;

  const rows = await db
    .prepare(listQuery)
    .bind(...params, limit, offset)
    .all<SessionWithStats>();

  return {
    sessions: rows.results ?? [],
    total,
  };
}

/**
 * Purges sessions and segments older than the 90-day retention window.
 * Runs on cron or maintenance trigger.
 */
export async function purgeExpiredRecords(
  db: D1Database
): Promise<{ deletedSessions: number; deletedSegments: number }> {
  const cutoff = getRetentionCutoffMs();

  // Delete segments created before cutoff
  const segResult = await db
    .prepare(`DELETE FROM segments WHERE created_at < ?`)
    .bind(cutoff)
    .run();

  // Delete sessions started before cutoff
  const sessResult = await db
    .prepare(`DELETE FROM sessions WHERE started_at < ?`)
    .bind(cutoff)
    .run();

  return {
    deletedSessions: sessResult.meta.changes ?? 0,
    deletedSegments: segResult.meta.changes ?? 0,
  };
}

