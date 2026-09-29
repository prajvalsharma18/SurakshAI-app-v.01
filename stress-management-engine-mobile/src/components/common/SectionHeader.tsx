import { StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { theme } from '../../theme';

type SectionHeaderProps = {
  title: string;
  description?: string;
};

export function SectionHeader({ title, description }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <AppText variant="title" style={styles.title}>
        {title}
      </AppText>
      {description ? (
        <AppText variant="bodySmall" style={styles.description}>
          {description}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.xs,
  },
  title: {
    color: theme.colors.primary,
  },
  description: {
    color: theme.colors.secondary,
  },
});
