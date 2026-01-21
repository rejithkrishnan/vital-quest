import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGoalsStore } from '@/stores/goalsStore';
import { useAuthStore } from '@/stores/authStore';
import * as Haptics from 'expo-haptics';
import { debounce } from 'lodash';
import { LineChart } from 'react-native-gifted-charts';
import WeightPickerModal from './WeightPickerModal';

export default function WeightLoggingWidget() {
    const { profile } = useAuthStore();
    const { logWeight, isLoading, weightLogs, fetchWeightLogs } = useGoalsStore();

    // Local state
    const [currentWeight, setCurrentWeight] = useState<number>(0);
    const [isSaving, setIsSaving] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);

    // Initial load
    useEffect(() => {
        if (profile?.profile_data?.weight) {
            setCurrentWeight(parseFloat(profile.profile_data.weight));
        } else {
            setCurrentWeight(70.0);
        }
        // Fetch logs if not already populated enough to show chart
        if (!weightLogs || weightLogs.length === 0) {
            fetchWeightLogs();
        }
    }, [profile]);

    // Prepare Chart Data
    const { chartData, yMin, yMax, stepValue } = useMemo(() => {
        let sourceLogs = weightLogs || [];

        // Dummy data backfill logic removed as requested.
        // Chart relies solely on actual logs.

        // Take last 7-14 days
        // Chart needs oldest -> newest (left -> right)
        // Ensure consistent sorting
        const sortedLogs = [...sourceLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const recentLogs = sortedLogs.slice(-14);

        const weights = recentLogs.map(l => Number(l.weight));
        let minWeight = Math.min(...weights);
        let maxWeight = Math.max(...weights);

        // Ensure we don't crash on empty/single data
        if (!isFinite(minWeight)) minWeight = 70;
        if (!isFinite(maxWeight)) maxWeight = 70;

        // Tighter bounds based on actual data
        let yMin = Math.floor(minWeight);
        let yMax = Math.ceil(maxWeight);

        // Ensure distinct min/max for chart rendering
        if (yMin === yMax) {
            yMin -= 1;
            yMax += 1;
        }

        // Adjust range to be divisible by 3 (for 3 sections => 4 labels)
        while ((yMax - yMin) % 3 !== 0) {
            yMax++;
        }

        const stepValue = (yMax - yMin) / 3;

        const data = recentLogs.map(log => ({
            value: Number(log.weight),
            label: new Date(log.date).getDate().toString(),
            dataPointText: Number(log.weight).toFixed(1),
            // Optional: style dummy points differently?
        }));

        return { chartData: data, yMin, yMax, stepValue };
    }, [weightLogs, profile]);

    // Debounced Save
    const debouncedSave = useCallback(
        debounce(async (weight: number) => {
            setIsSaving(true);
            try {
                await useGoalsStore.getState().logWeight(weight);
                // Refetch logs to update chart immediately
                useGoalsStore.getState().fetchWeightLogs();
            } finally {
                setIsSaving(false);
            }
        }, 1500),
        []
    );

    const handleSaveWeight = (newWeight: number) => {
        setCurrentWeight(newWeight);
        debouncedSave(newWeight);
    };

    const hasEnoughData = weightLogs && weightLogs.length >= 3;

    return (
        <View style={styles.container}>
            {/* Split Layout Container */}
            <View style={styles.contentRow}>

                {/* Section 1: Label (20%) */}
                <View style={styles.sectionLabel}>
                    <Ionicons name="scale-outline" size={20} color="#0EA5E9" />
                    <Text style={styles.title}>Weight</Text>
                    {isSaving && <ActivityIndicator size="small" color="#0EA5E9" style={{ marginTop: 4 }} />}
                </View>

                {/* Section 2: Value (40%) */}
                <TouchableOpacity
                    style={styles.sectionValue}
                    onPress={() => setIsModalVisible(true)}
                    activeOpacity={0.7}
                >
                    <Text style={styles.valueText}>
                        {currentWeight.toFixed(1)}
                        <Text style={styles.unitText}> kg</Text>
                    </Text>
                    <Text style={styles.hintText}>Tap to change</Text>
                </TouchableOpacity>

                {/* Section 3: Chart or Placeholder (40%) */}
                <View style={styles.sectionChart}>
                    {hasEnoughData ? (
                        <View style={{ overflow: 'hidden' }}>
                            <LineChart
                                data={chartData}
                                // No areaChart
                                curved
                                height={60} // Slightly reduced height
                                width={100}
                                hideDataPoints={true}
                                // Dynamic Y Axis
                                yAxisOffset={yMin}
                                maxValue={yMax - yMin}
                                stepValue={stepValue}
                                noOfSections={3}

                                // Y-Axis Visibility
                                hideYAxisText={false}
                                yAxisTextStyle={{ color: '#9CA3AF', fontSize: 10 }}
                                yAxisLabelWidth={25}
                                hideRules={true}
                                hideAxesAndRules={false} // Need this false to show Y-axis
                                showVerticalLines={false}
                                xAxisThickness={0}
                                yAxisThickness={0} // Hide the actual line, just show text

                                spacing={20}
                                color="#0EA5E9"
                                thickness={3} // Thicker line
                                initialSpacing={0}
                            />
                        </View>
                    ) : (
                        <Text style={styles.placeholderText}>
                            Add more{'\n'}data to{'\n'}see trends.
                        </Text>
                    )}
                </View>
            </View>

            <WeightPickerModal
                visible={isModalVisible}
                currentWeight={currentWeight}
                onClose={() => setIsModalVisible(false)}
                onSave={handleSaveWeight}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        borderRadius: 24,
        paddingHorizontal: 20,
        paddingVertical: 16,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    contentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 60, // Fixed height to ensure centering works well vertically
    },
    sectionLabel: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: 60,
        zIndex: 5,
    },
    sectionValue: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    sectionChart: {
        width: 120,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 5,
    },
    title: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6B7280',
        marginTop: 4,
    },
    valueText: {
        fontSize: 36, // Bigger font
        fontWeight: '800',
        color: '#111827',
        fontVariant: ['tabular-nums'],
    },
    unitText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#9CA3AF',
    },
    hintText: {
        fontSize: 10,
        color: '#0EA5E9',
        fontWeight: '500',
        marginTop: 2,
    },
    placeholderText: {
        fontSize: 10,
        color: '#9CA3AF',
        textAlign: 'center',
        fontStyle: 'italic',
    },
});
