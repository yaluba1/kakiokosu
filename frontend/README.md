# Kakiokoshi Real-Time Transcription PWA

The primary Progressive Web App (PWA) tailored for elderly and users with hearing difficulties. It captures live microphone audio, streams it over WebSockets to the Cloudflare Worker, and renders real-time transcription with speaker diarization.

---

## Core Features

- **Elderly-First Accessibility**: Extra-large, high-contrast typography (`Normal`, `Large`, `Extra Large`), high-contrast dark theme, and single-tap actions.
- **Custom Firebase Email/Password Authentication**: Accessible high-contrast login, registration, and password reset form powered by the modular Firebase Auth SDK.
- **AudioWorklet PCM Capture**: Captures 16kHz 16-bit mono PCM chunks via `public/audio-processor.js` with hardware noise suppression, auto gain control, and acoustic echo cancellation.
- **Diarization & "Tap-to-Mute"**: Chat bubbles are color-coded and labeled by speaker ID (`User 1`, `User 2`, ...). Tapping any bubble instantly mutes that speaker (filtering out the user's own voice) and communicates the filter to the backend.
- **Main User Voice Fingerprint (Auto-Mute)**: Supports enrolling the main user's voice via a 2-second long-press button in the header menu. Uses client-side ONNX voiceprint embeddings (`ecapa_tdnn_int8.onnx` via `onnxruntime-web` WASM SIMD) when supported by the handset, and automatically falls back to Acoustic Pitch ($F_0$) Fingerprinting on devices without WASM SIMD. Once enrolled, the main user's voice is automatically recognized and muted in live sessions without needing to tap a bubble.
- **Muted Speakers Recovery Bar**: Shows all active muted speakers at the top with a one-tap unmute button in case of accidental taps.
- **Multilingual Support**: Supports 11 languages (Guess/Multilingual code-switching, Japanese, English, French, German, Portuguese, Spanish, Arabic, Hebrew, Catalan, Italian) persisted in `localStorage`.
- **Screen Wake Lock**: Automatically requests a screen wake lock while transcribing so phone/tablet screens remain on.
- **PWA Standalone Mode**: Configured with `vite-plugin-pwa` for installation on iOS, Android, and Desktop with offline caching and seamless portrait/landscape rotation.

---

## Main User Voice Fingerprint (Auto-Mute)

The application features a fully client-side voice fingerprinting engine that allows the primary user to store an acoustic profile of their own voice. During live conversations, the app automatically identifies which speaker in the Deepgram diarization stream is the main user and mutes their utterances in real time, preventing the user's own speech from cluttering the screen without requiring manual "Tap-to-Mute" interactions.

### 1. Protection Against Accidental Activation
- **2-Second Long-Press Unlock**: To protect elderly users against accidental configuration changes, the fingerprint icon in the top [Header.tsx](src/components/Header.tsx) is locked by default.
- **Visual Progress Ring**: Holding the button for >2.0 seconds displays an animated circular progress indicator before opening the management modal ([FingerprintButton.tsx](src/components/FingerprintButton.tsx)).
- **Auto-Relock Lifecycle**: The button automatically re-locks whenever a recording session begins, the browser tab loses focus, document visibility becomes hidden, or the window is unloaded.

### 2. Enrollment Workflow
1. The user opens the Voice ID modal ([FingerprintModal.tsx](src/components/FingerprintModal.tsx)) and taps "Start Recording".
2. The helper [recordOwnerAudio.ts](src/utils/recordOwnerAudio.ts) captures 5 seconds of 16kHz 16-bit mono PCM audio through the microphone, displaying live RMS audio level metering and a countdown progress bar.
3. Voice activity and pitch validation verify that at least 10 voiced speech frames and a valid fundamental frequency ($F_0$) were recorded, rejecting silence, ambient noise, coughs, or clicks.

### 3. Dual-Engine Capability Detection
The system automatically determines the best extraction method supported by the device via [FingerprintContext.tsx](src/context/FingerprintContext.tsx):
- **Primary — Client-Side ONNX Embedding (`ecapa_tdnn_int8.onnx`)**:
  - Checks for WebAssembly SIMD support via `canRunWasmSimd()`.
  - If supported, loads an INT8-quantized ECAPA-TDNN neural network model (`/models/ecapa_tdnn_int8.onnx`) with single-threaded WebAssembly execution (ensuring compatibility with Firebase Auth popups without demanding `Cross-Origin-Opener-Policy` headers).
  - Generates a normalized 192-dimensional speaker embedding vector entirely within the browser.
- **Fallback — Acoustic Pitch ($F_0$) Fingerprinting**:
  - Automatically activated if the browser or hardware lacks WebAssembly SIMD support or if ONNX session initialization fails.
  - Extracts the speaker's fundamental frequency ($F_0$) profile using autocorrelation pitch tracking, determining the median pitch in Hz (85–255 Hz) and interquartile pitch spread.

### 4. Storage Architecture & Privacy
- **100% Client-Side Storage**: The generated voiceprint is persisted exclusively in the browser's `localStorage` under the key `kakiokoshi_owner_fp` (with legacy fallback to `kakiokosu_owner_fp`).
- **Zero Cloud Exposure**: Raw audio recordings and voiceprint feature vectors are never transmitted to the Cloudflare Worker, Deepgram, or any external service.
- **Stored Data Schema** ([storage.ts](src/utils/storage.ts)):
  ```typescript
  export interface StoredVoiceprint {
    version: 1;
    method: 'onnx' | 'pitch';
    /** 192-dimensional normalized speaker embedding vector (Solution 1) */
    embedding: number[] | null;
    /** Median fundamental frequency F0 in Hz (Solution 2) */
    ownerPitchHz: number;
    /** Interquartile spread of F0 in Hz */
    pitchSpreadHz: number;
    createdAt: number;
  }
  ```
- **Lifecycle & Persistence**: The stored voiceprint is automatically retrieved from `localStorage` when the application initializes. Users can re-record to update the voiceprint or permanently delete it through the modal with a confirmation check.

### 5. Runtime Recognition & Auto-Muting
- While transcribing, incoming 16kHz PCM audio is continuously buffered in a synchronized rolling buffer ([useAudioBuffer.ts](src/hooks/useAudioBuffer.ts)).
- When Deepgram returns finalized diarized utterances, the audio slice matching each speaker block is extracted and evaluated against the stored fingerprint ([useTranscription.ts](src/hooks/useTranscription.ts) & [ownerMatcher.ts](src/utils/ownerMatcher.ts)):
  - **Voiced Frame Check**: Requires at least 6 voiced frames (~120ms) to ignore non-speech acoustic artifacts.
  - **ONNX Matching**: Evaluated via cosine similarity (`cosineSim(emb, fingerprint) > 0.70`).
  - **Pitch Matching**: Evaluated by checking if the utterance pitch is within $\pm 30$ Hz of `ownerPitchHz`.
- Upon a positive match, that diarized speaker ID is saved as the main user's speaker ID, automatically appended to `mutedSpeakers` to hide their conversation bubbles, and synchronized to the backend worker.

---

## Directory Structure

```text
frontend/
├── public/
│   ├── models/
│   │   └── ecapa_tdnn_int8.onnx # Client-side ONNX speaker embedding model
│   ├── audio-processor.js       # AudioWorkletProcessor downsampling & Float32 -> Int16 PCM conversion
│   └── favicon.svg              # High-contrast microphone app icon
├── src/
│   ├── components/
│   │   ├── AuthGuard.tsx        # Custom accessible Firebase Email/Password login gate
│   │   ├── FingerprintButton.tsx# Long-press (>2s) header button with color/greyscale icon state
│   │   ├── FingerprintModal.tsx # 5s voice enrollment, change, and removal confirmation modal
│   │   ├── Header.tsx           # High-contrast top bar with Voice ID, Font Size, and Settings
│   │   ├── LanguageModal.tsx    # Accessible language selector modal
│   │   ├── MutedSpeakersBar.tsx # Bar displaying muted speakers with one-tap unmute
│   │   └── TranscriptView.tsx   # Auto-scrolling conversation view with Tap-to-Mute
│   ├── constants/
│   │   └── languages.ts         # Supported transcription languages
│   ├── context/
│   │   └── FingerprintContext.tsx# Capability detection (Solution 1 ONNX / Solution 2 Pitch F0) & state
│   ├── hooks/
│   │   ├── useAudioBuffer.ts    # Rolling 16kHz PCM buffer synced with WebSocket timestamps
│   │   ├── useAuthSession.ts    # Firebase authentication state and ID token retriever
│   │   └── useTranscription.ts  # Media stream, AudioWorklet, and WebSocket lifecycle hook
│   ├── lib/
│   │   └── firebase.ts          # Firebase App & Auth singleton initialization
│   ├── types/
│   │   └── transcription.ts     # Deepgram and transcript utterance types
│   ├── utils/
│   │   ├── ownerMatcher.ts      # ONNX 192-dim embedding & F0 autocorrelation pitch matcher
│   │   ├── recordOwnerAudio.ts  # 5-second microphone capture helper for enrollment
│   │   ├── storage.ts           # localStorage persistence for voiceprint data
│   │   └── transcriptionUtils.ts# Speaker word grouping and isolated glitch smoothing
│   ├── App.tsx                  # Main app layout
│   ├── main.tsx
│   └── index.css                # TailwindCSS + elderly accessibility rules
├── vite.config.ts               # Vite + React + VitePWA configuration
├── tailwind.config.js
└── package.json
```

---

## Environment Variables

Create `.env` in `frontend/` (see `.env.example`):

```ini
VITE_FIREBASE_API_KEY="your-firebase-api-key"
VITE_FIREBASE_AUTH_DOMAIN="your-firebase-project-id.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-firebase-project-id"
VITE_WORKER_WS_URL="ws://localhost:8787"
```

In production, change `VITE_WORKER_WS_URL` to your deployed Cloudflare Worker WebSocket URL (e.g., `wss://kakiokoshi-api.yaluba.org`).

---

## Local Development

```bash
# Start Vite development server at http://localhost:5173
npm run dev
# or from root: npm run dev:frontend
```

---

## Production Build

```bash
npm run build
# Generates production bundle and PWA service worker in frontend/dist/
```
