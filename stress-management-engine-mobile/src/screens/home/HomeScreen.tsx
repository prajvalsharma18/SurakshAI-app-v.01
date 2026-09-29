import { useNavigation } from '@react-navigation/native';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useAuth } from '../../auth/AuthContext';
import { QuickActionCard } from '../../components/cards/QuickActionCard';
import { WelfareCard } from '../../components/cards/WelfareCard';
import { AppText } from '../../components/common/AppText';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { SectionHeader } from '../../components/common/SectionHeader';
import { OfflineState } from '../../components/states/OfflineState';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import type { HomeNavigation } from '../../navigation/MainNavigator';
import { theme } from '../../theme';

export function HomeScreen() {
  const { session } = useAuth();
  const { isOnline } = useNetworkStatus();
  const navigation = useNavigation<HomeNavigation>();
  const username = session?.user.username;

  return (
    <ScreenContainer edges={['top', 'left', 'right']} style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <AppText variant="title" style={styles.brand}>
            SURAKSHAI
          </AppText>
          <AppText variant="heading" style={styles.greeting}>
            Hello{username ? `, ${username}` : ''}
          </AppText>
          <AppText variant="body" style={styles.subtitle}>
            Your wellbeing matters. Support is here when you need it.
          </AppText>
        </View>
        <OfflineState isOnline={isOnline} />

        <View style={styles.section}>
          <SectionHeader
            title="My Welfare"
            description="A private space for your wellbeing and support."
          />
          <WelfareCard
            title="Current Status"
            description="Your welfare information will appear here."
          />
          <WelfareCard
            title="Recent Check-in"
            description="Not available yet."
          />
          <QuickActionCard
            title="Support / Follow-up"
            description="Request human welfare support and view follow-up status."
            onPress={() => navigation.navigate('Support')}
          />
        </View>

        <View style={styles.section}>
          <SectionHeader
            title="Quick Actions"
            description="Explore available support features."
          />
          <QuickActionCard
            title="Wellness Check-in"
            description="A personal wellbeing check-in."
            onPress={() => navigation.navigate('Wellness')}
          />
          <QuickActionCard
            title="My Welfare Status"
            description="Your personal welfare information."
            onPress={() => navigation.navigate('Risk')}
          />
          <QuickActionCard
            title="Recommendations"
            description="Personalized welfare guidance from the support system."
            onPress={() => navigation.navigate('Recommendations')}
          />
          <QuickActionCard
            title="Support Alerts"
            description="View welfare support alerts shared with you."
            onPress={() => navigation.navigate('Alerts')}
          />
          <QuickActionCard
            title="My Consent"
            description="Review and manage your data permissions."
            onPress={() => navigation.navigate('Consent')}
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  content: {
    gap: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
  header: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
  },
  brand: {
    color: theme.colors.accent,
  },
  greeting: {
    color: theme.colors.primary,
  },
  subtitle: {
    color: theme.colors.secondary,
  },
  section: {
    gap: theme.spacing.md,
  },
});
