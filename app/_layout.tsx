import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { AuthProvider, useAuth } from './_providers/AuthProvider';

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

/** Détecte le mode d’affichage Web et s’abonne aux changements */
function useWebDisplayMode() {
  const [mode, setMode] = React.useState<'standalone' | 'fullscreen' | 'minimal-ui' | 'browser'>(() => getWebDisplayMode());

  React.useEffect(() => {
    if (Platform.OS !== 'web') return;

    const mqls = ['standalone', 'fullscreen', 'minimal-ui'].map((m) =>
      window.matchMedia?.(`(display-mode: ${m})`)
    ).filter(Boolean) as MediaQueryList[];

    const recompute = () => setMode(getWebDisplayMode());

    for (const mql of mqls) mql.addEventListener?.('change', recompute);
    // Fallback: certains navigateurs n’émettent pas 'change'
    window.addEventListener('visibilitychange', recompute);

    return () => {
      for (const mql of mqls) mql.removeEventListener?.('change', recompute);
      window.removeEventListener('visibilitychange', recompute);
    };
  }, []);

  return mode;
}

function RootNavigator() {
  const { user, loading } = useAuth();
  const webMode = useWebDisplayMode();
  const isWebBrowser = Platform.OS === 'web' && webMode === 'browser';

  /** 🌐 Web non-installé (display-mode: browser) → on n’expose QUE /download */
  if (isWebBrowser) {
    return (
      <Stack screenOptions={{ headerShown: false }} initialRouteName="download/index">
        <Stack.Screen name="download/index" />
        <Stack.Screen name="+not-found" />
      </Stack>
    );
  }

  /** ⏳ Chargement (réhydratation du token) */
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white' }}>
        <ActivityIndicator />
      </View>
    );
  }

  /** 🔒 Non connecté → login/register uniquement */
  if (!user) {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="+not-found" />
      </Stack>
    );
  }

  /** ✅ Connecté → l’app (tabs) */
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider value={DefaultTheme}>
      <AuthProvider>
        <RootNavigator />
        <StatusBar style="auto" />
      </AuthProvider>
    </ThemeProvider>
  );
}