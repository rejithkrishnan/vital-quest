import { View, Text, TouchableOpacity, StyleSheet, Pressable, ScrollView, LayoutChangeEvent, Dimensions, useWindowDimensions } from 'react-native';
import { CustomAlert as Alert } from '@/utils/CustomAlert';
import React, { useEffect, useState, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useGoalsStore } from '@/stores/goalsStore';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

export default function GoalProgressWidget() {
    const { activeGoal, isLoading, fetchActiveGoal, deleteGoal, dailyPlan, tasks, fetchDailyPlan, weeklyPlans, fetchWeeklyPlans } = useGoalsStore();
    const [activePage, setActivePage] = useState(0);
    const [containerWidth, setContainerWidth] = useState(0);
    const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
    const [weekIndex, setWeekIndex] = useState(0);
    const scrollRef = useRef<ScrollView>(null);
    const { width: windowWidth } = useWindowDimensions();

    const scrollToPage = (pageIndex: number) => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ x: pageIndex * containerWidth, animated: true });
            setActivePage(pageIndex);
        }
    };

    useEffect(() => {
        fetchActiveGoal();
        fetchDailyPlan(new Date());
    }, []);

    useEffect(() => {
        if (activeGoal?.id) {
            fetchWeeklyPlans(activeGoal.id).then(() => {
                if (activeGoal.start_date) {
                    const now = new Date();
                    const start = new Date(activeGoal.start_date);
                    const diffTime = now.getTime() - start.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    const current = Math.max(0, Math.ceil(diffDays / 7) - 1);
                    setWeekIndex(current);
                }
            });
        }
    }, [activeGoal?.id]);


    const handleLayout = (event: LayoutChangeEvent) => {
        const { width } = event.nativeEvent.layout;
        setContainerWidth(width);
    };

    const handleScroll = (event: any) => {
        if (containerWidth === 0) return;
        const scrollX = event.nativeEvent.contentOffset.x;
        const page = Math.round(scrollX / containerWidth);
        setActivePage(page);
    };

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

    const formatDate = (dateStr: string | null | undefined) => {
        if (!dateStr) return '--';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return '--';
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

    // Calculate end date if missing
    let endDateDisplay = formatDate(activeGoal.target_date);
    if (endDateDisplay === '--' && activeGoal.start_date && activeGoal.duration_weeks) {
        const start = new Date(activeGoal.start_date);
        start.setDate(start.getDate() + (activeGoal.duration_weeks * 7));
        endDateDisplay = formatDate(start.toISOString());
    }

    // Calculate Daily Stats (reusing logic from plans.tsx)
    const consumed = tasks
        .filter(t => t.task_type === 'nutrition' && t.is_completed)
        .reduce((sum, t) => sum + (t.metadata?.calories || 0), 0);

    const proteinConsumed = tasks
        .filter(t => t.task_type === 'nutrition' && t.is_completed)
        .reduce((sum, t) => sum + (t.metadata?.protein || 0), 0);

    const carbsConsumed = tasks
        .filter(t => t.task_type === 'nutrition' && t.is_completed)
        .reduce((sum, t) => sum + (t.metadata?.carbs || 0), 0);

    const fatConsumed = tasks
        .filter(t => t.task_type === 'nutrition' && t.is_completed)
        .reduce((sum, t) => sum + (t.metadata?.fat || 0), 0);

    const renderPage1Content = () => (
        <>
            <View style={styles.header}>
                <View>
                    <Text style={styles.label}>Current Goal</Text>
                    <Text style={styles.title}>
                        {activeGoal.goal_type === 'weight_loss' ? `Lose ${Math.abs(activeGoal.target_value - activeGoal.start_value)} ${activeGoal.target_unit}` : 'Health Journey'}
                    </Text>
                </View>
                <TouchableOpacity onPress={handleMenuPress}>
                    <Ionicons name="ellipsis-horizontal" size={20} color="#9CA3AF" />
                </TouchableOpacity>
            </View>

            <View style={styles.weightRow}>
                <View style={styles.weightItem}>
                    <Text style={styles.weightLabel}>Start</Text>
                    <Text style={styles.weightValue}>{activeGoal.start_value}</Text>
                    <Text style={styles.weightUnit}>{activeGoal.target_unit}</Text>
                </View>
                <View style={styles.weightDivider}>
                    <Ionicons name="arrow-forward" size={16} color="#D1D5DB" />
                </View>
                <View style={styles.weightItem}>
                    <Text style={styles.weightLabel}>Current</Text>
                    <Text style={[styles.weightValue, { color: '#4285F4' }]}>{activeGoal.start_value}</Text>
                    <Text style={styles.weightUnit}>{activeGoal.target_unit}</Text>
                </View>
                <View style={styles.weightDivider}>
                    <Ionicons name="arrow-forward" size={16} color="#D1D5DB" />
                </View>
                <View style={styles.weightItem}>
                    <Text style={styles.weightLabel}>Target</Text>
                    <Text style={[styles.weightValue, { color: '#34A853' }]}>{activeGoal.target_value}</Text>
                    <Text style={styles.weightUnit}>{activeGoal.target_unit}</Text>
                </View>
            </View>

            <View style={styles.dateRow}>
                <View style={styles.dateItem}>
                    <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                    <Text style={styles.dateText}>{formatDate(activeGoal.start_date)} - {endDateDisplay}</Text>
                </View>
                <Text style={styles.durationText}>{activeGoal.duration_weeks} weeks</Text>
            </View>


            {activeGoal.ai_summary && (
                <View style={styles.summaryContainer}>
                    <Text
                        style={styles.summary}
                        numberOfLines={isSummaryExpanded ? undefined : 3}
                    >
                        {activeGoal.ai_summary}
                    </Text>
                    <TouchableOpacity
                        onPress={() => setIsSummaryExpanded(!isSummaryExpanded)}
                        style={styles.expandButton}
                    >
                        <Text style={styles.expandText}>
                            {isSummaryExpanded ? 'Show Less' : 'Read More'}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}
        </>
    );

    const renderPage2Content = () => (
        <>
            <View style={styles.header}>
                <View>
                    <Text style={styles.label}>Nutritional Targets</Text>
                    <Text style={styles.title}>Daily Goals</Text>
                </View>
            </View>

            <View style={styles.macroGrid}>
                <View style={styles.macroItem}>
                    <View style={[styles.macroIcon, { backgroundColor: '#FEF3C7' }]}>
                        <Ionicons name="flame-outline" size={20} color="#F59E0B" />
                    </View>
                    <Text style={styles.macroValue} numberOfLines={1} adjustsFontSizeToFit>
                        {consumed} / {dailyPlan?.calorie_target || activeGoal.daily_calorie_target || '--'}
                    </Text>
                    <Text style={styles.macroLabel}>Calories</Text>
                </View>
                <View style={styles.macroItem}>
                    <View style={[styles.macroIcon, { backgroundColor: '#DBEAFE' }]}>
                        <Ionicons name="fish-outline" size={20} color="#3B82F6" />
                    </View>
                    <Text style={styles.macroValue} numberOfLines={1} adjustsFontSizeToFit>
                        {proteinConsumed} / {dailyPlan?.protein_target || activeGoal.protein_target || '--'}g
                    </Text>
                    <Text style={styles.macroLabel}>Protein</Text>
                </View>
                <View style={styles.macroItem}>
                    <View style={[styles.macroIcon, { backgroundColor: '#D1FAE5' }]}>
                        <Ionicons name="leaf-outline" size={20} color="#10B981" />
                    </View>
                    <Text style={styles.macroValue} numberOfLines={1} adjustsFontSizeToFit>
                        {carbsConsumed} / {dailyPlan?.carbs_target || activeGoal.carbs_target || '--'}g
                    </Text>
                    <Text style={styles.macroLabel}>Carbs</Text>
                </View>
                <View style={styles.macroItem}>
                    <View style={[styles.macroIcon, { backgroundColor: '#FCE7F3' }]}>
                        <Ionicons name="water-outline" size={20} color="#EC4899" />
                    </View>
                    <Text style={styles.macroValue} numberOfLines={1} adjustsFontSizeToFit>
                        {fatConsumed} / {dailyPlan?.fat_target || activeGoal.fat_target || '--'}g
                    </Text>
                    <Text style={styles.macroLabel}>Fat</Text>
                </View>
            </View>
        </>
    );

    const renderPage3Content = () => {
        const currentWeekPlan = weeklyPlans[weekIndex];
        const maxWeek = (activeGoal?.duration_weeks || 1) - 1;

        return (
            <>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.label}>Weekly Roadmap</Text>
                        <Text style={styles.title}>Week {weekIndex + 1}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 16 }}>
                        <TouchableOpacity onPress={() => setWeekIndex(Math.max(0, weekIndex - 1))} disabled={weekIndex === 0}>
                            <Ionicons name="chevron-back" size={24} color={weekIndex === 0 ? "#E5E7EB" : "#4B5563"} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setWeekIndex(Math.min(maxWeek, weekIndex + 1))} disabled={weekIndex === maxWeek}>
                            <Ionicons name="chevron-forward" size={24} color={weekIndex === maxWeek ? "#E5E7EB" : "#4B5563"} />
                        </TouchableOpacity>
                    </View>
                </View>

                {currentWeekPlan ? (
                    <View style={{ gap: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>
                                Focus: {currentWeekPlan.focus_areas}
                            </Text>
                            <View style={{ backgroundColor: currentWeekPlan.status === 'completed' ? '#DCFCE7' : '#DBEAFE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                                <Text style={{ fontSize: 10, color: currentWeekPlan.status === 'completed' ? '#166534' : '#1E40AF', fontWeight: 'bold', paddingHorizontal: 6, paddingVertical: 2 }}>
                                    {currentWeekPlan.status?.toUpperCase() || 'UPCOMING'}
                                </Text>
                            </View>
                        </View>

                        <View style={{ backgroundColor: '#F9FAFB', padding: 12, borderRadius: 12 }}>
                            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
                                <Ionicons name="bulb-outline" size={16} color="#F59E0B" />
                                <Text style={{ fontSize: 12, fontWeight: '600', color: '#4B5563' }}>Expert Tip</Text>
                            </View>
                            <Text style={{ fontSize: 13, color: '#6B7280', lineHeight: 18 }}>
                                {currentWeekPlan.ai_tips || "Stay consistent with your routine this week!"}
                            </Text>
                        </View>

                        <View style={styles.weightRow}>
                            <View style={styles.weightItem}>
                                <Text style={styles.weightLabel}>Cals</Text>
                                <Text style={[styles.weightValue, { fontSize: 18 }]}>{currentWeekPlan.calorie_target}</Text>
                            </View>
                            <View style={styles.weightDivider} />
                            <View style={styles.weightItem}>
                                <Text style={styles.weightLabel}>Start</Text>
                                <Text style={[styles.weightValue, { fontSize: 18 }]}>{formatDate(currentWeekPlan.week_start_date)}</Text>
                            </View>
                        </View>
                    </View>
                ) : (
                    <View style={{ alignItems: 'center', padding: 20 }}>
                        <Text style={{ color: '#9CA3AF' }}>No plan data for this week.</Text>
                    </View>
                )}
            </>
        );
    };

    const isWide = windowWidth > 768;

    // Fallback width calculation for initial render or when onLayout hasn't fired
    const fallbackWidth = windowWidth - 48; // 24px padding on each side from parent
    const effectiveWidth = containerWidth > 0 ? containerWidth : fallbackWidth;

    // Unified Wide Layout (Desktop/Web)
    const renderWideLayout = () => (
        <View style={styles.wideDashboard}>
            {/* Left Section: Progress & Details */}
            <View style={styles.wideLeftSection}>
                <View style={styles.wideHeader}>
                    <View>
                        <Text style={styles.label}>Current Goal</Text>
                        <Text style={styles.wideTitle}>{activeGoal.goal_type === 'weight_loss' ? 'Weight Loss Plan' : 'Health Journey'}</Text>
                        <Text style={styles.wideSubtitle}>
                            {activeGoal.goal_type === 'weight_loss' ? `Target: Lose ${Math.abs(activeGoal.target_value - activeGoal.start_value)} ${activeGoal.target_unit}` : 'Maintain & Improve'}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={handleMenuPress} style={styles.menuButton}>
                        <Ionicons name="ellipsis-horizontal" size={24} color="#9CA3AF" />
                    </TouchableOpacity>
                </View>

                <View style={styles.wideWeightContainer}>
                    <View style={styles.wideWeightBox}>
                        <Text style={styles.wideWeightLabel}>Start</Text>
                        <Text style={styles.wideWeightValue}>{activeGoal.start_value}<Text style={styles.wideWeightUnit}>{activeGoal.target_unit}</Text></Text>
                    </View>
                    <View style={styles.wideArrowFn}>
                        <Ionicons name="chevron-forward" size={24} color="#D1D5DB" />
                    </View>
                    <View style={styles.wideWeightBox}>
                        <Text style={styles.wideWeightLabel}>Current</Text>
                        <Text style={[styles.wideWeightValue, { color: '#4285F4' }]}>{activeGoal.start_value}<Text style={styles.wideWeightUnit}>{activeGoal.target_unit}</Text></Text>
                    </View>
                    <View style={styles.wideArrowFn}>
                        <Ionicons name="chevron-forward" size={24} color="#D1D5DB" />
                    </View>
                    <View style={styles.wideWeightBox}>
                        <Text style={styles.wideWeightLabel}>Target</Text>
                        <Text style={[styles.wideWeightValue, { color: '#34A853' }]}>{activeGoal.target_value}<Text style={styles.wideWeightUnit}>{activeGoal.target_unit}</Text></Text>
                    </View>
                </View>

                {activeGoal.ai_summary && (
                    <View style={styles.wideSummaryContainer}>
                        <Text
                            style={styles.wideSummary}
                            numberOfLines={isSummaryExpanded ? undefined : 4}
                        >
                            {activeGoal.ai_summary}
                        </Text>
                        <TouchableOpacity
                            onPress={() => setIsSummaryExpanded(!isSummaryExpanded)}
                            style={styles.expandButton}
                        >
                            <Text style={styles.expandText}>
                                {isSummaryExpanded ? 'Show Less' : 'Read More'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.wideFooter}>
                    <View style={styles.wideDateBadge}>
                        <Ionicons name="time-outline" size={16} color="#4B5563" />
                        <Text style={styles.wideDateText}>{activeGoal.duration_weeks} Weeks • {formatDate(activeGoal.start_date)} - {endDateDisplay}</Text>
                    </View>
                </View>
            </View>

            {/* Vertical Divider */}
            <View style={styles.wideDivider} />

            {/* Right Section: Daily Targets */}
            <View style={styles.wideRightSection}>
                <View style={styles.wideHeader}>
                    <Text style={styles.label}>Daily Targets</Text>
                </View>
                <View style={styles.wideMacroGrid}>
                    <View style={styles.wideMacroCard}>
                        <View style={[styles.wideMacroIcon, { backgroundColor: '#FEF3C7' }]}>
                            <Ionicons name="flame" size={20} color="#F59E0B" />
                        </View>
                        <View>
                            <Text style={styles.wideMacroValue} numberOfLines={1} adjustsFontSizeToFit>
                                {consumed} / {dailyPlan?.calorie_target || activeGoal.daily_calorie_target || '--'}
                            </Text>
                            <Text style={styles.wideMacroLabel}>Kcal</Text>
                        </View>
                    </View>
                    <View style={styles.wideMacroCard}>
                        <View style={[styles.wideMacroIcon, { backgroundColor: '#DBEAFE' }]}>
                            <Ionicons name="fish" size={20} color="#3B82F6" />
                        </View>
                        <View>
                            <Text style={styles.wideMacroValue} numberOfLines={1} adjustsFontSizeToFit>
                                {proteinConsumed} / {dailyPlan?.protein_target || activeGoal.protein_target || '--'}g
                            </Text>
                            <Text style={styles.wideMacroLabel}>Protein</Text>
                        </View>
                    </View>
                    <View style={styles.wideMacroCard}>
                        <View style={[styles.wideMacroIcon, { backgroundColor: '#D1FAE5' }]}>
                            <Ionicons name="leaf" size={20} color="#10B981" />
                        </View>
                        <View>
                            <Text style={styles.wideMacroValue} numberOfLines={1} adjustsFontSizeToFit>
                                {carbsConsumed} / {dailyPlan?.carbs_target || activeGoal.carbs_target || '--'}g
                            </Text>
                            <Text style={styles.wideMacroLabel}>Carbs</Text>
                        </View>
                    </View>
                    <View style={styles.wideMacroCard}>
                        <View style={[styles.wideMacroIcon, { backgroundColor: '#FCE7F3' }]}>
                            <Ionicons name="water" size={20} color="#EC4899" />
                        </View>
                        <View>
                            <Text style={styles.wideMacroValue} numberOfLines={1} adjustsFontSizeToFit>
                                {fatConsumed} / {dailyPlan?.fat_target || activeGoal.fat_target || '--'}g
                            </Text>
                            <Text style={styles.wideMacroLabel}>Fat</Text>
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.container} onLayout={handleLayout}>
            {isWide ? (
                // Unified Wide Screen Layout
                renderWideLayout()
            ) : (
                // Mobile Layout (Paged ScrollView)
                <ScrollView
                    ref={scrollRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                    snapToInterval={effectiveWidth}
                    decelerationRate="fast"
                    disableIntervalMomentum
                >
                    {/* Page 1: Core Goal Details */}
                    <View style={[styles.page, { width: effectiveWidth }]}>
                        {renderPage1Content()}
                    </View>

                    {/* Page 2: Nutritional Targets */}
                    <View style={[styles.page, { width: effectiveWidth }]}>
                        {renderPage2Content()}
                    </View>

                    {/* Page 3: Weekly Roadmap */}
                    <View style={[styles.page, { width: effectiveWidth }]}>
                        {renderPage3Content()}
                    </View>
                </ScrollView>
            )}

            {/* Pagination Dots (Mobile Only) */}
            {!isWide && (
                <View style={styles.pagination}>
                    <View style={[styles.dot, activePage === 0 && styles.dotActive]} />
                    <View style={[styles.dot, activePage === 1 && styles.dotActive]} />
                    <View style={[styles.dot, activePage === 2 && styles.dotActive]} />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        height: 200,
        backgroundColor: '#E5E7EB',
        borderRadius: 24,
    },
    emptyContainer: {
        borderRadius: 24,
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
        paddingVertical: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
        overflow: 'hidden',
    },
    page: {
        paddingHorizontal: 20,
        flexShrink: 0,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    // ... existing styles ...
    wideContainer: {
        flexDirection: 'row',
        alignItems: 'stretch',
    },
    verticalDivider: {
        width: 1,
        backgroundColor: '#F3F4F6',
        marginHorizontal: 10,
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
    weightRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
    },
    weightItem: {
        alignItems: 'center',
        flex: 1,
    },
    weightLabel: {
        fontSize: 11,
        color: '#9CA3AF',
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    weightValue: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#111827',
    },
    weightUnit: {
        fontSize: 11,
        color: '#6B7280',
        marginTop: 2,
    },
    weightDivider: {
        paddingHorizontal: 4,
    },
    dateRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    dateItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dateText: {
        fontSize: 13,
        color: '#6B7280',
    },
    durationText: {
        fontSize: 13,
        color: '#4285F4',
        fontWeight: '600',
    },
    summary: {
        fontSize: 13,
        color: '#6B7280',
        lineHeight: 18,
    },
    macroGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    macroItem: {
        width: '47%',
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        padding: 10,
        alignItems: 'center',
    },
    macroIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    macroValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
    },
    macroLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 4,
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 8,
        gap: 6,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#E5E7EB',
    },
    dotActive: {
        backgroundColor: '#4285F4',
        width: 16,
    },
    wideDashboard: {
        flexDirection: 'row',
        gap: 24,
        paddingHorizontal: 24,
    },
    wideLeftSection: {
        flex: 1,
        justifyContent: 'space-between',
    },
    wideRightSection: {
        flex: 1,
    },
    wideDivider: {
        width: 1,
        backgroundColor: '#E5E7EB',
        marginVertical: 4,
    },
    wideHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    wideTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
        marginTop: 4,
    },
    wideSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 2,
    },
    menuButton: {
        padding: 4,
    },
    wideWeightContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    wideWeightBox: {
        alignItems: 'center',
    },
    wideWeightLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 2,
        textTransform: 'uppercase',
    },
    wideWeightValue: {
        fontSize: 24,
        fontWeight: '800',
        color: '#111827',
    },
    wideWeightUnit: {
        fontSize: 14,
        color: '#6B7280',
        marginLeft: 2,
        fontWeight: '500',
    },
    wideArrowFn: {
        paddingTop: 14,
    },
    wideFooter: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    wideDateBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 6,
    },
    wideDateText: {
        fontSize: 13,
        color: '#4B5563',
        fontWeight: '500',
    },
    wideMacroGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    wideMacroCard: {
        width: '48%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#F9FAFB',
        padding: 12,
        borderRadius: 12,
    },
    wideMacroIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    wideMacroValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#111827',
    },
    wideMacroLabel: {
        fontSize: 12,
        color: '#6B7280',
    },
    wideSummary: {
        fontSize: 14,
        color: '#4B5563',
        lineHeight: 20,
    },
    summaryContainer: {
        marginTop: 2,
    },
    wideSummaryContainer: {
        marginBottom: 12,
    },
    expandButton: {
        marginTop: 2,
        alignSelf: 'flex-start',
    },
    expandText: {
        fontSize: 12,
        color: '#4285F4',
        fontWeight: '600',
    },
});
