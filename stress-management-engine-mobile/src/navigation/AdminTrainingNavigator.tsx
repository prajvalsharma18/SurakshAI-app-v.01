import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { AdminTrainingStackParamList } from '../types/navigation';
import { AdminConsoleScreen } from '../screens/admin/AdminConsoleScreen';
import { AdminTrainingChatScreen } from '../screens/admin/AdminTrainingChatScreen';
import { ModelVersionsScreen } from '../screens/admin/ModelVersionsScreen';
import { TrainingJobsScreen } from '../screens/admin/TrainingJobsScreen';

const Stack = createNativeStackNavigator<AdminTrainingStackParamList>();

export function AdminTrainingNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Console"
      screenOptions={{ headerShown: false, gestureEnabled: false }}
    >
      <Stack.Screen name="Console" component={AdminConsoleScreen} />
      <Stack.Screen name="TrainingChat" component={AdminTrainingChatScreen} />
      <Stack.Screen name="TrainingJobs" component={TrainingJobsScreen} />
      <Stack.Screen name="ModelVersions" component={ModelVersionsScreen} />
    </Stack.Navigator>
  );
}
