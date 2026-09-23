import { Pressable, ActivityIndicator, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radii, spacing } from '@/theme/tokens';
import { AppText } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress: () => void | Promise<void>;
  variant?: ButtonVariant;   // default 'primary'
  size?: ButtonSize;         // default 'md'
  loading?: boolean;         // shows spinner AND blocks onPress
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const variantStyles: Record<ButtonVariant, { backgroundColor: string; borderColor?: string }> = {
  primary: { backgroundColor: colors.brand },
  secondary: { backgroundColor: colors.secondary },
  ghost: { backgroundColor: 'transparent', borderColor: colors.ink.faint },
  destructive: { backgroundColor: `${colors.status.DISCARDED}1A` }, // 10% alpha
};

const sizeStyles: Record<ButtonSize, { paddingVertical: number; paddingHorizontal: number }> = {
  md: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  lg: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  accessibilityLabel,
  style,
  testID,
}: ButtonProps) {
  const blocked = loading || disabled;

  return (
    <Pressable
      testID={testID}
      disabled={blocked}
      onPress={() => {
        if (!blocked) void onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: blocked, busy: loading }}
      style={[
        {
          borderRadius: radii.lg,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: variant === 'ghost' ? 1 : 0,
          opacity: blocked ? 0.6 : 1,
        },
        variantStyles[variant],
        sizeStyles[size],
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.ink.strong : colors.brand} />
      ) : (
        <AppText
          variant="label"
          tone={variant === 'destructive' ? undefined : 'strong'}
          style={variant === 'destructive' ? { color: colors.status.DISCARDED } : undefined}
        >
          {label}
        </AppText>
      )}
    </Pressable>
  );
}
