// app/(tabs)/_layout.tsx
import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { useAuth } from '../_providers/AuthProvider';

/** Renvoie le display-mode courant: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser' */
function getWebDisplayMode(): 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser' {
  if (typeof window === 'undefined' || Platform.OS !== 'web') return 'browser';
  try {
    const modes = ['standalone', 'fullscreen', 'minimal-ui'] as const;
    for (const m of modes) {
      if (window.matchMedia?.(`(display-mode: ${m})`).matches) return m;
    }
    return 'browser';
  } catch {
    return 'browser';
  }
}

/** Hook: observe le display-mode web */
function useWebDisplayMode() {
  const [mode, setMode] = React.useState<'standalone' | 'fullscreen' | 'minimal-ui' | 'browser'>(() => getWebDisplayMode());

  React.useEffect(() => {
    if (Platform.OS !== 'web') return;

    const mqls = ['standalone', 'fullscreen', 'minimal-ui']
      .map((m) => window.matchMedia?.(`(display-mode: ${m})`))
      .filter(Boolean) as MediaQueryList[];

    const recompute = () => setMode(getWebDisplayMode());

    for (const mql of mqls) mql.addEventListener?.('change', recompute);
    window.addEventListener('visibilitychange', recompute);

    return () => {
      for (const mql of mqls) mql.removeEventListener?.('change', recompute);
      window.removeEventListener('visibilitychange', recompute);
    };
  }, []);

  return mode;
}

export default function TabsLayout() {
  const { user, loading } = useAuth();
  const webMode = useWebDisplayMode();

  // 🌐 Navigateur web non-installé → on renvoie vers la page de download
  const isWebBrowser =
    Platform.OS === 'web' &&
    webMode === 'browser' &&
    // iOS A2HS (Safari) n'est pas en "browser" si installé
    (typeof navigator === 'undefined' || (navigator as any).standalone !== true);

  if (isWebBrowser) return <Redirect href="/download" />;

  // ⏳ Pendant la réhydratation du token
  if (loading) return null;

  // 🔒 Pas de session → on force le /login
  if (!user) return <Redirect href="/login" />;

  // ✅ Session OK → on rend les onglets
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="explore" options={{ title: 'Explore' }} />
    </Tabs>
  );
}