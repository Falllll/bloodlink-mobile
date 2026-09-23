import { View } from 'react-native';

import { AppText } from '@/components/ui/Text';
import { colors } from '@/theme/tokens';

export default function BerandaScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.base, paddingBottom: 84 }}>
      <AppText variant="title">Beranda</AppText>
    </View>
  );
}
