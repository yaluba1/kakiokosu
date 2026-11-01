# Kakiokoshi History Reader Web UI

A dedicated desktop and mobile-friendly Web UI (non-PWA) allowing authenticated users and administrators to review, search, and export transcription sessions stored within the 90-day retention window.

---

## Core Features

- **Role-Based Access Control (RBAC)**:
  - **Regular Users**: Automatically restricted to viewing only their own transcription sessions (`WHERE user_id = sub`). Accessing sessions of other users returns `403 Forbidden`.
  - **Admin User (`ADMIN_USER_ID`)**: Granted access to all historical sessions across all users, with an active **ADMIN VIEW** badge and a User ID filter box.
- **Diarized Reading View**: Displays each speaker's utterances chronologically with timestamps and distinct speaker badges.
- **Muted Segments Inspection**: Toggle between hiding or displaying speaker segments that the user muted during the live session.
- **Text Export**: Export any session's full transcript as a `.txt` file with speaker numbers and timestamps.
- **Authentication**: Custom Email & Password login, registration, and password reset powered by Firebase Authentication.

---

## Directory Structure

```text
reader/
├── src/
│   ├── api/
│   │   └── client.ts            # Authenticated fetch client for Worker REST endpoints
│   ├── components/
│   │   ├── AuthGuard.tsx        # Custom Firebase Email/Password login gate
│   │   ├── Navbar.tsx           # Header displaying user email/UID, Admin status, and Logout
│   │   ├── SessionList.tsx      # Sidebar listing sessions with search and Admin user filter
│   │   └── SessionDetail.tsx    # Detailed transcript reader with speaker tags and TXT export
│   ├── hooks/
│   │   └── useAuthSession.ts    # Firebase session manager & profile retriever
│   ├── lib/
│   │   └── firebase.ts          # Firebase App & Auth initialization
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── vite.config.ts               # Standard Vite configuration
├── tailwind.config.js
└── package.json
```

---

## Environment Variables

Create `.env` in `reader/` (see `.env.example`):

```ini
VITE_FIREBASE_API_KEY="your-firebase-api-key"
VITE_FIREBASE_AUTH_DOMAIN="your-firebase-project-id.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-firebase-project-id"
VITE_WORKER_API_URL="http://localhost:8787"
```

In production, change `VITE_WORKER_API_URL` to your deployed Cloudflare Worker URL (e.g., `https://kakiokoshi-api.yaluba.org`).

---

## Local Development

```bash
# Start Vite development server at http://localhost:5174
npm run dev
# or from root: npm run dev:reader
```

---

## Production Build

```bash
npm run build
# Generates production bundle in reader/dist/
```
