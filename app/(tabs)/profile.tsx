import { View, Text, Pressable, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/services/supabase';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function ProfileScreen() {
    const { signOut, user } = useAuthStore();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            if (!user) return;
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error) throw error;
            setProfile(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const StatCard = ({ label, value, icon, color }: any) => (
        <View className="bg-white p-4 rounded-2xl border border-gray-100 flex-1 mx-2 items-center shadow-sm">
            <View className={`p-2 rounded-full mb-2 ${color === 'blue' ? 'bg-blue-100' : 'bg-green-100'}`}>
                <Ionicons name={icon} size={20} color={color === 'blue' ? '#4285F4' : '#34A853'} />
            </View>
            <Text className="text-gray-500 text-xs font-medium uppercase tracking-wider">{label}</Text>
            <Text className="text-xl font-bold text-gray-900 mt-1">{value}</Text>
        </View>
    );

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-white items-center justify-center">
                <Text className="text-gray-500">Loading profile...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header Profile Section */}
                <View className="bg-white p-6 pb-8 rounded-b-[32px] shadow-sm mb-6">
                    <View className="items-center">
                        <View className="w-24 h-24 bg-gray-200 rounded-full mb-4 items-center justify-center border-4 border-white shadow-sm overflow-hidden">
                            <Ionicons name="person" size={40} color="#9CA3AF" />
                        </View>
                        <Text className="text-2xl font-bold text-gray-900">{profile?.full_name || 'User'}</Text>
                        <Text className="text-gray-500">{user?.email}</Text>

                        <View className="flex-row mt-4 space-x-2">
                            <View className="bg-blue-50 px-3 py-1 rounded-full">
                                <Text className="text-blue-600 font-medium text-xs">Level 1</Text>
                            </View>
                            <View className="bg-green-50 px-3 py-1 rounded-full">
                                <Text className="text-green-600 font-medium text-xs">0 XP</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Stats Grid */}
                <View className="px-4 mb-6">
                    <Text className="text-lg font-bold text-gray-900 mb-4 ml-2">My Stats</Text>
                    <View className="flex-row mb-4">
                        <StatCard
                            label="Weight"
                            value={`${profile?.profile_data?.weight || '--'} kg`}
                            icon="scale"
                            color="blue"
                        />
                        <StatCard
                            label="Height"
                            value={`${profile?.profile_data?.height || '--'} cm`}
                            icon="resize"
                            color="green"
                        />
                    </View>
                    <View className="flex-row">
                        <StatCard
                            label="BMI"
                            value={profile?.profile_data?.weight && profile?.profile_data?.height
                                ? (profile.profile_data.weight / ((profile.profile_data.height / 100) ** 2)).toFixed(1)
                                : '--'
                            }
                            icon="calculator"
                            color="green"
                        />
                        <StatCard
                            label="Age"
                            value={`${profile?.profile_data?.age || '--'} yrs`}
                            icon="time"
                            color="blue"
                        />
                    </View>
                </View>

                {/* Equipment Section */}
                <View className="px-6 mb-8">
                    <Text className="text-lg font-bold text-gray-900 mb-3">Equipment</Text>
                    <View className="flex-row flex-wrap">
                        {profile?.profile_data?.equipment?.length > 0 ? (
                            profile.profile_data.equipment.map((item: string, index: number) => (
                                <View key={index} className="bg-white px-4 py-2 rounded-full border border-gray-200 mr-2 mb-2">
                                    <Text className="text-gray-700 capitalize">{item.replace('_', ' ')}</Text>
                                </View>
                            ))
                        ) : (
                            <Text className="text-gray-400 italic">No equipment selected</Text>
                        )}
                    </View>
                </View>

                <View className="px-6 pb-8">
                    <Pressable
                        onPress={signOut}
                        className="bg-red-50 p-4 rounded-xl items-center border border-red-100"
                    >
                        <Text className="text-red-600 font-semibold">Sign Out</Text>
                    </Pressable>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}
