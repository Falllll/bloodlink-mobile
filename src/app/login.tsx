import { useState } from 'react';
import { Alert, Button, TextInput, View } from 'react-native';

import { ApiFailure } from '@/lib/api/client';
import { useSession } from '@/lib/auth/session';

export default function LoginScreen() {
  const { signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit() {
    try {
      await signIn(email, password);
    } catch (err) {
      if (err instanceof ApiFailure) {
        const code = err.body.error.code;
        if (code === 'UNAUTHENTICATED') {
          Alert.alert('Email atau kata sandi salah');
        } else if (code === 'TOO_MANY_REQUESTS') {
          Alert.alert('Terlalu banyak percobaan, tunggu sebentar');
        } else {
          Alert.alert(`Gagal masuk (${code})`);
        }
        return;
      }
      throw err;
    }
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 12 }}>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        placeholder="Kata sandi"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button title="Masuk" onPress={handleSubmit} />
    </View>
  );
}
