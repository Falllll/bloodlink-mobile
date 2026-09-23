import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radii, surfaces, spacing } from '@/theme/tokens';
import { AppText } from './Text';

export interface CardProps {
  children: ReactNode;
  title?: string;
  footer?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, title, footer, style }: CardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: radii.xl2,
          borderWidth: 1,
          borderColor: surfaces.flat.borderColor,
          padding: spacing.lg,
          gap: spacing.sm,
        },
        style,
      ]}
    >
      {title ? <AppText variant="title">{title}</AppText> : null}
      {children}
      {footer}
    </View>
  );
}
