import { useGamificationStore } from '@/stores/gamificationStore';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

export default function GamificationWidget() {
    const { xp, level, streak } = useGamificationStore();

    const nextLevelXp = Math.pow(level + 1, 2) * 100;
    // Progress capped at 100%
    const progress = Math.min((xp / nextLevelXp) * 100, 100);

    return (
        <View className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex-row items-center justify-between">
            {/* Level Info */}
            <View className="flex-1 mr-4">
                <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-gray-900 font-bold text-lg">Level {level}</Text>
                    <Text className="text-gray-400 text-xs font-medium">{Math.floor(progress)}% to Lvl {level + 1}</Text>
                </View>
                <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <View
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${progress}%` }}
                    />
                </View>
            </View>

            {/* Streak Info */}
            <View className="bg-orange-50 px-3 py-2 rounded-2xl items-center border border-orange-100">
                <View className="flex-row items-center space-x-1">
                    <Ionicons name="flame" size={18} color="#EA4335" />
                    <Text className="text-orange-600 font-bold text-lg">{streak}</Text>
                </View>
                <Text className="text-orange-400 text-[10px] font-bold uppercase tracking-wider">Streak</Text>
            </View>
        </View>
    );
}
