import { TextInput, View, type TextInputProps, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radii, spacing } from '@/theme/tokens';
import { AppText } from './Text';

export interface FieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  errorText?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export function Field({ label, errorText, containerStyle, ...inputProps }: FieldProps) {
  return (
    <View style={[{ gap: spacing.xs }, containerStyle]}>
      <AppText variant="label" tone="muted">
        {label}
      </AppText>
      <TextInput
        placeholderTextColor={colors.ink.dim}
        style={{
          color: colors.ink.DEFAULT,
          backgroundColor: colors.secondary,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: errorText ? colors.brand : 'transparent',
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
        }}
        {...inputProps}
      />
      {errorText ? (
        <AppText variant="caption" style={{ color: colors.brand }}>
          {errorText}
        </AppText>
      ) : null}
    </View>
  );
}
