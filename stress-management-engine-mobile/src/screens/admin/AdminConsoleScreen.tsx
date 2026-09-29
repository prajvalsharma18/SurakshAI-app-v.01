import { useNavigation } from '@react-navigation/native';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useAuth } from '../../auth/AuthContext';
import { AppButton } from '../../components/common/AppButton';
import { AppText } from '../../components/common/AppText';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import type { AdminTrainingStackParamList } from '../../types/navigation';
import { theme } from '../../theme';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type AdminNavigation = NativeStackNavigationProp<AdminTrainingStackParamList>;

export function AdminConsoleScreen() {
  const navigation = useNavigation<AdminNavigation>();
  const { logout } = useAuth();

  return (
    <ScreenContainer style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <AppText variant="title" style={styles.brand}>SURAKSHAI</AppText>
          <AppText variant="heading" style={styles.heading}>Model Training Console</AppText>
          <AppText variant="body">
            Create and review candidate risk models. Training will not replace the
            active model unless you explicitly promote a candidate.
          </AppText>
        </View>
        <AppButton
          title="Training Chat"
          accessibilityLabel="Open training chat"
          onPress={() => navigation.navigate('TrainingChat')}
        />
        <AppButton
          title="Training Jobs"
          accessibilityLabel="Open training jobs"
          onPress={() => navigation.navigate('TrainingJobs')}
        />
        <AppButton
          title="Model Versions"
          accessibilityLabel="Open model versions"
          onPress={() => navigation.navigate('ModelVersions')}
        />
        <AppButton title="Logout" accessibilityLabel="Log out of admin console" onPress={() => void logout()} />
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
    flexGrow: 1,
    gap: theme.spacing.md,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  header: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  brand: {
    color: theme.colors.accent,
  },
  heading: {
    color: theme.colors.primary,
  },
});
