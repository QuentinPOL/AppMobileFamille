import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';
import { z } from 'zod';
import { useAuth } from './_providers/AuthProvider';

const schema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Mot de passe trop court (min 8)'),
});

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errs, setErrs] = useState<{ email?: string; password?: string }>({});

  async function onSubmit() {
    setErrs({});
    const parsed = schema.safeParse({ email: email.trim().toLowerCase(), password });
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors;
      setErrs({ email: f.email?.[0], password: f.password?.[0] });
      return;
    }

    setLoading(true);
    try {
      await signIn(parsed.data.email, parsed.data.password);
      Alert.alert('Connecté', `Bienvenue 👋`);
      router.replace('/(tabs)'); // ton groupe d'onglets
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || 'Connexion impossible');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, padding: 20, gap: 12, justifyContent: 'center', backgroundColor: 'white' }}>
      <Text style={{ fontSize: 26, fontWeight: '600', marginBottom: 8 }}>Se connecter</Text>

      <Text>Email</Text>
      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="email@domaine.com"
        value={email}
        onChangeText={(t) => { setEmail(t); setErrs((e) => ({ ...e, email: undefined })); }}
        style={{ borderWidth: 1, borderRadius: 8, padding: 12, borderColor: errs.email ? '#ef4444' : '#d1d5db' }}
      />
      {!!errs.email && <Text style={{ color: '#ef4444' }}>{errs.email}</Text>}

      <Text>Mot de passe</Text>
      <TextInput
        secureTextEntry
        placeholder="********"
        value={password}
        onChangeText={(t) => { setPassword(t); setErrs((e) => ({ ...e, password: undefined })); }}
        style={{ borderWidth: 1, borderRadius: 8, padding: 12, borderColor: errs.password ? '#ef4444' : '#d1d5db' }}
      />
      {!!errs.password && <Text style={{ color: '#ef4444' }}>{errs.password}</Text>}

      <Pressable
        onPress={onSubmit}
        disabled={loading}
        style={{ backgroundColor: '#111827', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 8, opacity: loading ? 0.7 : 1 }}
      >
        {loading ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: '600' }}>Se connecter</Text>}
      </Pressable>

      <Pressable onPress={() => router.push('/register')} style={{ marginTop: 8 }}>
        <Text style={{ color: '#2563eb' }}>Pas de compte ? S’inscrire</Text>
      </Pressable>
    </View>
  );
}