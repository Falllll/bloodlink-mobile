import { View } from 'react-native';
import { colors, spacing } from '@/theme/tokens';
import { AppText } from './Text';

export type BatchStatus =
  | 'QUARANTINED' | 'TESTING' | 'RELEASED' | 'RESERVED' | 'DISCARDED' | 'EXPIRED';

export interface StatusChipProps { status: BatchStatus; }

export function StatusChip({ status }: StatusChipProps) {
  const fg = colors.status[status === 'EXPIRED' ? 'DISCARDED' : status];
  const background = `${fg}2E`; // 0x2E = 18% alpha, matches web color-mix 18%

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: background,
        borderRadius: 999,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
      }}
    >
      <AppText variant="label" style={{ color: fg, textTransform: 'uppercase' }}>
        {status}
      </AppText>
    </View>
  );
}
