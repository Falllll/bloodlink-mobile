import { Button, Text, View } from 'react-native';

import { useSession } from '@/lib/auth/session';

export default function ProfileScreen() {
  const { signOut } = useSession();

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <Text>Profil</Text>
      <Button title="Keluar" onPress={() => signOut()} />
    </View>
  );
}
