import { useState, useEffect, useCallback } from 'react';
import { onIdTokenChanged, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { fetchMe, MeResponse } from '../api/client';

export function useAuthSession() {
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<MeResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(auth));

  const updateSession = useCallback(async () => {
    if (!auth || !auth.currentUser) {
      setToken(null);
      setProfile(null);
      setIsLoading(false);
      return;
    }

    try {
      const currentToken = await auth.currentUser.getIdToken();
      setToken(currentToken);

      if (currentToken) {
        try {
          const me = await fetchMe(currentToken);
          setProfile(me);
        } catch (e) {
          console.warn('Could not fetch /api/me:', e);
          setProfile({
            userId: auth.currentUser.uid,
            isAdmin: false,
            email: auth.currentUser.email || undefined,
          });
        }
      }
    } catch (err) {
      console.warn('Firebase session error:', err);
      setToken(null);
      setProfile(null);
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
          const currentToken = await firebaseUser.getIdToken();
          setToken(currentToken);

          try {
            const me = await fetchMe(currentToken);
            setProfile(me);
          } catch (e) {
            console.warn('Could not fetch /api/me:', e);
            setProfile({
              userId: firebaseUser.uid,
              isAdmin: false,
              email: firebaseUser.email || undefined,
            });
          }
        } catch (err) {
          console.warn('Error reading Firebase ID token:', err);
          setToken(null);
          setProfile(null);
        }
      } else {
        setToken(null);
        setProfile(null);
      }
      setIsLoading(false);
    });

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
      setProfile(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  }, []);

  return {
    token,
    profile,
    isLoading,
    isAuthenticated: Boolean(token),
    logout,
    refresh: updateSession,
  };
}

