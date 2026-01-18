import { Ionicons } from '@expo/vector-icons';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Placeholder data - will be replaced with real data from biomarker_logs
const PLACEHOLDER_INSIGHTS = {
    gait: {
        score: 85,
        trend: 'up',
        lastTest: '2 days ago',
    },
    hrv: {
        score: 62,
        trend: 'stable',
        lastTest: 'Today',
    },
    sleep: {
        score: 78,
        trend: 'down',
        lastTest: 'Last night',
    },
};

const getTrendIcon = (trend: string) => {
    switch (trend) {
        case 'up': return 'trending-up';
        case 'down': return 'trending-down';
        default: return 'remove';
    }
};

const getTrendColor = (trend: string) => {
    switch (trend) {
        case 'up': return '#34A853';
        case 'down': return '#EA4335';
        default: return '#FBBC04';
    }
};

interface InsightCardProps {
    title: string;
    icon: string;
    score: number;
    trend: string;
    lastTest: string;
    color: string;
}

const InsightCard = ({ title, icon, score, trend, lastTest, color }: InsightCardProps) => (
    <View
        className="bg-white rounded-2xl p-5 mb-4"
        style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2
        }}
    >
        <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
                <View
                    className="w-12 h-12 rounded-xl items-center justify-center mr-3"
                    style={{ backgroundColor: color + '20' }}
                >
                    <Ionicons name={icon as any} size={24} color={color} />
                </View>
                <View>
                    <Text className="text-lg font-bold text-gray-800">{title}</Text>
                    <Text className="text-gray-400 text-sm">Last: {lastTest}</Text>
                </View>
            </View>
            <View className="flex-row items-center">
                <Ionicons name={getTrendIcon(trend) as any} size={20} color={getTrendColor(trend)} />
            </View>
        </View>

        {/* Score Bar */}
        <View className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <View
                className="h-full rounded-full"
                style={{ width: `${score}%`, backgroundColor: color }}
            />
        </View>
        <View className="flex-row justify-between mt-2">
            <Text className="text-gray-400 text-sm">Score</Text>
            <Text className="font-bold" style={{ color }}>{score}/100</Text>
        </View>
    </View>
);

export default function InsightsScreen() {
    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <ScrollView contentContainerStyle={{ padding: 24 }}>
                {/* Header */}
                <View className="mb-6">
                    <Text className="text-3xl font-bold text-gray-900">Bio-Insights</Text>
                    <Text className="text-gray-500 mt-1">Track your body's signals</Text>
                </View>

                {/* Coming Soon Banner */}
                <View className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6 flex-row items-center">
                    <Ionicons name="information-circle" size={24} color="#4285F4" />
                    <Text className="text-blue-700 ml-3 flex-1">
                        Sensor features coming soon! Run Walk Tests and measure HRV.
                    </Text>
                </View>

                {/* Insight Cards */}
                <InsightCard
                    title="Gait Symmetry"
                    icon="walk"
                    score={PLACEHOLDER_INSIGHTS.gait.score}
                    trend={PLACEHOLDER_INSIGHTS.gait.trend}
                    lastTest={PLACEHOLDER_INSIGHTS.gait.lastTest}
                    color="#4285F4"
                />

                <InsightCard
                    title="Heart Rate Variability"
                    icon="heart"
                    score={PLACEHOLDER_INSIGHTS.hrv.score}
                    trend={PLACEHOLDER_INSIGHTS.hrv.trend}
                    lastTest={PLACEHOLDER_INSIGHTS.hrv.lastTest}
                    color="#EA4335"
                />

                <InsightCard
                    title="Sleep Quality"
                    icon="moon"
                    score={PLACEHOLDER_INSIGHTS.sleep.score}
                    trend={PLACEHOLDER_INSIGHTS.sleep.trend}
                    lastTest={PLACEHOLDER_INSIGHTS.sleep.lastTest}
                    color="#9C27B0"
                />

                {/* Weekly Summary Placeholder */}
                <View className="bg-white rounded-2xl p-5 mt-2" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
                    <Text className="text-lg font-bold text-gray-800 mb-3">Weekly Summary</Text>
                    <View className="flex-row justify-around">
                        <View className="items-center">
                            <Text className="text-2xl font-bold text-green-500">3</Text>
                            <Text className="text-gray-400 text-sm">Walk Tests</Text>
                        </View>
                        <View className="items-center">
                            <Text className="text-2xl font-bold text-red-500">5</Text>
                            <Text className="text-gray-400 text-sm">HRV Checks</Text>
                        </View>
                        <View className="items-center">
                            <Text className="text-2xl font-bold text-purple-500">7</Text>
                            <Text className="text-gray-400 text-sm">Sleep Logs</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
