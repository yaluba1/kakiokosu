import { useState, useEffect, useCallback } from 'react';
import { onIdTokenChanged, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

export interface AuthUser {
  id: string;
  email?: string;
}

export function useAuthSession() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(auth));

  const refresh = useCallback(async () => {
    if (!auth || !auth.currentUser) {
      setToken(null);
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const idToken = await auth.currentUser.getIdToken();
      setToken(idToken);
      setUser({
        id: auth.currentUser.uid,
        email: auth.currentUser.email || undefined,
      });
    } catch (err) {
      console.warn('Error refreshing Firebase ID token:', err);
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!auth) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const idToken = await firebaseUser.getIdToken();
          setToken(idToken);
          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email || undefined,
          });
        } catch (err) {
          console.warn('Error reading Firebase ID token:', err);
          setToken(null);
          setUser(null);
        }
      } else {
        setToken(null);
        setUser(null);
      }
      setIsLoading(false);
    });

    // Proactively refresh token every 50 minutes (Firebase tokens last 60m)
    const interval = setInterval(() => {
      if (auth?.currentUser) {
        auth.currentUser.getIdToken(true).catch(() => {});
      }
    }, 50 * 60 * 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const logout = useCallback(async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      setToken(null);
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  }, []);

  return {
    token,
    user,
    isLoading,
    isAuthenticated: Boolean(token),
    logout,
    refresh,
  };
}

