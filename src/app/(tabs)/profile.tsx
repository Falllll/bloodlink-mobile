import { Button, View } from 'react-native';

import { AppText } from '@/components/ui/Text';
import { useSession } from '@/lib/auth/session';
import { colors } from '@/theme/tokens';

export default function ProfileScreen() {
  const { signOut } = useSession();

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: colors.base, paddingBottom: 84 }}>
      <AppText variant="title">Profil</AppText>
      <Button title="Keluar" onPress={() => signOut()} />
    </View>
  );
}
