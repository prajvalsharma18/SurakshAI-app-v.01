import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useAuth } from '../../auth/AuthContext';
import { AppButton } from '../../components/common/AppButton';
import { AppText } from '../../components/common/AppText';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { SectionHeader } from '../../components/common/SectionHeader';
import { theme } from '../../theme';

export function ProfileScreen() {
  const { session, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  async function handleLogout() {
    setLoggingOut(true);
    setLogoutError(null);
    try {
      await logout();
    } catch {
      setLogoutError('Unable to securely log out. Please try again.');
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.content}>
        <AppText variant="title" style={styles.brand}>
          SURAKSHAI
        </AppText>
        <SectionHeader
          title="Profile"
          description="Your account information and session."
        />
        <View style={styles.details}>
          <ProfileRow label="Username" value={session?.user.username ?? 'Not available'} />
          <ProfileRow label="Role" value={session?.user.role ?? 'Not available'} />
          <ProfileRow
            label="Personnel ID"
            value={session?.user.personnelId ?? 'Not available'}
          />
          <ProfileRow label="Session status" value="Signed in" />
        </View>
        {logoutError ? (
          <AppText
            accessibilityRole="alert"
            variant="bodySmall"
            style={styles.error}
          >
            {logoutError}
          </AppText>
        ) : null}
        <AppButton
          accessibilityLabel="Log out of SURAKSHAI"
          loading={loggingOut}
          onPress={handleLogout}
          title="Log Out"
        />
      </View>
    </ScreenContainer>
  );
}

type ProfileRowProps = {
  label: string;
  value: string;
};

function ProfileRow({ label, value }: ProfileRowProps) {
  return (
    <View style={styles.row}>
      <AppText variant="bodySmall" style={styles.label}>
        {label}
      </AppText>
      <AppText variant="body" style={styles.value}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
  },
  content: {
    gap: theme.spacing.lg,
  },
  brand: {
    color: theme.colors.accent,
  },
  details: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.md,
  },
  row: {
    borderBottomColor: theme.colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.md,
  },
  label: {
    color: theme.colors.mutedText,
  },
  value: {
    color: theme.colors.primary,
  },
  error: {
    color: theme.colors.error,
  },
});
