import { View, Text, TouchableOpacity } from 'react-native';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface PlanHeaderProps {
    date: Date;
    calories: {
        target: number;
        consumed: number;
        burned: number;
    };
    macros: {
        protein: { current: number; target: number };
        carbs: { current: number; target: number };
        fat: { current: number; target: number };
    };
    onPressCalendar?: () => void;
}

export default function PlanHeader({ date, calories, macros, onPressCalendar }: PlanHeaderProps) {
    const remaining = calories.target - calories.consumed + calories.burned;

    return (
        <View className="mb-6">
            <View className="flex-row justify-between items-center mb-4">
                <View>
                    <Text className="text-gray-500 font-medium uppercase tracking-wider text-xs">
                        Daily Target
                    </Text>
                    <Text className="text-2xl font-bold text-gray-900">
                        {date.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' })}
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={onPressCalendar}
                    className="bg-gray-100 p-2 rounded-full"
                >
                    <Ionicons name="calendar-outline" size={20} color="#374151" />
                </TouchableOpacity>
            </View>

            <View className="rounded-[32px] overflow-hidden shadow-xl elevation-5 bg-gray-900">
                <LinearGradient
                    colors={['#1F2937', '#111827']}
                    className="p-5"
                >
                    <View className="flex-row justify-between items-center mb-6">
                        <View>
                            <Text className="text-gray-400 text-xs mb-1">Calories Remaining</Text>
                            <Text className="text-4xl font-bold text-white tracking-tight">{remaining}</Text>
                        </View>
                        <View className="items-end">
                            <Text className="text-gray-400 text-xs mb-1">Target: {calories.target}</Text>
                            <Text className="text-green-400 text-xs font-semibold">
                                {calories.consumed} in · {calories.burned} out
                            </Text>
                        </View>
                    </View>

                    {/* Macros */}
                    <View className="flex-row gap-4">
                        <MacroBar label="Protein" current={macros.protein.current} target={macros.protein.target} color="bg-blue-500" />
                        <MacroBar label="Carbs" current={macros.carbs.current} target={macros.carbs.target} color="bg-green-500" />
                        <MacroBar label="Fat" current={macros.fat.current} target={macros.fat.target} color="bg-yellow-500" />
                    </View>
                </LinearGradient>
            </View>
        </View>
    );
}

function MacroBar({ label, current, target, color }: { label: string; current: number; target: number; color: string }) {
    const percent = Math.min((current / target) * 100, 100);
    return (
        <View className="flex-1">
            <View className="flex-row justify-between mb-1">
                <Text className="text-gray-400 text-[10px]">{label}</Text>
                <Text className="text-white text-[10px] font-medium">{current}/{target}g</Text>
            </View>
            <View className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <View className={`h-full ${color}`} style={{ width: `${percent}%` }} />
            </View>
        </View>
    );
}
