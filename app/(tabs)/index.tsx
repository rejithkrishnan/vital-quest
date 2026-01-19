import DailyPlanWidget from '@/components/DailyPlanWidget';
import GoalProgressWidget from '@/components/GoalProgressWidget';
import GamificationWidget from '@/components/GamificationWidget';
import { useAuthStore } from '@/stores/authStore';
import { useGamificationStore } from '@/stores/gamificationStore';
import { useEffect } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const { user } = useAuthStore();
  const { fetchStats } = useGamificationStore();

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        {/* Header */}
        <View className="mb-6">
          <Text className="text-gray-500 font-medium">Welcome back,</Text>
          <Text className="text-3xl font-bold text-gray-900">{user?.user_metadata?.full_name?.split(' ')[0] || 'Questor'}</Text>
        </View>

        {/* Goal Progress Widget */}
        <GoalProgressWidget />

        {/* Stats Widget */}
        <GamificationWidget />

        {/* Daily Plan Widget */}
        <View className="mt-6">
          <DailyPlanWidget />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
