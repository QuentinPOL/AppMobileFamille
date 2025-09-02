// app/_providers/AuthProvider.tsx
import * as SecureStore from 'expo-secure-store';
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL!;

type User = { id: string; email: string; name?: string | null; createdAt: string };

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  authFetch: (path: string, init?: RequestInit, timeoutMs?: number) => Promise<Response>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** ---- Storage unifié (SecureStore natif, localStorage web) ---------------- */
const storage = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') {
      try { return (typeof window !== 'undefined') ? window.localStorage.getItem(key) : null; }
      catch { return null; }
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      try { (typeof window !== 'undefined') && window.localStorage.setItem(key, value); }
      catch {}
      return;
    }
    return SecureStore.setItemAsync(key, value);
  },
  deleteItem: async (key: string) => {
    if (Platform.OS === 'web') {
      try { (typeof window !== 'undefined') && window.localStorage.removeItem(key); }
      catch {}
      return;
    }
    return SecureStore.deleteItemAsync(key);
  },
};

/** ---- fetch avec timeout -------------------------------------------------- */
function fetchWithTimeout(url: string, opts: RequestInit = {}, ms = 10000) {
  return Promise.race([
    fetch(url, opts),
    new Promise<Response>((_, rej) => setTimeout(() => rej(new Error('Timeout API')), ms)),
  ]);
}

/** ---- Provider ------------------------------------------------------------ */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Boot: lire le token et tenter /me
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const t = await storage.getItem('token');
        if (!mounted) return;

        if (!t) {
          setUser(null);
          setToken(null);
          return;
        }

        setToken(t);

        const res = await fetchWithTimeout(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${t}` },
        });

        if (res.ok) {
          const data = await res.json();
          if (!mounted) return;
          setUser(data.user as User);
        } else {
          await storage.deleteItem('token');
          if (!mounted) return;
          setToken(null);
          setUser(null);
        }
      } catch {
        await storage.deleteItem('token');
        if (mounted) {
          setToken(null);
          setUser(null);
        }
      } finally {
        mounted && setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const signIn = async (email: string, password: string) => {
    const res = await fetchWithTimeout(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });

    const text = await res.text();
    let data: any = {};
    try { data = text ? JSON.parse(text) : {}; } catch { /* no-op */ }

    if (!res.ok) throw new Error(data?.error || 'Connexion impossible');

    if (data.token) {
      await storage.setItem('token', data.token);
      setToken(data.token);
    }
    setUser((data.user ?? null) as User | null);
    return true;
  };

  const signOut = async () => {
    await storage.deleteItem('token');
    setToken(null);
    setUser(null);
  };

  // fetch "automatique" qui ajoute Bearer + base URL
  const authFetch = async (path: string, init: RequestInit = {}, timeoutMs = 10000) => {
    const headers = new Headers(init.headers || {});
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (!headers.has('Content-Type') && init.body) headers.set('Content-Type', 'application/json');

    return fetchWithTimeout(`${API_URL}${path}`, { ...init, headers }, timeoutMs);
  };

  const value = useMemo<AuthContextType>(
    () => ({ user, token, loading, signIn, signOut, authFetch }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

/** 👇 export default pour satisfaire l’avertissement expo-router */
export default AuthProvider;