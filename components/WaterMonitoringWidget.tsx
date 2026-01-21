import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useGoalsStore } from '@/stores/goalsStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';

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
    const progress = Math.min(1, current / target);
    const percentage = Math.round(progress * 100);

    const handleAdd = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        logWater(increment);
    };

    const handleRemove = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        logWater(-increment);
    };

    return (
        <View style={styles.container}>
            {/* Left: Icon & Label */}
            <View style={styles.leftSection}>
                <View style={styles.iconBg}>
                    <Ionicons name="water" size={18} color="#3B82F6" />
                </View>
                <View>
                    <Text style={styles.title}>Hydration</Text>
                    <Text style={styles.value}>
                        <Text style={styles.currentVal}>{current}</Text>
                        <Text style={styles.targetVal}> / {target}ml</Text>
                    </Text>
                </View>
            </View>

            {/* Middle: Progress Bar (Mini) */}
            <View style={styles.middleSection}>
                <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${percentage}%` }]} />
                </View>
            </View>

            {/* Right: Controls (+ Only usually, or +/- compact) */}
            <View style={styles.rightSection}>
                <TouchableOpacity onPress={handleRemove} style={styles.buttonSmall}>
                    <Ionicons name="remove" size={16} color="#6B7280" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleAdd} style={styles.buttonAdd}>
                    <Ionicons name="add" size={18} color="white" />
                    {/* Optional: Show amount on long press? sticking to simple UI */}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
        flexDirection: 'row', // Single line layout
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 2, // Take space
    },
    iconBg: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: '#EFF6FF', // blue-50
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    value: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    currentVal: {
        fontWeight: 'bold',
        color: '#3B82F6',
    },
    targetVal: {
        color: '#9CA3AF',
    },

    middleSection: {
        flex: 1.5,
        height: 8,
        backgroundColor: '#F3F4F6',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarBg: {
        flex: 1,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#3B82F6',
        borderRadius: 4,
    },

    rightSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    buttonSmall: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonAdd: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: '#3B82F6',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
});
