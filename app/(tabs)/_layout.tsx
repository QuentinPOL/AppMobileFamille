// app/(tabs)/_layout.tsx
import { Redirect, Tabs } from 'expo-router';
import { useAuth } from '../_providers/AuthProvider';

export default function TabsLayout() {
  const { user, loading } = useAuth();

  // Pendant la réhydratation du token
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