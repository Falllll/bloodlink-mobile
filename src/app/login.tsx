import { useState } from 'react';
import { Alert, View } from 'react-native';

import { ApiFailure } from '@/lib/api/client';
import { useSession } from '@/lib/auth/session';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { colors, spacing } from '@/theme/tokens';

export default function LoginScreen() {
  const { signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
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
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.base }}>
      <GlassPanel style={{ padding: spacing.xl, gap: spacing.md }}>
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Field
          label="Kata sandi"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <Button label="Masuk" onPress={handleSubmit} loading={submitting} />
      </GlassPanel>
    </View>
  );
}
