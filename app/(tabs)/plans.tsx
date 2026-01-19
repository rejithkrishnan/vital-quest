import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useGoalsStore } from '@/stores/goalsStore';
import PlanHeader from '@/components/PlanHeader';
import { useRouter } from 'expo-router';
import MealLogModal from '@/components/MealLogModal';

export default function PlansScreen() {
    const router = useRouter();
    const { dailyPlan, tasks, isLoading, fetchDailyPlan, toggleTaskCompletion, activeGoal, fetchWeeklyPlans, weeklyPlans, generateDailyTasks } = useGoalsStore();
    const [filter, setFilter] = useState('All');
    const [selectedDate, setSelectedDate] = useState(new Date());

    // Meal Log Modal State
    const [logModalVisible, setLogModalVisible] = useState(false);
    const [selectedTask, setSelectedTask] = useState<any>(null);

    useEffect(() => {
        fetchDailyPlan(selectedDate);
    }, [selectedDate]);

    useEffect(() => {
        if (activeGoal?.id) {
            fetchWeeklyPlans(activeGoal.id);
        }
    }, [activeGoal?.id]);

    const onRefresh = React.useCallback(() => {
        fetchDailyPlan(selectedDate);
        if (activeGoal?.id) fetchWeeklyPlans(activeGoal.id);
    }, [selectedDate, activeGoal]);

    // Generate dates for picker
    const dates = React.useMemo(() => {
        const d = [];
        for (let i = -2; i < 14; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            d.push(date);
        }
        return d;
    }, []);

    const isToday = (date: Date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };

    const isSelected = (date: Date) => {
        return date.getDate() === selectedDate.getDate() &&
            date.getMonth() === selectedDate.getMonth() &&
            date.getFullYear() === selectedDate.getFullYear();
    };

    // Find active weekly plan
    const activeWeek = weeklyPlans.find(wp => {
        const start = new Date(wp.week_start_date);
        const end = new Date(start);
        end.setDate(end.getDate() + 7);
        return selectedDate >= start && selectedDate < end;
    });

    // Handler for logging mechanism
    const handleLogTask = (task: any) => {
        setSelectedTask(task);
        setLogModalVisible(true);
    };

    const filteredTasks = tasks.filter(task => {
        if (filter === 'All') return true;
        if (filter === 'Meals') return task.task_type === 'nutrition';
        if (filter === 'Workout') return task.task_type === 'workout';
        return true;
    });

    if (!activeGoal) {
        return (
            <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center p-6">
                <Text className="text-xl font-bold text-gray-900 mb-2">No Active Plan</Text>
                <Text className="text-gray-500 text-center mb-6">Create a goal to get your personalized daily plan.</Text>
                <TouchableOpacity
                    onPress={() => router.push({ pathname: '/(tabs)/chat', params: { action: 'create_plan' } })}
                    className="bg-blue-600 px-6 py-3 rounded-full"
                >
                    <Text className="text-white font-bold">Create Plan</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    // Calculate Daily Stats
    const consumed = tasks
        .filter(t => t.task_type === 'nutrition' && t.is_completed)
        .reduce((sum, t) => sum + (t.metadata?.calories || 0), 0);

    const burned = tasks
        .filter(t => t.task_type === 'workout' && t.is_completed)
        .reduce((sum, t) => sum + (t.metadata?.calories || 0), 0);

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <View className="pt-2 pb-4 bg-white">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4">
                    {dates.map((date, index) => (
                        <TouchableOpacity
                            key={index}
                            onPress={() => setSelectedDate(date)}
                            className={`items-center justify-center mr-3 w-14 h-16 rounded-2xl ${isSelected(date) ? 'bg-blue-600' : 'bg-gray-100'}`}
                        >
                            <Text className={`text-xs ${isSelected(date) ? 'text-blue-100' : 'text-gray-400'}`}>
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()]}
                            </Text>
                            <Text className={`text-lg font-bold ${isSelected(date) ? 'text-white' : 'text-gray-900'}`}>
                                {date.getDate()}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <ScrollView
                className="flex-1 px-6 pt-2"
                refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
            >
                {/* Week Focus Card */}
                {activeWeek && (
                    <View className="mb-6 bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                        <View className="flex-row justify-between items-start mb-2">
                            <Text className="text-indigo-600 font-bold text-xs uppercase tracking-wider">Week {activeWeek.week_number} Focus</Text>
                            <View className="bg-white px-2 py-1 rounded-lg">
                                <Text className="text-xs font-bold text-indigo-600">Phase {Math.ceil(activeWeek.week_number / 4)}</Text>
                            </View>
                        </View>
                        <Text className="text-indigo-900 font-bold text-lg mb-1">{activeWeek.focus_areas}</Text>
                        <Text className="text-indigo-700 text-sm leading-5">{activeWeek.ai_tips}</Text>
                    </View>
                )}
                <PlanHeader
                    date={selectedDate}
                    calories={{
                        target: dailyPlan?.calorie_target || activeGoal.daily_calorie_target || 2000,
                        consumed: consumed,
                        burned: burned
                    }}
                    macros={{
                        protein: { current: 0, target: dailyPlan?.protein_target || activeGoal.protein_target || 150 },
                        carbs: { current: 0, target: dailyPlan?.carbs_target || activeGoal.carbs_target || 200 },
                        fat: { current: 0, target: dailyPlan?.fat_target || activeGoal.fat_target || 60 }
                    }}
                />

                {/* Filters */}
                <View className="flex-row gap-3 mb-6">
                    {['All', 'Meals', 'Workout'].map((f) => (
                        <TouchableOpacity
                            key={f}
                            onPress={() => setFilter(f)}
                            className={`px-4 py-2 rounded-full ${filter === f ? 'bg-black' : 'bg-gray-200'}`}
                        >
                            <Text className={`${filter === f ? 'text-white' : 'text-gray-600'} font-medium`}>{f}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Task List */}
                <View className="mb-20">
                    {filteredTasks.length === 0 ? (
                        <View className="items-center py-10">
                            <Ionicons name="calendar-outline" size={48} color="#D1D5DB" />
                            <Text className="text-gray-400 mt-4 text-center">No tasks generated for this day yet.</Text>
                            {dailyPlan?.summary === 'Pending AI generation' && (
                                <TouchableOpacity
                                    onPress={() => generateDailyTasks(selectedDate)}
                                    disabled={isLoading}
                                    className="mt-6 bg-blue-600 px-6 py-3 rounded-xl flex-row items-center"
                                >
                                    <Text className="text-white font-bold mr-2">Generate Day Plan ⚡</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ) : (
                        filteredTasks.map((task) => (
                            <View key={task.id} className="bg-white p-4 rounded-2xl mb-3 shadow-sm border border-gray-100 flex-row items-center">
                                <TouchableOpacity
                                    onPress={() => toggleTaskCompletion(task.id, !task.is_completed)}
                                    className={`w-6 h-6 rounded-full border-2 mr-4 items-center justify-center ${task.is_completed ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}
                                >
                                    {task.is_completed && <Ionicons name="checkmark" size={16} color="white" />}
                                </TouchableOpacity>

                                <View className="flex-1">
                                    <View className="flex-row justify-between items-center mb-1">
                                        <Text className={`font-semibold text-gray-900 ${task.is_completed ? 'line-through text-gray-400' : ''}`}>
                                            {task.description}
                                        </Text>
                                        <Text className="text-xs text-gray-400">{task.time_slot}</Text>
                                    </View>
                                    <View className="flex-row items-center">
                                        <Text className="text-xs text-gray-500 mr-2">
                                            {task.task_type === 'nutrition' ? '🍽️ Meal' : (task.task_type === 'workout' ? '💪 Workout' : '🧘 Mindfulness')}
                                        </Text>
                                        {task.metadata?.calories && (
                                            <Text className="text-xs text-blue-500 font-medium">{task.metadata.calories} kcal</Text>
                                        )}
                                    </View>
                                </View>

                                {/* Log Button for Meals */}
                                {!task.is_completed && task.task_type === 'nutrition' && (
                                    <TouchableOpacity onPress={() => handleLogTask(task)} className="bg-gray-50 p-2 rounded-xl">
                                        <Ionicons name="camera-outline" size={20} color="#374151" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>

            <MealLogModal
                visible={logModalVisible}
                onClose={() => {
                    setLogModalVisible(false);
                    setSelectedTask(null);
                }}
                task={selectedTask}
            />
        </SafeAreaView>
    );
}
