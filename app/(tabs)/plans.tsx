import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useGoalsStore } from '@/stores/goalsStore';
import PlanHeader from '@/components/PlanHeader';
import { useRouter } from 'expo-router';
import MealUpdateModal from '@/components/MealUpdateModal';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';

export default function PlansScreen() {
    const router = useRouter();
    const { dailyPlan, tasks, isLoading, fetchDailyPlan, toggleTaskCompletion, activeGoal, fetchWeeklyPlans, weeklyPlans, generateDailyTasks, fetchActiveGoal } = useGoalsStore();
    const [filter, setFilter] = useState('All');
    const [selectedDate, setSelectedDate] = useState(new Date());

    // Meal Update Modal State
    const [logModalVisible, setLogModalVisible] = useState(false);
    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);

    const onDateChange = (event: any, selected: Date | undefined) => {
        setShowDatePicker(false);
        if (selected) {
            setSelectedDate(selected);
        }
    };

    // Initial Load
    useEffect(() => {
        fetchActiveGoal();
    }, []);

    // Date Change
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
    // Generate dates for picker
    const dates = React.useMemo(() => {
        const generateFallback = () => {
            const d = [];
            const today = new Date();
            for (let i = -7; i < 21; i++) { // Show 1 week back, 3 weeks forward
                const date = new Date(today);
                date.setDate(today.getDate() + i);
                d.push(date);
            }
            return d;
        };

        if (!activeGoal) {
            return generateFallback();
        }

        const start = new Date(activeGoal.start_date);
        let end = activeGoal.target_date ? new Date(activeGoal.target_date) : null;

        // If end date is missing, calculate from duration or default to 12 weeks
        if (!end || isNaN(end.getTime())) {
            end = new Date(start);
            const weeks = activeGoal.duration_weeks || 12;
            end.setDate(start.getDate() + (weeks * 7));
        }

        if (isNaN(start.getTime())) {
            return generateFallback();
        }

        if (start > end) {
            return generateFallback();
        }

        const d = [];
        const current = new Date(start);
        // Cap at 365 days to support full year plans
        let count = 0;
        const maxDays = 365;

        while (current <= end && count < maxDays) {
            d.push(new Date(current));
            current.setDate(current.getDate() + 1);
            count++;
        }

        if (d.length === 0) return generateFallback();

        return d;
    }, [activeGoal]);

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

    const proteinConsumed = tasks
        .filter(t => t.task_type === 'nutrition' && t.is_completed)
        .reduce((sum, t) => sum + (t.metadata?.protein || 0), 0);

    const carbsConsumed = tasks
        .filter(t => t.task_type === 'nutrition' && t.is_completed)
        .reduce((sum, t) => sum + (t.metadata?.carbs || 0), 0);

    const fatConsumed = tasks
        .filter(t => t.task_type === 'nutrition' && t.is_completed)
        .reduce((sum, t) => sum + (t.metadata?.fat || 0), 0);


    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <View className="pt-2 pb-4 bg-white">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4">
                    {dates.map((date, index) => (
                        <TouchableOpacity
                            key={index}
                            onPress={() => setSelectedDate(date)}
                            className={`items-center justify-center mr-3 w-14 h-20 rounded-2xl ${isSelected(date) ? 'bg-blue-600' : 'bg-gray-100'}`}
                        >
                            <Text className={`text-xs ${isSelected(date) ? 'text-blue-100' : 'text-gray-400'}`}>
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()]}
                            </Text>
                            <Text className={`text-lg font-bold ${isSelected(date) ? 'text-white' : 'text-gray-900'}`}>
                                {date.getDate()}
                            </Text>
                            <Text className={`text-[10px] font-medium ${isSelected(date) ? 'text-blue-100' : 'text-gray-400'}`}>
                                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()]}
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
                    <View className="mb-6 bg-indigo-50 p-5 rounded-[28px] border border-indigo-100 shadow-sm elevation-2">
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
                        protein: { current: proteinConsumed, target: dailyPlan?.protein_target || activeGoal.protein_target || 150 },
                        carbs: { current: carbsConsumed, target: dailyPlan?.carbs_target || activeGoal.carbs_target || 200 },
                        fat: { current: fatConsumed, target: dailyPlan?.fat_target || activeGoal.fat_target || 60 }
                    }}
                    onPressCalendar={() => setShowDatePicker(true)}
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
                        <View className="items-center py-10 px-6">
                            {activeGoal?.start_date && new Date(selectedDate) < new Date(new Date(activeGoal.start_date).setHours(0, 0, 0, 0)) ? (
                                <>
                                    <View className="w-20 h-20 bg-indigo-50 rounded-full items-center justify-center mb-4">
                                        <Ionicons name="rocket-outline" size={40} color="#6366F1" />
                                    </View>
                                    <Text className="text-gray-900 font-bold text-lg text-center">Journey hasn't started yet</Text>
                                    <Text className="text-gray-500 mt-2 text-center">
                                        Your personalized health quest officially begins on {new Date(activeGoal.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
                                    </Text>
                                </>
                            ) : (
                                <>
                                    <Ionicons name="calendar-outline" size={48} color="#D1D5DB" />
                                    <Text className="text-gray-400 mt-4 text-center">No tasks generated for this day yet.</Text>
                                </>
                            )}
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
                            <View key={task.id} className="bg-white rounded-[24px] mb-3 shadow-sm elevation-1 border border-gray-100 overflow-hidden flex-row items-center">
                                <TouchableOpacity
                                    onPress={() => toggleTaskCompletion(task.id, !task.is_completed)}
                                    className="p-4 flex-row items-center flex-1"
                                >
                                    <View
                                        className={`w-6 h-6 rounded-full border-2 mr-4 items-center justify-center ${task.is_completed ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}
                                    >
                                        {task.is_completed && <Ionicons name="checkmark" size={16} color="white" />}
                                    </View>

                                    <View className="flex-1 ml-2">
                                        {/* Header: Time and Type */}
                                        <View className="flex-row items-center mb-1">
                                            <Text className="text-base font-bold text-blue-600 mr-2">
                                                {task.time_slot || 'Anytime'}
                                            </Text>
                                            <Text className="text-base font-bold text-gray-900 capitalize">
                                                {task.task_type === 'nutrition' ? (task.meal_type || 'Meal') : (task.task_type === 'workout' ? 'Workout' : 'Mindfulness')}
                                            </Text>
                                        </View>

                                        {/* Description */}
                                        <Text className={`text-sm text-gray-600 mb-1 ${task.is_completed ? 'line-through text-gray-400' : ''}`}>
                                            {task.description}
                                        </Text>

                                        {/* Metadata (Calories/Duration) */}
                                        {(task.metadata?.calories || task.metadata?.duration) && (
                                            <View className="flex-row items-center mt-1">
                                                <View className="bg-purple-50 px-2 py-0.5 rounded-md mr-2">
                                                    <Text className="text-xs text-purple-600 font-bold">+{task.xp_reward || 10} XP</Text>
                                                </View>
                                                {task.metadata?.calories && (
                                                    <View className="bg-orange-50 px-2 py-0.5 rounded-md mr-2">
                                                        <Text className="text-xs text-orange-600 font-medium">
                                                            {task.metadata.calories} kcal
                                                        </Text>
                                                    </View>
                                                )}
                                                {task.metadata?.duration && (
                                                    <View className="bg-blue-50 px-2 py-0.5 rounded-md">
                                                        <Text className="text-xs text-blue-600 font-medium">
                                                            {task.metadata.duration} min
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        )}
                                    </View>
                                </TouchableOpacity>

                                {/* Log Button for Meals - Positioned absolutely or flexed to avoid card-level click */}
                                {!task.is_completed && task.task_type === 'nutrition' && (
                                    <View className="pr-4 justify-center">
                                        <TouchableOpacity onPress={() => handleLogTask(task)} className="bg-gray-50 p-2 rounded-xl">
                                            <Ionicons name="create-outline" size={24} color="#374151" />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>

            <MealUpdateModal
                visible={logModalVisible}
                onClose={() => {
                    setLogModalVisible(false);
                    setSelectedTask(null);
                }}
                task={selectedTask}
            />

            {showDatePicker && (
                <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                />
            )}
        </SafeAreaView>
    );
}
