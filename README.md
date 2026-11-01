# 書き起こす (Kakiokosu)

Real-time speech-to-text Progressive Web App (PWA) designed for elderly users who have hearing difficulties, with speaker diarization, tap-to-mute filtering, 90-day Cloudflare D1 persistence, role-based access control, and a dedicated History Reader Web UI.

---

## Architecture Overview

```text
kakiokosu/
├── frontend/    # App 1: Elderly-friendly Real-Time Transcription PWA (Vite + React + PWA)
├── reader/      # App 2: Transcription History Web UI for Users & Admins (Vite + React)
└── worker/      # Backend: Cloudflare Worker (WebSocket proxy to Deepgram + D1 database + REST API)
```

1. **Frontend PWA (`frontend/`)**: Captures 16kHz linear16 PCM audio via an `AudioWorklet`, connects to the Worker WebSocket with a Firebase Auth ID token, and renders live speech bubbles. Users can tap any speaker's bubble to mute/hide that speaker's voice.
2. **Cloudflare Worker (`worker/`)**: Validates the Firebase ID token via Google's SecureToken JWKS, proxies audio to `wss://api.deepgram.com/v1/listen` (Deepgram Nova-3), persists finalized segments to Cloudflare D1 with a 90-day retention schedule, and serves REST endpoints for the reader.
3. **Reader Web UI (`reader/`)**: Authenticated web app enabling users to read their past 90 days of conversations, inspect or toggle muted speech, and export transcripts as `.txt`. If logged in as the admin (`ADMIN_USER_ID`), the interface provides access to all users' sessions with user filtering.

---

## Prerequisites

- **Node.js**: v18+ (tested on Node v20/v24)
- **Deepgram API Key**: [Deepgram Console](https://console.deepgram.com/)
- **Firebase Project**: [Firebase Console](https://console.firebase.google.com/) (enable **Email/Password** under **Authentication > Sign-in method**)
- **Cloudflare Account**: [Cloudflare Dashboard](https://dash.cloudflare.com/) (for D1, Workers & Pages)

---

## Local Development & Testing Guide

You can run and test the complete stack locally before deploying anything to Cloudflare.

### 1. Install Dependencies
From the repository root:
```bash
npm install
```

### 2. Configure Environment Files

#### Worker Secrets (`worker/.dev.vars`)
Create `worker/.dev.vars`:
```ini
DEEPGRAM_API_KEY="your_actual_deepgram_api_key"
FIREBASE_PROJECT_ID="your-firebase-project-id"
ADMIN_USER_ID="optional_admin_firebase_uid"
```

#### Frontend Settings (`frontend/.env`)
Create `frontend/.env`:
```ini
VITE_FIREBASE_API_KEY="your-firebase-api-key"
VITE_FIREBASE_AUTH_DOMAIN="your-firebase-project-id.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-firebase-project-id"
VITE_WORKER_WS_URL="ws://localhost:8787"
```

#### Reader Settings (`reader/.env`)
Create `reader/.env`:
```ini
VITE_FIREBASE_API_KEY="your-firebase-api-key"
VITE_FIREBASE_AUTH_DOMAIN="your-firebase-project-id.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-firebase-project-id"
VITE_WORKER_API_URL="http://localhost:8787"
```

---

### 3. Initialize Local D1 Database
Apply the D1 database migration to your local development environment:

```bash
npx --prefix worker wrangler d1 migrations apply kakiokosu-db --local
```

---

### 4. Start Local Services

Open separate terminals (or run concurrently) for each component:

#### Terminal 1: Cloudflare Worker Backend
```bash
npm run dev:worker
```
- Listens on `http://localhost:8787` (WebSocket on `ws://localhost:8787/ws`).
- Verify health: Visit `http://localhost:8787/health` in your browser.

#### Terminal 2: Real-Time Transcription PWA
```bash
npm run dev:frontend
```
- Opens at `http://localhost:5173`.
- Log in (or create an account) with Email & Password, grant microphone access, click **開始 (Start)**, and verify real-time speech transcription.
- Tap a speaker's bubble to test the **Tap-to-Mute** feature and check the unmute recovery bar.

#### Terminal 3: History Reader Web UI
```bash
npm run dev:reader
```
- Opens at `http://localhost:5174`.
- Log in with the same Email & Password and verify that your transcribed session appears in the session list.
- Inspect segments, toggle muted speech, and click **TXT 出力** to export.

---

## Production Deployment to Cloudflare

### 1. Deploy the Backend Worker
1. Create your production D1 database:
   ```bash
   npx --prefix worker wrangler d1 create kakiokosu-db
   ```
2. Paste the `database_id` and your `FIREBASE_PROJECT_ID` into `worker/wrangler.toml`.
3. Apply migrations to production:
   ```bash
   npx --prefix worker wrangler d1 migrations apply kakiokosu-db --remote
   ```
4. Set production secrets:
   ```bash
   npx --prefix worker wrangler secret put DEEPGRAM_API_KEY
   npx --prefix worker wrangler secret put ADMIN_USER_ID
   ```
5. Deploy the worker:
   ```bash
   npm run build:worker
   npx --prefix worker wrangler deploy
   ```

### 2. Deploy Frontends & Web to Cloudflare Pages
1. Update `VITE_WORKER_WS_URL` (`wss://kakiokoshi-api.yaluba.org`) and `VITE_WORKER_API_URL` (`https://kakiokoshi-api.yaluba.org`) to point to your live Worker URL, then build:
   ```bash
   npm run build:frontend   # Generates frontend/dist/
   npm run build:reader     # Generates reader/dist/
   npm --prefix web run build # Generates web/dist/
   ```
2. Deploy the `dist/` folders via Cloudflare Pages:
   ```bash
   # Frontend PWA (https://kakiokoshi-app.yaluba.org)
   npx wrangler pages deploy frontend/dist --project-name kakiokosu-frontend

   # Reader Web UI (https://kakiokoshi-reader.yaluba.org)
   npx wrangler pages deploy reader/dist --project-name kakiokosu-reader

   # Landing Web (https://kakiokoshi.yaluba.org)
   npx wrangler pages deploy web/dist --project-name kakiokosu-web
   ```
3. In the **Firebase Console** (**Authentication > Settings > Authorized domains**), add your custom and Cloudflare Pages domains (`kakiokoshi-app.yaluba.org`, `kakiokoshi-reader.yaluba.org`, `kakiokosu-frontend.pages.dev`, and `kakiokosu-reader.pages.dev`).

---

## Component Documentation
- [Frontend PWA Documentation](frontend/README.md)
- [History Reader Web UI Documentation](reader/README.md)
- [Worker Backend Documentation](worker/README.md)

---

## License
MIT
