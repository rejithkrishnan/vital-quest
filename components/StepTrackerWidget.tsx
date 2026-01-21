import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Linking, Platform } from 'react-native';
import { useSensorStore } from '@/stores/sensorStore';
import { Ionicons } from '@expo/vector-icons';

const DAILY_STEP_GOAL = 10000;

export default function StepTrackerWidget() {
    const { steps, isPedometerAvailable, startTracking, stopTracking, permissionStatus, requestPermission } = useSensorStore();

    useEffect(() => {
        startTracking();
        return () => stopTracking();
    }, []);

    const openSettings = () => {
        if (Platform.OS === 'ios') {
            Linking.openURL('app-settings:');
        } else {
            Linking.openSettings();
        }
    };

    const handleEnable = () => {
        requestPermission();
    }

    // Permission Denied State
    if (permissionStatus === 'denied') {
        return (
            <View className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex-row items-center justify-between mb-6">
                <View className="flex-row items-center flex-1">
                    <Ionicons name="footsteps-outline" size={20} color="#EF4444" />
                    <View className="ml-3">
                        <Text className="text-gray-900 font-bold text-sm">Step Tracking Disabled</Text>
                        <Text className="text-gray-500 text-xs">Permission required</Text>
                    </View>
                </View>
                <TouchableOpacity
                    onPress={handleEnable}
                    className="bg-red-50 px-3 py-2 rounded-xl border border-red-100"
                >
                    <Text className="text-red-500 text-xs font-bold">Enable</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Don't render if pedometer is not available (hardware issue, but permission granted)
    if (isPedometerAvailable === false) {
        return (
            <View className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex-row items-center justify-center mb-6">
                <Ionicons name="footsteps-outline" size={20} color="#9CA3AF" />
                <Text className="text-gray-400 ml-2 text-sm">Step tracking not available on this device</Text>
            </View>
        );
    }

    // Show loading state while checking availability
    if (isPedometerAvailable === null) {
        return (
            <View className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex-row items-center justify-center mb-6">
                <Text className="text-gray-400 text-sm">Checking step tracker...</Text>
            </View>
        );
    }

    const progressPercent = Math.min((steps / DAILY_STEP_GOAL) * 100, 100);

    return (
        <View className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex-row items-center justify-between mb-6">
            {/* Left Side: Title & Progress */}
            <View className="flex-1 mr-4">
                <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-gray-900 font-bold text-lg">Steps</Text>
                    <Text className="text-green-500 text-xs font-medium">
                        {steps.toLocaleString()} / {DAILY_STEP_GOAL.toLocaleString()}
                    </Text>
                </View>
                <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <View
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${progressPercent}%` }}
                    />
                </View>
            </View>

            {/* Right Side: Steps Badge */}
            <View className="bg-green-50 px-3 py-2 rounded-2xl items-center border border-green-100">
                <View className="flex-row items-center gap-1">
                    <Ionicons name="footsteps" size={18} color="#22C55E" />
                </View>
                <Text className="text-green-400 text-[10px] font-bold uppercase tracking-wider">Today</Text>
            </View>
        </View>
    );
}
