# Kakiokosu Worker (`worker/`)

The Cloudflare Worker backend for Kakiokosu. It provides:
1. **Secure WebSocket Relay to Deepgram Nova-3**: Proxying 16kHz linear16 PCM audio streams, injecting authentication keys, and broadcasting real-time transcription events with speaker diarization.
2. **Firebase ID Token Authentication via JWKS**: Cryptographically validates Firebase Auth JWTs against Google's SecureToken JWKS and extracts the user's Firebase UID (`sub`).
3. **Cloudflare D1 Persistence (90-Day Retention)**: Saves finalized speech segments and session metadata into Cloudflare D1 without delaying live streaming.
4. **Cloudflare Scheduled Cron**: Automatically deletes sessions and segments older than 90 days.
5. **REST API for Reader UI**: Role-based access control allowing regular users to view their own sessions and admins (`ADMIN_USER_ID`) to view all user sessions.

---

## Directory Structure

```text
worker/
├── migrations/
│   └── 0001_init.sql          # D1 schema for sessions, segments, and indexes
├── src/
│   ├── auth.ts                # Firebase ID token verification via Google JWKS + UID extraction
│   ├── db.ts                  # D1 query layer + 90-day retention cutoff and purge
│   ├── ws-proxy.ts            # Deepgram Nova-3 WebSocket proxy with live D1 persistence
│   ├── api.ts                 # REST API endpoints (/api/me, /api/sessions, /api/sessions/:id)
│   └── index.ts               # Cloudflare Worker fetch & scheduled cron entrypoint
├── wrangler.toml              # Cloudflare configuration (D1, crons, env vars)
├── .dev.vars.example          # Template for local development secrets
└── package.json
```

---

## Configuration & Environment Variables

Create `.dev.vars` in `worker/` for local testing (this file is git-ignored):

```ini
DEEPGRAM_API_KEY="your_deepgram_api_key"
FIREBASE_PROJECT_ID="your-firebase-project-id"
ADMIN_USER_ID="firebase_uid_of_admin"
```

In `wrangler.toml`:
- `FIREBASE_PROJECT_ID`: Your Firebase project ID (used to verify `iss` and `aud` claims on incoming Firebase ID tokens).
- `ADMIN_USER_ID`: Optional user ID string matching the admin user's Firebase UID (`sub`).
- `[[d1_databases]]`: Cloudflare D1 database binding named `DB`.

---

## Local Development & Testing

### 1. Apply D1 Database Migrations Locally
Before running the worker locally for the first time, initialize the local SQLite database using Wrangler:

```bash
# From worker/ or repository root
npx wrangler d1 migrations apply kakiokosu-db --local
```

### 2. Run the Worker Locally
Start the local worker on `http://localhost:8787`:

```bash
npm run dev
# or from root: npm run dev:worker
```

### 3. Verify Health Check
Open `http://localhost:8787/health` in your browser or curl:
```bash
curl http://localhost:8787/health
# Response: {"status":"ok","service":"kakiokosu-worker","timestamp":...}
```

---

## Production Deployment to Cloudflare

1. Create a remote Cloudflare D1 database:
   ```bash
   npx wrangler d1 create kakiokosu-db
   ```
2. Update `database_id` and `FIREBASE_PROJECT_ID` in `wrangler.toml`.
3. Apply migrations to production D1:
   ```bash
   npx wrangler d1 migrations apply kakiokosu-db --remote
   ```
4. Set secret environment variables on Cloudflare:
   ```bash
   npx wrangler secret put DEEPGRAM_API_KEY
   npx wrangler secret put ADMIN_USER_ID
   ```
5. Deploy the worker:
   ```bash
   npm run deploy
   ```
