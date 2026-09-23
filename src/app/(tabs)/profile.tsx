import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { AppText } from '@/components/ui/Text';
import { useSession } from '@/lib/auth/session';
import { colors, spacing } from '@/theme/tokens';

export default function ProfileScreen() {
  const { signOut } = useSession();
  const [leaving, setLeaving] = useState(false);

  async function handleSignOut() {
    setLeaving(true);
    try {
      await signOut();
    } finally {
      setLeaving(false);
    }
  }

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, backgroundColor: colors.base, paddingBottom: 84 }}>
      <AppText variant="title">Profil</AppText>
      <Button label="Keluar" variant="destructive" onPress={handleSignOut} loading={leaving} />
    </View>
  );
}
