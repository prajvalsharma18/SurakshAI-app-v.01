import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../auth/AuthContext';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { SplashScreen } from '../screens/splash/SplashScreen';
import { MainNavigator } from './MainNavigator';
import { AdminTrainingNavigator } from './AdminTrainingNavigator';
import type { RootStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { authStatus, session } = useAuth();

  if (authStatus === 'INITIALIZING') {
    return <SplashScreen />;
  }

  if (
    authStatus !== 'AUTHENTICATED' ||
    !session ||
    (session.user.role !== 'PERSONNEL' && session.user.role !== 'ADMIN')
  ) {
    return (
      <Stack.Navigator
        key="UNAUTHENTICATED"
        screenOptions={{ headerShown: false, gestureEnabled: false }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
      </Stack.Navigator>
    );
  }

  const isAdmin = session.user.role === 'ADMIN';
  const AuthenticatedNavigator = isAdmin
    ? AdminTrainingNavigator
    : MainNavigator;

  return (
    <Stack.Navigator
      key={`${authStatus}-${session.user.role}`}
      screenOptions={{ headerShown: false, gestureEnabled: false }}
    >
      <Stack.Screen
        name="Authenticated"
        component={AuthenticatedNavigator}
      />
    </Stack.Navigator>
  );
}
