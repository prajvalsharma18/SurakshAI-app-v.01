import {
  createBottomTabNavigator,
  type BottomTabNavigationProp,
} from '@react-navigation/bottom-tabs';
import {
  createNativeStackNavigator,
  type NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import type { CompositeNavigationProp } from '@react-navigation/native';
import { StyleSheet } from 'react-native';

import { ConsentScreen } from '../screens/consent/ConsentScreen';
import { AlertDetailScreen } from '../screens/alerts/AlertDetailScreen';
import { AlertsScreen } from '../screens/alerts/AlertsScreen';
import { HomeScreen } from '../screens/home/HomeScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { RecommendationsScreen } from '../screens/recommendations/RecommendationsScreen';
import { SupportScreen } from '../screens/support/SupportScreen';
import { RiskExplanationScreen } from '../screens/risk/RiskExplanationScreen';
import { RiskHistoryScreen } from '../screens/risk/RiskHistoryScreen';
import { RiskScreen } from '../screens/risk/RiskScreen';
import { WellnessScreen } from '../screens/wellness/WellnessScreen';
import { theme } from '../theme';
import type {
  MainStackParamList,
  MainTabParamList,
} from '../types/navigation';

export type HomeNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
  NativeStackNavigationProp<MainStackParamList>
>;

const Stack = createNativeStackNavigator<MainStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.mutedText,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarAccessibilityLabel: `${route.name} tab`,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="Wellness" component={WellnessScreen} />
      <Stack.Screen name="Risk" component={RiskScreen} />
      <Stack.Screen name="RiskHistory" component={RiskHistoryScreen} />
      <Stack.Screen name="RiskExplanation" component={RiskExplanationScreen} />
      <Stack.Screen
        name="Recommendations"
        component={RecommendationsScreen}
      />
      <Stack.Screen name="Alerts" component={AlertsScreen} />
      <Stack.Screen name="AlertDetail" component={AlertDetailScreen} />
      <Stack.Screen name="Consent" component={ConsentScreen} />
      <Stack.Screen name="Support" component={SupportScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: theme.colors.surface,
    borderTopColor: theme.colors.border,
    height: 64,
    paddingBottom: theme.spacing.sm,
    paddingTop: theme.spacing.xs,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export type MainTabNavigation = BottomTabNavigationProp<
  MainTabParamList,
  'Home'
>;

export type MainStackNavigation = NativeStackNavigationProp<MainStackParamList>;
