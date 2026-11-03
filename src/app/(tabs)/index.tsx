import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EligibilityCard } from '@/components/eligibility/EligibilityCard';
import { PermissionSummary } from '@/components/home/PermissionSummary';
import { OpenInvitationsSummary } from '@/components/invitations/OpenInvitationsSummary';
import { AppText } from '@/components/ui/Text';
import { colors, spacing } from '@/theme/tokens';

export default function BerandaScreen(): React.ReactElement {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.base }}
      contentContainerStyle={{
        gap: spacing.lg,
        padding: spacing.lg,
        paddingTop: insets.top + spacing.xl3 * 2, // clears the offline banner
        paddingBottom: insets.bottom + 84, // clears the tab bar
      }}
    >
      <AppText variant="display">Beranda</AppText>

      {/* The order of a donor's questions: may I donate, am I being called, can I be reached. */}
      <EligibilityCard />
      <OpenInvitationsSummary />
      <PermissionSummary />
    </ScrollView>
  );
}
