import { useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  browserLocalPersistence,
  setPersistence,
  type User,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';

const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set persistence to local (survives browser restarts)
    setPersistence(auth, browserLocalPersistence).catch(console.error);

    // Check for redirect result (mobile flow)
    getRedirectResult(auth).catch(console.error);

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    if (isMobile) {
      // Redirect works better on mobile — no popup issues, no storage warnings
      await signInWithRedirect(auth, googleProvider);
    } else {
      await signInWithPopup(auth, googleProvider);
    }
  };

  const logout = () => signOut(auth);

  return { user, loading, signInWithGoogle, logout };
}
