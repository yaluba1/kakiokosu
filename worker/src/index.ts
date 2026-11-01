import type { Env } from './db';
import { purgeExpiredRecords } from './db';
import { authenticateRequest } from './auth';
import { handleWebSocketUpgrade } from './ws-proxy';
import { handleApiRequest, handleOptions, corsHeaders } from './api';

export default {
  /**
   * Main HTTP and WebSocket request handler
   */
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Handle CORS preflight for REST API calls
    if (request.method === 'OPTIONS') {
      return handleOptions(request, env);
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // WebSocket endpoint for real-time transcription streaming (/ws or root with upgrade)
    const isWebSocketRequest =
      request.headers.get('Upgrade')?.toLowerCase() === 'websocket';

    if (isWebSocketRequest || path === '/ws') {
      if (!isWebSocketRequest) {
        return new Response('Expected WebSocket upgrade', { status: 426 });
      }

      // Verify Firebase authentication via JWT
      const auth = await authenticateRequest(request, env);
      if (!auth) {
        return new Response('Unauthorized: Valid Firebase token required', {
          status: 401,
          headers: { 'WWW-Authenticate': 'Bearer' },
        });
      }

      return await handleWebSocketUpgrade(request, env, ctx, auth);
    }

    // Health check endpoint
    if (path === '/health' || path === '/') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          service: 'kakiokosu-worker',
          timestamp: Date.now(),
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(request, env),
          },
        }
      );
    }

    // REST API endpoints under /api/*
    if (path.startsWith('/api/')) {
      const auth = await authenticateRequest(request, env);
      if (!auth) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized: Valid Firebase token required' }),
          {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
              'WWW-Authenticate': 'Bearer',
              ...corsHeaders(request, env),
            },
          }
        );
      }

      return await handleApiRequest(request, env, ctx, auth);
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(request, env),
      },
    });
  },

  /**
   * Cloudflare Cron Trigger handler: runs daily to purge sessions and segments > 90 days
   */
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log(`[Cron] Running scheduled 90-day retention purge at ${new Date(controller.scheduledTime).toISOString()}`);
    ctx.waitUntil(
      purgeExpiredRecords(env.DB)
        .then((result) => {
          console.log(
            `[Cron] Purge complete: ${result.deletedSessions} expired sessions and ${result.deletedSegments} segments deleted.`
          );
        })
        .catch((err) => {
          console.error('[Cron] Failed to purge expired records:', err);
        })
    );
  },
};

