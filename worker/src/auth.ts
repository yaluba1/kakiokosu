import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { Env } from './db';

export interface UserAuth {
  userId: string;
  isAdmin: boolean;
  email?: string;
  exp?: number;
}

const FIREBASE_JWKS_URL = new URL(
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'
);

// Cached remote JWK set for Google's Firebase Auth public keys
const firebaseJWKS = createRemoteJWKSet(FIREBASE_JWKS_URL);

/**
 * Extracts the raw JWT token from either:
 * 1. The `Authorization: Bearer <token>` header (for REST API)
 * 2. The `?token=<token>` query parameter (for WebSocket connections)
 * 3. The `Sec-WebSocket-Protocol` header if passed as protocol
 */
export function extractToken(request: Request): string | null {
  // Check Authorization header
  const authHeader = request.headers.get('Authorization');
  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && /^bearer$/i.test(parts[0])) {
      return parts[1];
    }
  }

  // Check URL query parameters (commonly used for WebSockets)
  try {
    const url = new URL(request.url);
    const tokenParam = url.searchParams.get('token');
    if (tokenParam) {
      return tokenParam;
    }
  } catch {
    // URL parsing failed, proceed to header fallback
  }

  // Check Sec-WebSocket-Protocol (e.g., "firebase-auth, <jwt>")
  const subprotocols = request.headers.get('Sec-WebSocket-Protocol');
  if (subprotocols) {
    const protocols = subprotocols.split(',').map((p) => p.trim());
    // If the token is passed as one of the protocols
    const bearerProtocol = protocols.find((p) => p.startsWith('bearer-') || p.split('.').length === 3);
    if (bearerProtocol) {
      return bearerProtocol.replace(/^bearer-/, '');
    }
  }

  return null;
}

/**
 * Verifies the Firebase ID token against Google's SecureToken JWKS endpoint and extracts user information.
 * Matches against ADMIN_USER_ID or custom `admin` claim if configured.
 */
export async function authenticateRequest(
  request: Request,
  env: Env
): Promise<UserAuth | null> {
  const token = extractToken(request);
  if (!token) {
    return null;
  }

  return await verifyFirebaseToken(token, env);
}

/**
 * Verifies a raw Firebase ID token JWT string against Google's SecureToken JWKS.
 */
export async function verifyFirebaseToken(
  token: string,
  env: Env
): Promise<UserAuth | null> {
  const projectId = env.FIREBASE_PROJECT_ID?.trim();
  if (!projectId) {
    console.error('Missing FIREBASE_PROJECT_ID environment variable');
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, firebaseJWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
      algorithms: ['RS256'],
    });

    const userId = typeof payload.sub === 'string' && payload.sub.trim() ? payload.sub.trim() : undefined;

    if (!userId) {
      console.error('Invalid Firebase token payload: missing non-empty sub claim', payload);
      return null;
    }

    // Check if the caller matches the configured Admin user ID or has custom `admin: true` claim
    const configuredAdminId = env.ADMIN_USER_ID?.trim();
    const isAdmin =
      Boolean(configuredAdminId && userId === configuredAdminId) ||
      payload.admin === true;

    // Optional email extraction if present in payload
    const email = typeof payload.email === 'string' ? payload.email : undefined;
    const exp = typeof payload.exp === 'number' ? payload.exp : undefined;

    return {
      userId,
      isAdmin,
      email,
      exp,
    };
  } catch (err) {
    console.warn('Firebase JWT verification failed:', err instanceof Error ? err.message : String(err));
    return null;
  }
}
