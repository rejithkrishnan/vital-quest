import CelebrationModal from './CelebrationModal';
import { useGoalsStore } from '@/stores/goalsStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState, useMemo } from 'react';
import { ActivityIndicator, Pressable, Text, View, TouchableOpacity } from 'react-native';
import MealLogModal from './MealLogModal';

export default function DailyPlanWidget() {
    const router = useRouter();
    const {
        dailyPlan,
        tasks,
        isLoading,
        fetchDailyPlan,
        activeGoal,
        fetchActiveGoal,
        toggleTaskCompletion
    } = useGoalsStore();

    const [showCelebration, setShowCelebration] = useState(false);

    // Meal Log Modal State
    const [logModalVisible, setLogModalVisible] = useState(false);
    const [selectedTask, setSelectedTask] = useState<any>(null);

    useEffect(() => {
        fetchActiveGoal();
        fetchDailyPlan(new Date());
    }, []);

    // Check for completion
    useEffect(() => {
        if (tasks && tasks.length > 0) {
            const allCompleted = tasks.every(t => t.is_completed);
            if (allCompleted) {
                setShowCelebration(true);
            }
        }
    }, [tasks]);

    // Handler for logging mechanism
    const handleLogTask = (task: any) => {
        setSelectedTask(task);
        setLogModalVisible(true);
    };

    // Find the next incomplete task (sorted by time_slot)
    const nextTask = useMemo(() => {
        if (!tasks || tasks.length === 0) return null;
        const incomplete = tasks
            .filter(t => !t.is_completed)
            .sort((a, b) => (a.time_slot || '').localeCompare(b.time_slot || ''));
        return incomplete[0] || null;
    }, [tasks]);

    // Progress stats
    const completedCount = tasks?.filter(t => t.is_completed).length || 0;
    const totalCount = tasks?.length || 0;

    if (isLoading) {
        return (
            <View className="bg-white p-6 rounded-2xl shadow-sm items-center justify-center space-y-3">
                <ActivityIndicator size="large" color="#4285F4" />
                <Text className="text-gray-500 font-medium">Loading your plan...</Text>
            </View>
        );
    }

    // No active goal - prompt to create
    if (!activeGoal) {
        return (
            <View className="bg-white p-6 rounded-2xl shadow-sm items-center space-y-4">
                <View className="w-12 h-12 bg-blue-100 rounded-full items-center justify-center">
                    <Ionicons name="rocket" size={24} color="#4285F4" />
                </View>
                <View className="items-center">
                    <Text className="text-xl font-bold text-gray-900">Start Your Quest</Text>
                    <Text className="text-gray-500 text-center mt-1">
                        Create a health goal to unlock your personalized daily missions.
                    </Text>
                </View>
                <Pressable
                    onPress={() => router.push({ pathname: '/(tabs)/chat', params: { action: 'create_plan' } })}
                    className="bg-blue-500 px-6 py-3 rounded-full flex-row items-center active:opacity-90"
                >
                    <Ionicons name="sparkles" size={18} color="white" />
                    <Text className="text-white font-bold text-base ml-2">Create Plan</Text>
                </Pressable>
            </View>
        );
    }

    // Has goal but no tasks for today
    if (!nextTask && totalCount === 0) {
        return (
            <Pressable
                onPress={() => router.push('/(tabs)/plans')}
                className="bg-white p-5 rounded-2xl shadow-sm"
            >
                <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                        <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center mr-3">
                            <Ionicons name="calendar-outline" size={20} color="#9CA3AF" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-base font-bold text-gray-900">No Tasks Today</Text>
                            <Text className="text-xs text-gray-500">Tap to view your full plan</Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </View>
            </Pressable>
        );
    }

    // All tasks done!
    if (!nextTask && totalCount > 0) {
        return (
            <View className="bg-white p-5 rounded-2xl shadow-sm border border-green-100">
                <CelebrationModal
                    visible={showCelebration}
                    onClose={() => setShowCelebration(false)}
                />
                <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                        <View className="w-10 h-10 bg-green-100 rounded-full items-center justify-center mr-3">
                            <Ionicons name="checkmark-done" size={20} color="#10B981" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-base font-bold text-green-800">All Done! 🎉</Text>
                            <Text className="text-xs text-green-600">{completedCount} tasks completed today</Text>
                        </View>
                    </View>
                    <Pressable
                        onPress={() => router.push('/(tabs)/plans')}
                        className="bg-green-500 px-4 py-2 rounded-full"
                    >
                        <Text className="text-white font-bold text-sm">View All</Text>
                    </Pressable>
                </View>
            </View>
        );
    }

    // Show next task teaser
    return (
        <View className="bg-white p-5 rounded-2xl shadow-sm">
            <CelebrationModal
                visible={showCelebration}
                onClose={() => setShowCelebration(false)}
            />

            {/* Header */}
            <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center">
                    <Text className="text-lg font-bold text-gray-900">Up Next</Text>
                    <View className="ml-2 bg-blue-100 px-2 py-0.5 rounded-full">
                        <Text className="text-blue-600 text-xs font-bold">{completedCount}/{totalCount}</Text>
                    </View>
                </View>
                <TouchableOpacity
                    onPress={() => router.push('/(tabs)/plans')}
                    className="flex-row items-center"
                >
                    <Text className="text-blue-500 font-medium text-sm mr-1">View All</Text>
                    <Ionicons name="chevron-forward" size={16} color="#3B82F6" />
                </TouchableOpacity>
            </View>

            {/* Next Task Card - Exact replica of Plans UI */}
            <View className="bg-gray-50 rounded-[24px] border border-indigo-50 shadow-sm elevation-1 flex-row items-center overflow-hidden">
                <TouchableOpacity
                    onPress={() => nextTask && toggleTaskCompletion(nextTask.id, !nextTask.is_completed)}
                    className="p-4 flex-row items-center flex-1"
                >
                    <View
                        className={`w-6 h-6 rounded-full border-2 mr-3 items-center justify-center ${nextTask?.is_completed ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}
                    >
                        {nextTask?.is_completed && <Ionicons name="checkmark" size={14} color="white" />}
                    </View>

                    <View className="flex-1">
                        {/* Header: Time and Type */}
                        <View className="flex-row items-center mb-1">
                            <Text className="text-base font-bold text-blue-600 mr-2">
                                {nextTask?.time_slot || 'Anytime'}
                            </Text>
                            <Text className="text-base font-bold text-gray-900 capitalize">
                                {nextTask?.task_type === 'nutrition' ? (nextTask.meal_type || 'Meal') : (nextTask?.task_type === 'workout' ? 'Workout' : 'Mindfulness')}
                            </Text>
                        </View>

                        {/* Description */}
                        <Text className={`text-sm text-gray-600 mb-1 ${nextTask?.is_completed ? 'line-through text-gray-400' : ''}`} numberOfLines={2}>
                            {nextTask?.description}
                        </Text>

                        {/* XP/Metadata Tag */}
                        <View className="flex-row items-center">
                            <Text className="text-xs text-blue-500 font-bold mr-2">+{nextTask?.xp_reward} XP</Text>
                            {nextTask?.metadata?.calories && (
                                <Text className="text-xs text-orange-600 font-medium">{nextTask.metadata.calories} kcal</Text>
                            )}
                        </View>
                    </View>
                </TouchableOpacity>

                {/* Log Button for Meals */}
                {!nextTask?.is_completed && nextTask?.task_type === 'nutrition' && (
                    <View className="pr-4 justify-center">
                        <TouchableOpacity onPress={() => handleLogTask(nextTask)} className="bg-white p-2 rounded-xl shadow-sm border border-gray-100">
                            <Ionicons name="camera-outline" size={24} color="#374151" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <MealLogModal
                visible={logModalVisible}
                onClose={() => {
                    setLogModalVisible(false);
                    setSelectedTask(null);
                }}
                task={selectedTask}
            />
        </View>
    );
}
