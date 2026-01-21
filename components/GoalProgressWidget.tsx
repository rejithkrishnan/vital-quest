import { View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { CustomAlert as Alert } from '@/utils/CustomAlert';
import React, { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useGoalsStore } from '@/stores/goalsStore';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

// Using StyleSheet instead of className to avoid NativeWind + navigation context issues
export default function GoalProgressWidget() {
    const { activeGoal, isLoading, fetchActiveGoal, deleteGoal } = useGoalsStore();

    useEffect(() => {
        fetchActiveGoal();
    }, []);

    const handleStartPlan = () => {
        router.push({ pathname: '/(tabs)/chat', params: { action: 'create_plan' } });
    };

    const handleMenuPress = () => {
        if (!activeGoal) return;

        Alert.alert(
            'Goal Options',
            activeGoal.ai_summary || 'Manage your goal',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete Goal',
                    style: 'destructive',
                    onPress: () => {
                        Alert.alert(
                            'Delete Goal?',
                            'This will permanently delete your goal and all associated plans.',
                            [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                    text: 'Delete',
                                    style: 'destructive',
                                    onPress: async () => {
                                        try {
                                            await deleteGoal(activeGoal.id);
                                            Alert.alert('Success', 'Goal deleted successfully');
                                        } catch (e: any) {
                                            Alert.alert('Error', 'Failed to delete goal: ' + e.message);
                                        }
                                    }
                                }
                            ]
                        );
                    }
                }
            ]
        );
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer} />
        );
    }

    if (!activeGoal) {
        return (
            <LinearGradient
                colors={['#4285F4', '#34A853']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.emptyContainer}
            >
                <View style={styles.emptyContent}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.emptyTitle}>No Active Goal</Text>
                        <Text style={styles.emptySubtitle}>
                            Let's create a personalized plan to reach your health targets.
                        </Text>
                        <Pressable onPress={handleStartPlan} style={styles.startButton}>
                            <Text style={styles.startButtonText}>Start Plan ✨</Text>
                        </Pressable>
                    </View>
                    <View style={styles.iconContainer}>
                        <Ionicons name="compass-outline" size={32} color="white" />
                    </View>
                </View>
            </LinearGradient>
        );
    }

    const weeksProgress = 1;
    const progressPercent = Math.min((weeksProgress / activeGoal.duration_weeks) * 100, 100);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.label}>Current Goal</Text>
                    <Text style={styles.title}>
                        {activeGoal.goal_type === 'weight_loss' ? `Lose ${Math.abs(activeGoal.target_value - activeGoal.start_value)} ${activeGoal.target_unit}` : 'Maintain Health'}
                    </Text>
                </View>
                <TouchableOpacity onPress={handleMenuPress}>
                    <Ionicons name="ellipsis-horizontal" size={20} color="#9CA3AF" />
                </TouchableOpacity>
            </View>

            <View style={styles.progressSection}>
                <View style={styles.progressLabels}>
                    <Text style={styles.progressText}>Week {weeksProgress} of {activeGoal.duration_weeks}</Text>
                    <Text style={styles.progressPercent}>{Math.round(progressPercent)}%</Text>
                </View>
                <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
                </View>
            </View>

            <View style={styles.statsRow}>
                <View style={styles.stat}>
                    <Text style={styles.statLabel}>Target</Text>
                    <Text style={styles.statValue}>{activeGoal.target_value} {activeGoal.target_unit}</Text>
                </View>
                <View style={styles.stat}>
                    <Text style={styles.statLabel}>Daily Cal</Text>
                    <Text style={styles.statValue}>{activeGoal.daily_calorie_target ? `${activeGoal.daily_calorie_target} kcal` : '--'}</Text>
                </View>
                <View style={[styles.stat, { borderRightWidth: 0 }]}>
                    <Text style={styles.statLabel}>Protein</Text>
                    <Text style={styles.statValue}>{activeGoal.protein_target || '--'}g</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        height: 160,
        backgroundColor: '#E5E7EB',
        borderRadius: 16,
    },
    emptyContainer: {
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    emptyContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    emptyTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    emptySubtitle: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 14,
        marginBottom: 16,
    },
    startButton: {
        backgroundColor: 'white',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 999,
        alignSelf: 'flex-start',
    },
    startButtonText: {
        color: '#4285F4',
        fontWeight: 'bold',
        fontSize: 14,
    },
    iconContainer: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        padding: 12,
        borderRadius: 999,
    },
    container: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        color: '#4285F4',
        textTransform: 'uppercase',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        marginTop: 4,
    },
    progressSection: {
        marginBottom: 8,
    },
    progressLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    progressText: {
        color: '#6B7280',
        fontSize: 12,
    },
    progressPercent: {
        color: '#111827',
        fontSize: 12,
        fontWeight: 'bold',
    },
    progressBar: {
        height: 8,
        backgroundColor: '#F3F4F6',
        borderRadius: 999,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#4285F4',
        borderRadius: 999,
    },
    statsRow: {
        flexDirection: 'row',
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#F9FAFB',
    },
    stat: {
        flex: 1,
        alignItems: 'center',
        borderRightWidth: 1,
        borderRightColor: '#F3F4F6',
    },
    statLabel: {
        color: '#9CA3AF',
        fontSize: 12,
        textAlign: 'center',
        marginBottom: 4,
    },
    statValue: {
        fontWeight: 'bold',
        color: '#111827',
    },
});
