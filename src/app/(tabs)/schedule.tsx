import { View } from 'react-native';

import { AppText } from '@/components/ui/Text';
import { colors } from '@/theme/tokens';

export default function ScheduleScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.base, paddingBottom: 84 }}>
      <AppText variant="title">Jadwal</AppText>
    </View>
  );
}
