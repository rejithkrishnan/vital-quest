import StepTrackerWidget from '@/components/StepTrackerWidget';
import DailyPlanWidget from '@/components/DailyPlanWidget';
import { useRouter } from 'expo-router';
import GoalProgressWidget from '@/components/GoalProgressWidget';
import DailyBriefingWidget from '@/components/DailyBriefingWidget';

import WaterMonitoringWidget from '@/components/WaterMonitoringWidget';
import GamificationWidget from '@/components/GamificationWidget';
import { useAuthStore } from '@/stores/authStore';
import { useGamificationStore } from '@/stores/gamificationStore';
import { useGoalsStore } from '@/stores/goalsStore';
import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View, RefreshControl, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WeightLoggingWidget from '@/components/WeightLoggingWidget';

export default function HomeScreen() {
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const { fetchStats } = useGamificationStore();
  const { fetchActiveGoal, fetchDailyPlan, fetchWeightLogs } = useGoalsStore();
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
      fetchDailyPlan(new Date()),
      fetchWeightLogs()
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
        <TouchableOpacity
          onPress={() => router.push('/profile')}
          className="flex-row items-center justify-between mb-6"
          activeOpacity={0.7}
        >
          <View>
            <Text className="text-gray-500 font-medium">Welcome back,</Text>
            <Text className="text-3xl font-bold text-gray-900">
              {profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Questor'}
            </Text>
          </View>

          {profile?.avatar_url ? (
            <Image
              source={{ uri: profile.avatar_url }}
              className="w-12 h-12 rounded-full border-2 border-white shadow-sm"
            />
          ) : (
            <View className="w-12 h-12 rounded-full bg-blue-100 items-center justify-center border-2 border-white shadow-sm">
              <Text className="text-blue-600 font-bold text-lg">
                {(profile?.full_name?.[0] || user?.email?.[0] || 'Q').toUpperCase()}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Daily Briefing Widget */}
        <DailyBriefingWidget />

        {/* Goal Progress Widget */}
        <GoalProgressWidget />

        {/* Stats Widget */}
        <GamificationWidget />

        {/* Step Tracker */}
        <View className="mt-4">
          <StepTrackerWidget />
        </View>


        {/* Daily Plan Widget */}
        <View className="mt-6 mb-6">
          <DailyPlanWidget />
        </View>

        {/* Water Intake */}
        <WaterMonitoringWidget />

        {/* Weight Logging (Bottom) */}
        <WeightLoggingWidget />
      </ScrollView>
    </SafeAreaView>
  );
}
