import { StyleSheet, View } from 'react-native';

import { AppText } from '../common/AppText';
import { theme } from '../../theme';
import type { CurrentRisk } from '../../types/risk';

function getRiskStyle(category: CurrentRisk['riskCategory']) {
  if (category === 'HIGH') {
    return {
      backgroundColor: '#FDECEC',
      borderColor: theme.colors.error,
      textColor: theme.colors.error,
    };
  }

  if (category === 'ELEVATED') {
    return {
      backgroundColor: '#FFF7E6',
      borderColor: '#D89D2E',
      textColor: '#9A6700',
    };
  }

  return {
    backgroundColor: '#ECF9F3',
    borderColor: theme.colors.success,
    textColor: theme.colors.success,
  };
}

export function RiskStatusCard({ risk }: { risk: CurrentRisk }) {
  const style = getRiskStyle(risk.riskCategory);

  return (
    <View style={[styles.container, { borderColor: style.borderColor, backgroundColor: style.backgroundColor }]}>
      <AppText variant="bodySmall" style={styles.label}>Current welfare risk</AppText>
      <AppText variant="title" style={[styles.value, { color: style.textColor }]}>
        {risk.riskCategory}
      </AppText>
      <AppText variant="bodySmall" style={styles.meta}>
        Model-estimated risk category
      </AppText>
      {risk.dataMode ? (
        <AppText variant="bodySmall" style={styles.meta}>
          Based on the available {risk.dataMode === 'OPERATIONAL_AND_WELLNESS' ? 'operational and wellness data' : 'operational data'}.
        </AppText>
      ) : null}
      {risk.modelVersion ? (
        <AppText variant="bodySmall" style={styles.meta}>
          Model version: {risk.modelVersion}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    gap: theme.spacing.xs,
    padding: theme.spacing.lg,
  },
  label: {
    color: theme.colors.secondary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  value: {
    fontWeight: '700',
  },
  meta: {
    color: theme.colors.secondary,
  },
});
