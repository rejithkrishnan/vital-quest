import CelebrationModal from './CelebrationModal';
import { useGamificationStore } from '@/stores/gamificationStore';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

export default function DailyPlanWidget() {
    const {
        dailyPlan,
        generateDailyPlan,
        isGeneratingPlan,
        fetchTodayPlan,
        toggleTask,
        subscribeToRealtime
    } = useGamificationStore();

    const [showCelebration, setShowCelebration] = useState(false);

    useEffect(() => {
        fetchTodayPlan();
        const unsubscribe = subscribeToRealtime();
        return () => {
            unsubscribe && unsubscribe();
        };
    }, []);

    // Check for completion
    useEffect(() => {
        if (dailyPlan && dailyPlan.tasks.length > 0) {
            const allCompleted = dailyPlan.tasks.every(t => t.is_completed);
            if (allCompleted) {
                setShowCelebration(true);
            }
        }
    }, [dailyPlan]);

    if (isGeneratingPlan) {
        return (
            <View className="bg-white m-4 p-6 rounded-2xl shadow-sm items-center justify-center space-y-3">
                <ActivityIndicator size="large" color="#4285F4" />
                <Text className="text-gray-500 font-medium">Crafting your personalized plan...</Text>
            </View>
        );
    }

    if (!dailyPlan) {
        return (
            <View className="bg-white m-4 p-6 rounded-2xl shadow-sm items-center space-y-4">
                <View className="w-12 h-12 bg-blue-100 rounded-full items-center justify-center">
                    <Ionicons name="calendar" size={24} color="#4285F4" />
                </View>
                <View className="items-center">
                    <Text className="text-xl font-bold text-gray-900">Today's Missions</Text>
                    <Text className="text-gray-500 text-center mt-1">
                        Ready to earn some XP? Generate your personalized daily health plan.
                    </Text>
                </View>
                <Pressable
                    onPress={generateDailyPlan}
                    className="bg-blue-500 px-6 py-3 rounded-full flex-row items-center active:opacity-90"
                >
                    <Ionicons name="sparkles" size={18} color="white" className="mr-2" />
                    <Text className="text-white font-bold text-base ml-2">Generate Plan</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <View className="bg-white m-4 p-5 rounded-2xl shadow-sm">
            <CelebrationModal
                visible={showCelebration}
                onClose={() => setShowCelebration(false)}
            />

            <View className="flex-row items-center justify-between mb-4">
                <View>
                    <Text className="text-lg font-bold text-gray-900">Today's Missions</Text>
                    <Text className="text-xs text-gray-400">{new Date(dailyPlan.date).toLocaleDateString()}</Text>
                </View>
                <View className="bg-green-100 px-3 py-1 rounded-full">
                    <Text className="text-green-700 text-xs font-bold">Daily Goal</Text>
                </View>
            </View>

            <Text className="text-gray-600 italic mb-4 text-sm bg-gray-50 p-3 rounded-lg border border-gray-100">
                "{dailyPlan.summary}"
            </Text>

            <View className="space-y-3">
                {dailyPlan.tasks.map((task) => (
                    <Pressable
                        key={task.id}
                        onPress={() => toggleTask(task.id)}
                        // disabled={task.is_completed} -> Removed to allow toggling
                        className={`flex-row items-center p-3 rounded-xl border ${task.is_completed
                            ? 'bg-gray-50 border-gray-100'
                            : 'bg-white border-gray-200'
                            }`}
                    >
                        <View className={`w-6 h-6 rounded-md items-center justify-center border mr-3 ${task.is_completed ? 'bg-green-500 border-green-500' : 'border-gray-300'
                            }`}>
                            {task.is_completed && <Ionicons name="checkmark" size={16} color="white" />}
                        </View>

                        <View className="flex-1">
                            <Text className={`font-medium text-base ${task.is_completed ? 'text-gray-400 line-through' : 'text-gray-800'
                                }`}>
                                {task.description}
                            </Text>
                            <Text className="text-xs text-blue-500 font-bold mt-1">
                                +{task.xp_reward} XP
                            </Text>
                        </View>

                        <View>
                            {getTaskIcon(task.task_type)}
                        </View>
                    </Pressable>
                ))}
            </View>
        </View>
    );
}

function getTaskIcon(type: string) {
    let iconName: any = "ellipse";
    let color = "#9CA3AF";

    switch (type.toLowerCase()) {
        case 'workout':
            iconName = "barbell";
            color = "#EF4444"; // red
            break;
        case 'nutrition':
            iconName = "nutrition";
            color = "#10B981"; // green
            break;
        case 'mindfulness':
            iconName = "water";
            color = "#3B82F6"; // blue
            break;
    }

    return <Ionicons name={iconName} size={20} color={color} opacity={0.5} />;
}
