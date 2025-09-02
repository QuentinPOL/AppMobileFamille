// app/register.tsx
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';
import { z } from 'zod';
import { useAuth } from './_providers/AuthProvider';

const schema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Mot de passe trop court (min 8)'),
  name: z.string().max(100).optional(), // ou .min(1) si requis
});

type FieldErrs = { email?: string; password?: string; name?: string };

export default function RegisterScreen() {
  const router = useRouter();
  const { authFetch, signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrs>({});

  async function onSubmit() {
    setErrors({});

    const toValidate = {
      email: email.trim().toLowerCase(),
      password,
      name: name.trim() || undefined,
    };

    const parsed = schema.safeParse(toValidate);
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors;
      setErrors({ email: f.email?.[0], password: f.password?.[0], name: f.name?.[0] });
      return;
    }

    setLoading(true);
    try {
      const res = await authFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(parsed.data),
      });

      const text = await res.text();
      let data: any = {};
      try { data = text ? JSON.parse(text) : {}; } catch {}

      if (!res.ok) {
        if (res.status === 422 && data?.fieldErrors) {
          setErrors({
            email: data.fieldErrors.email?.[0],
            password: data.fieldErrors.password?.[0],
            name: data.fieldErrors.name?.[0],
          });
          throw new Error(
            data.fieldErrors.email?.[0] ||
            data.fieldErrors.password?.[0] ||
            data.fieldErrors.name?.[0] ||
            'Veuillez vérifier les champs.'
          );
        }
        if (res.status === 409 && data?.error) {
          setErrors((e) => ({ ...e, email: data.error }));
          throw new Error(data.error);
        }
        throw new Error(data?.error || 'Inscription impossible');
      }

      // ➜ Auto-login juste après l’inscription
      await signIn(parsed.data.email, parsed.data.password);
      Alert.alert('Bienvenue 👋', 'Compte créé et connecté !');
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, padding: 20, gap: 12, justifyContent: 'center', backgroundColor: 'white' }}>
      <Text style={{ fontSize: 26, fontWeight: '600', marginBottom: 8 }}>Créer un compte</Text>

      <Text>Nom</Text>
      <TextInput
        autoCapitalize="words"
        placeholder="John Doe"
        value={name}
        onChangeText={(t) => { setName(t); setErrors((e) => ({ ...e, name: undefined })); }}
        style={{ borderWidth: 1, borderRadius: 8, padding: 12, borderColor: errors.name ? '#ef4444' : '#d1d5db' }}
      />
      {!!errors.name && <Text style={{ color: '#ef4444' }}>{errors.name}</Text>}

      <Text>Email</Text>
      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="email@domaine.com"
        value={email}
        onChangeText={(t) => { setEmail(t); setErrors((e) => ({ ...e, email: undefined })); }}
        style={{ borderWidth: 1, borderRadius: 8, padding: 12, borderColor: errors.email ? '#ef4444' : '#d1d5db' }}
      />
      {!!errors.email && <Text style={{ color: '#ef4444' }}>{errors.email}</Text>}

      <Text>Mot de passe</Text>
      <TextInput
        secureTextEntry
        placeholder="********"
        value={password}
        onChangeText={(t) => { setPassword(t); setErrors((e) => ({ ...e, password: undefined })); }}
        style={{ borderWidth: 1, borderRadius: 8, padding: 12, borderColor: errors.password ? '#ef4444' : '#d1d5db' }}
      />
      {!!errors.password && <Text style={{ color: '#ef4444' }}>{errors.password}</Text>}

      <Pressable
        onPress={onSubmit}
        disabled={loading}
        style={{ backgroundColor: '#111827', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 8, opacity: loading ? 0.7 : 1 }}
      >
        {loading ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: '600' }}>S’inscrire</Text>}
      </Pressable>

      <Pressable onPress={() => router.push('/login')} style={{ marginTop: 8 }}>
        <Text style={{ color: '#2563eb' }}>Déjà un compte ? Se connecter</Text>
      </Pressable>
    </View>
  );
}