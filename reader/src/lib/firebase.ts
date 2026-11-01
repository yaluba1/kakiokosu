import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY?.trim() || '';
const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim() || '';
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim() || '';

export const isFirebaseConfigured = Boolean(
  apiKey &&
    projectId &&
    apiKey !== 'your-firebase-api-key' &&
    projectId !== 'your-firebase-project-id'
);

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;

if (isFirebaseConfigured) {
  const firebaseConfig = {
    apiKey,
    authDomain: authDomain || `${projectId}.firebaseapp.com`,
    projectId,
  };

  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  authInstance = getAuth(app);
}

export const auth = authInstance;

