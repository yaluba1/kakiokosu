import type { Env } from './db';
import { getSession, getSessionSegments, listSessions } from './db';
import type { UserAuth } from './auth';

/**
 * Built-in default trusted origins for local development and official domains
 */
export const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'https://kakiokoshi.yaluba.org',
  'https://kakiokoshi-app.yaluba.org',
  'https://kakiokoshi-reader.yaluba.org',
];

/**
 * Trusted project prefixes for Cloudflare Pages (*.pages.dev)
 */
export const ALLOWED_PAGES_PREFIXES = [
  'kakiokosu-frontend',
  'kakiokosu-web',
  'kakiokosu-reader',
  'kakiokoshi',
  'kakiokoshi-app',
  'kakiokoshi-reader',
];

/**
 * Checks whether an incoming request Origin is allowed.
 * Accepts:
 * - Specific origins in DEFAULT_ALLOWED_ORIGINS (local development)
 * - Custom origins defined in env.ALLOWED_ORIGINS (comma-separated list)
 * - Known project deployments on Cloudflare Pages (<project>.pages.dev or <preview>.<project>.pages.dev)
 * - Official application domains on yaluba.org (*.yaluba.org or yaluba.org)
 */
export function isAllowedOrigin(origin: string | null, env?: Env): boolean {
  if (!origin) return false;

  const normalized = origin.trim().toLowerCase();

  // Check custom env allowlist if provided
  if (env?.ALLOWED_ORIGINS) {
    const list = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim().toLowerCase());
    if (list.includes(normalized)) return true;
  }

  // Check default local development origins
  if (DEFAULT_ALLOWED_ORIGINS.includes(normalized)) {
    return true;
  }

  try {
    const url = new URL(normalized);
    const hostname = url.hostname;

    // Restrict Cloudflare Pages deployments strictly to known project subdomains.
    // Prevents arbitrary third-party *.pages.dev sites from accessing the API or WebSocket.
    if (hostname.endsWith('.pages.dev')) {
      const isAllowedProject = ALLOWED_PAGES_PREFIXES.some(
        (prefix) => hostname === `${prefix}.pages.dev` || hostname.endsWith(`.${prefix}.pages.dev`)
      );
      if (isAllowedProject) {
        return true;
      }
    }

    // Allow custom application domains (e.g. yaluba.org subdomains)
    if (hostname === 'yaluba.org' || hostname.endsWith('.yaluba.org')) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

/**
 * Common CORS headers for the REST API
 */
export function corsHeaders(request: Request, env?: Env): HeadersInit {
  const origin = request.headers.get('Origin');
  const allowed = isAllowedOrigin(origin, env);

  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };

  if (allowed && origin) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return headers;
}

/**
 * Handles OPTIONS preflight requests
 */
export function handleOptions(request: Request, env?: Env): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request, env),
  });
}

/**
 * Standard JSON response helper with CORS
 */
function jsonResponse(data: unknown, status = 200, request: Request, env?: Env): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(request, env),
    },
  });
}

/**
 * Routes and handles REST API requests under /api/*
 */
export async function handleApiRequest(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  auth: UserAuth
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  // GET /api/me - Returns authenticated user ID & admin status
  if (path === '/api/me' && request.method === 'GET') {
    return jsonResponse(
      {
        userId: auth.userId,
        isAdmin: auth.isAdmin,
        email: auth.email,
      },
      200,
      request,
      env
    );
  }

  // GET /api/sessions - List sessions within the 90-day retention window
  if (path === '/api/sessions' && request.method === 'GET') {
    const rawLimit = parseInt(url.searchParams.get('limit') || '50', 10);
    const rawOffset = parseInt(url.searchParams.get('offset') || '0', 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 50;
    const offset = Number.isFinite(rawOffset) ? Math.max(rawOffset, 0) : 0;
    const targetUserId = url.searchParams.get('userId') || undefined;

    // Non-admin users cannot query someone else's sessions
    if (!auth.isAdmin && targetUserId && targetUserId !== auth.userId) {
      return jsonResponse(
        { error: 'Forbidden: You cannot inspect another user sessions' },
        403,
        request,
        env
      );
    }

    const result = await listSessions(env.DB, auth.userId, auth.isAdmin, {
      limit,
      offset,
      targetUserId: auth.isAdmin ? targetUserId : undefined,
    });

    return jsonResponse(result, 200, request, env);
  }

  // GET /api/sessions/:id - Get session details and all segments
  const sessionMatch = path.match(/^\/api\/sessions\/([^/]+)$/);
  if (sessionMatch && request.method === 'GET') {
    const sessionId = sessionMatch[1];
    const session = await getSession(env.DB, sessionId, auth.userId, auth.isAdmin);

    if (!session) {
      return jsonResponse(
        { error: 'Session not found or permission denied' },
        404,
        request,
        env
      );
    }

    const includeMuted = url.searchParams.get('includeMuted') !== 'false';
    const segments = await getSessionSegments(
      env.DB,
      sessionId,
      includeMuted,
      auth.isAdmin ? undefined : auth.userId
    );

    return jsonResponse(
      {
        session,
        segments,
      },
      200,
      request,
      env
    );
  }

  return jsonResponse({ error: 'Endpoint not found' }, 404, request, env);
}

