export interface SessionSummary {
  id: string;
  user_id: string;
  language: string;
  started_at: number;
  ended_at: number | null;
  segment_count: number;
}

export interface Segment {
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

export interface SessionDetailData {
  session: SessionSummary;
  segments: Segment[];
}

export interface MeResponse {
  userId: string;
  isAdmin: boolean;
  email?: string;
}

const WORKER_API_BASE = import.meta.env.VITE_WORKER_API_URL || 'http://localhost:8787';

export async function fetchMe(token: string): Promise<MeResponse> {
  const res = await fetch(`${WORKER_API_BASE}/api/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch user info (${res.status})`);
  return res.json();
}

export async function fetchSessions(
  token: string,
  options: { targetUserId?: string; limit?: number; offset?: number } = {}
): Promise<{ sessions: SessionSummary[]; total: number }> {
  const url = new URL(`${WORKER_API_BASE}/api/sessions`);
  if (options.targetUserId) url.searchParams.set('userId', options.targetUserId);
  if (options.limit) url.searchParams.set('limit', String(options.limit));
  if (options.offset) url.searchParams.set('offset', String(options.offset));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch sessions (${res.status})`);
  return res.json();
}

export async function fetchSessionDetail(
  token: string,
  sessionId: string,
  includeMuted: boolean = true
): Promise<SessionDetailData> {
  const url = new URL(`${WORKER_API_BASE}/api/sessions/${sessionId}`);
  url.searchParams.set('includeMuted', String(includeMuted));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch session detail (${res.status})`);
  return res.json();
}

