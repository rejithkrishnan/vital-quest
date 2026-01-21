import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '@/stores/settingsStore';
import { useEffect } from 'react';

export default function SettingsScreen() {
    const router = useRouter();
    const { settings, updateSetting, fetchSettings } = useSettingsStore();

    useEffect(() => {
        fetchSettings();
    }, []);

    const waterOptions = [100, 200, 250, 500];

    return (
        <View className="flex-1 bg-gray-50">
            <Stack.Screen options={{
                title: 'Settings',
                headerShown: true,
                headerShadowVisible: false,
                headerStyle: { backgroundColor: '#F9FAFB' },
                headerTintColor: '#1F2937'
            }} />

            <ScrollView contentContainerStyle={{ padding: 24 }}>
                {/* Section: Hydration */}
                <View className="mb-8">
                    <Text className="text-gray-500 font-bold mb-3 uppercase text-xs tracking-wider ml-1">Hydration</Text>
                    <View className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                        <View className="flex-row items-center mb-4">
                            <View className="w-10 h-10 bg-blue-50 rounded-xl items-center justify-center mr-3">
                                <Ionicons name="water" size={20} color="#3B82F6" />
                            </View>
                            <View className="flex-1">
                                <Text className="font-bold text-gray-900 text-base">Quick Add Amount</Text>
                                <Text className="text-gray-500 text-sm">How much water to add per tap</Text>
                            </View>
                        </View>

                        <View className="flex-row gap-2">
                            {waterOptions.map((opt) => (
                                <TouchableOpacity
                                    key={opt}
                                    onPress={() => updateSetting('water_increment', opt)}
                                    className={`flex-1 py-3 rounded-xl items-center border ${settings.water_increment === opt
                                            ? 'bg-blue-500 border-blue-500'
                                            : 'bg-white border-gray-200'
                                        }`}
                                >
                                    <Text className={`font-bold ${settings.water_increment === opt ? 'text-white' : 'text-gray-700'
                                        }`}>
                                        {opt}ml
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>

                {/* App Info */}
                <View className="mb-8">
                    <Text className="text-gray-500 font-bold mb-3 uppercase text-xs tracking-wider ml-1">About</Text>
                    <View className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                        <View className="flex-row items-center justify-between">
                            <Text className="text-gray-900 font-medium">Version</Text>
                            <Text className="text-gray-500">1.0.0 (Beta)</Text>
                        </View>
                    </View>
                </View>

            </ScrollView>
        </View>
    );
}
