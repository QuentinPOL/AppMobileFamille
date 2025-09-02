import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { AuthProvider, useAuth } from './_providers/AuthProvider';

/** Détecte le mode standalone côté Web (PWA installée / iOS A2HS) */
function useStandaloneWeb() {
  const [standalone, setStandalone] = React.useState(false);

  React.useEffect(() => {
    if (Platform.OS !== 'web') return;
    const mql = window.matchMedia?.('(display-mode: standalone)');
    const isIOSStandalone = (navigator as any).standalone === true;
    const compute = () => setStandalone(Boolean(mql?.matches || isIOSStandalone));
    compute();
    const onChange = () => compute();
    mql?.addEventListener?.('change', onChange);
    return () => mql?.removeEventListener?.('change', onChange);
  }, []);

  return standalone;
}

function RootNavigator() {
  const { user, loading } = useAuth();
  const isStandalone = useStandaloneWeb();

  /** 🌐 Web non-installé : exposer UNIQUEMENT /download (== route "download/index") */
  if (Platform.OS === 'web' && !isStandalone) {
    return (
      <Stack screenOptions={{ headerShown: false }} initialRouteName="download/index">
        <Stack.Screen name="download/index" />
        <Stack.Screen name="+not-found" />
      </Stack>
    );
  }

  /** ⏳ Chargement */
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