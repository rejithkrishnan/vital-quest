import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Placeholder data - will be replaced with real data from Supabase
const PLACEHOLDER_TASKS = [
    { id: '1', description: 'Breakfast: 2 Idli with Chutney + Coffee', type: 'nutrition', calories: 600, completed: false },
    { id: '2', description: 'Morning Walk: 30 minutes', type: 'workout', calories: 150, completed: true },
    { id: '3', description: 'Lunch: Rice Meal with Dal & Veggies', type: 'nutrition', calories: 900, completed: false },
    { id: '4', description: 'Evening Yoga: 20 minutes', type: 'workout', calories: 100, completed: false },
    { id: '5', description: 'Dinner: Chapati with Paneer Curry', type: 'nutrition', calories: 750, completed: false },
    { id: '6', description: 'Mindfulness: 10 min meditation', type: 'mindfulness', calories: 0, completed: false },
];

const getTaskIcon = (type: string) => {
    switch (type) {
        case 'nutrition': return 'restaurant';
        case 'workout': return 'fitness';
        case 'mindfulness': return 'leaf';
        default: return 'checkmark-circle';
    }
};

const getTaskColor = (type: string) => {
    switch (type) {
        case 'nutrition': return '#34A853';
        case 'workout': return '#EA4335';
        case 'mindfulness': return '#9C27B0';
        default: return '#4285F4';
    }
};

export default function PlansScreen() {
    const [tasks, setTasks] = useState(PLACEHOLDER_TASKS);

    const toggleTask = (id: string) => {
        setTasks(prev =>
            prev.map(task =>
                task.id === id ? { ...task, completed: !task.completed } : task
            )
        );
    };

    // Calculate Calories In (Nutrition) vs Calories Out (Workout)
    const caloriesIn = tasks
        .filter(t => t.completed && t.type === 'nutrition')
        .reduce((sum, t) => sum + t.calories, 0);

    const caloriesOut = tasks
        .filter(t => t.completed && t.type === 'workout')
        .reduce((sum, t) => sum + t.calories, 0);

    // Net Calorie Logic
    const DAILY_GOAL = 2000;
    const netCalories = caloriesIn - caloriesOut;
    const progressPercent = Math.min(Math.max(netCalories / DAILY_GOAL, 0), 1) * 100;
    const isOverBudget = netCalories > DAILY_GOAL;
    const goalMet = netCalories === DAILY_GOAL;

    const renderTask = ({ item }: { item: typeof PLACEHOLDER_TASKS[0] }) => (
        <Pressable
            onPress={() => toggleTask(item.id)}
            className={`flex-row items-center p-4 mb-3 rounded-2xl ${item.completed ? 'bg-gray-100' : 'bg-white'}`}
            style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 2
            }}
        >
            <View
                className={`w-7 h-7 rounded-full border-2 items-center justify-center mr-4 ${item.completed ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}
            >
                {item.completed && <Ionicons name="checkmark" size={18} color="white" />}
            </View>

            <View
                className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                style={{ backgroundColor: getTaskColor(item.type) + '20' }}
            >
                <Ionicons name={getTaskIcon(item.type) as any} size={20} color={getTaskColor(item.type)} />
            </View>

            <View className="flex-1">
                <Text className={`font-semibold ${item.completed ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                    {item.description}
                </Text>
                {item.calories > 0 && (
                    <Text className={`text-sm mt-1 ${item.type === 'workout' ? 'text-orange-500' : 'text-gray-400'}`}>
                        {item.type === 'workout' ? '🔥 ' : ''}{item.calories} kcal
                    </Text>
                )}
            </View>

            <Pressable className="p-2">
                <Ionicons name="camera-outline" size={22} color="#9AA0A6" />
            </Pressable>
        </Pressable>
    );

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="px-6 pt-4 pb-2">
                <Text className="text-3xl font-bold text-gray-900">Today's Plan</Text>
                <Text className="text-gray-500 mt-1">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </Text>
            </View>

            {/* Net Calories Widget */}
            <View className="mx-6 my-4 p-5 bg-white rounded-2xl" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 }}>
                <View className="flex-row justify-between items-center mb-4">
                    <View>
                        <Text className="text-gray-500 font-medium mb-1">Net Calories</Text>
                        <Text className={`text-4xl font-bold ${isOverBudget ? 'text-red-500' : goalMet ? 'text-green-600' : 'text-blue-600'}`}>
                            {netCalories}
                        </Text>
                    </View>
                    <View className="h-10 w-px bg-gray-200 mx-4" />
                    <View>
                        <Text className="text-gray-500 font-medium mb-1">Today's Goal</Text>
                        <Text className="text-4xl font-bold text-purple-600">{DAILY_GOAL}</Text>
                    </View>
                </View>

                {/* Equation Row */}
                <View className="flex-row justify-between items-center mt-4 mb-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <View className="items-center flex-1">
                        <Text className="text-gray-900 font-bold text-lg">{caloriesIn}</Text>
                        <Text className="text-gray-500 text-xs uppercase tracking-wider">Food</Text>
                    </View>
                    <Text className="text-gray-400 font-bold text-xl">-</Text>
                    <View className="items-center flex-1">
                        <Text className="text-orange-500 font-bold text-lg">{caloriesOut}</Text>
                        <Text className="text-gray-500 text-xs uppercase tracking-wider">Exercise</Text>
                    </View>
                    <Text className="text-gray-400 font-bold text-xl">=</Text>
                    <View className="items-center flex-1">
                        <Text className={`font-bold text-lg ${isOverBudget ? 'text-red-500' : goalMet ? 'text-green-600' : 'text-blue-600'}`}>{netCalories}</Text>
                        <Text className="text-gray-500 text-xs uppercase tracking-wider">Net</Text>
                    </View>
                </View>

                {/* Progress Bar */}
                <View className="h-3 bg-gray-100 rounded-full overflow-hidden w-full">
                    <View
                        className={`h-full rounded-full ${isOverBudget ? 'bg-red-500' : goalMet ? 'bg-green-500' : 'bg-blue-500'}`}
                        style={{ width: `${progressPercent}%` }}
                    />
                </View>

                {/* Goal Met Celebration */}
                {goalMet && (
                    <View className="mt-3 p-2 bg-green-100 rounded-lg">
                        <Text className="text-green-700 text-center font-semibold">🎉 Goal Achieved! Great Job! 🎉</Text>
                    </View>
                )}
                {isOverBudget && (
                    <Text className="text-red-500 text-xs mt-2 text-center font-medium">
                        You've exceeded your daily goal!
                    </Text>
                )}
            </View>

            {/* Task List */}
            <FlatList
                data={tasks}
                keyExtractor={(item) => item.id}
                renderItem={renderTask}
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
            />
        </SafeAreaView>
    );
}
