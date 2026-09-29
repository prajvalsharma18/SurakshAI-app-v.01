import { useNavigation } from '@react-navigation/native';
import { StyleSheet, View } from 'react-native';

import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { ScreenContainer } from './ScreenContainer';
import { theme } from '../../theme';
import type { MainStackNavigation } from '../../navigation/MainNavigator';

type FeaturePlaceholderProps = {
  title: string;
  description: string;
};

export function FeaturePlaceholder({
  title,
  description,
}: FeaturePlaceholderProps) {
  const navigation = useNavigation<MainStackNavigation>();

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.content}>
        <AppText variant="title" style={styles.brand}>
          SURAKSHAI
        </AppText>
        <AppText variant="heading" style={styles.heading}>
          {title}
        </AppText>
        <AppText variant="body" style={styles.description}>
          {description}
        </AppText>
        <AppButton
          onPress={() => navigation.goBack()}
          title="Back"
          accessibilityLabel={`Go back from ${title}`}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
  },
  content: {
    gap: theme.spacing.md,
  },
  brand: {
    color: theme.colors.accent,
  },
  heading: {
    color: theme.colors.primary,
  },
  description: {
    color: theme.colors.secondary,
    marginBottom: theme.spacing.md,
  },
});
