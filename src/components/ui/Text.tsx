import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { colors } from '@/theme/tokens';
import { typeScale, type TextVariant } from '@/theme/typography';

export interface AppTextProps extends RNTextProps {
  variant?: TextVariant;           // default 'body'
  tone?: keyof typeof colors.ink;  // default 'DEFAULT'
}

export function AppText({ variant = 'body', tone = 'DEFAULT', style, ...rest }: AppTextProps) {
  return (
    <RNText
      style={[typeScale[variant], { color: colors.ink[tone] }, style]}
      {...rest}
    />
  );
}
