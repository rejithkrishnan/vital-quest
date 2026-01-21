import DailyPlanWidget from '@/components/DailyPlanWidget';
import GoalProgressWidget from '@/components/GoalProgressWidget';
import GamificationWidget from '@/components/GamificationWidget';
import { useAuthStore } from '@/stores/authStore';
import { useGamificationStore } from '@/stores/gamificationStore';
import { useGoalsStore } from '@/stores/goalsStore';
import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const { user } = useAuthStore();
  const { fetchStats } = useGamificationStore();
  const { fetchActiveGoal, fetchDailyPlan } = useGoalsStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();

    // Subscribe to realtime updates
    const unsubscribeGoals = useGoalsStore.getState().subscribeToRealtime();
    const unsubscribeGamification = useGamificationStore.getState().subscribeToRealtime();

    return () => {
      unsubscribeGoals();
      unsubscribeGamification();
    };
  }, []);

  const loadData = async () => {
    await Promise.all([
      fetchStats(),
      fetchActiveGoal(),
      fetchDailyPlan(new Date())
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        contentContainerStyle={{ padding: 24 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
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
