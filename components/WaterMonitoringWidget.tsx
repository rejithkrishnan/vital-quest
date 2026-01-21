import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useGoalsStore } from '@/stores/goalsStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export default function WaterMonitoringWidget() {
    const { dailyPlan, activeGoal, logWater } = useGoalsStore();
    const { settings, fetchSettings } = useSettingsStore();

    useEffect(() => {
        fetchSettings();
    }, []);

    if (!dailyPlan || !activeGoal) return null;

    const target = activeGoal.daily_water_target || 2000;
    const current = dailyPlan.water_intake || 0;
    const increment = settings.water_increment || 250;
    // Cap progress bar at 100%
    const progressPercent = Math.min((current / target) * 100, 100);

    const handleAdd = () => {
        if (current >= target) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Calculate amount to add, capping exactly at target
        const amountToAdd = Math.min(increment, target - current);
        if (amountToAdd > 0) {
            logWater(amountToAdd);
        }
    };

    const handleRemove = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        logWater(-increment);
    };

    return (
        <View className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex-row items-center justify-between mb-6">
            {/* Left Side: Title & Progress */}
            <View className="flex-1 mr-4">
                <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-gray-900 font-bold text-lg">Hydration</Text>
                    <View className="flex-row items-center">
                        {current > 0 && (
                            <TouchableOpacity onPress={handleRemove} className="mr-3 p-1">
                                <Ionicons name="remove-circle-outline" size={18} color="#9CA3AF" />
                            </TouchableOpacity>
                        )}
                        <Text className="text-blue-500 text-xs font-medium">
                            {current} / {target}ml
                        </Text>
                    </View>
                </View>
                <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <View
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${progressPercent}%` }}
                    />
                </View>
            </View>

            {/* Right Side: Add Button (Styled like Streak Badge) */}
            <TouchableOpacity
                onPress={handleAdd}
                className="bg-blue-50 px-4 py-2 rounded-2xl items-center border border-blue-100 active:bg-blue-100"
            >
                <View className="flex-row items-center gap-1">
                    <Ionicons name="water" size={18} color="#3B82F6" />
                    <Text className="text-blue-600 font-bold text-lg">+</Text>
                </View>
                <Text className="text-blue-400 text-[10px] font-bold uppercase tracking-wider">Add</Text>
            </TouchableOpacity>
        </View>
    );
}
