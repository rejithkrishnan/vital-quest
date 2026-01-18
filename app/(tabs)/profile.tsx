import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useGamificationStore } from '@/stores/gamificationStore';
import MemoryListModal from '@/components/MemoryListModal';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
    const { signOut, user } = useAuthStore();
    const { xp, level, streak, fetchStats, addXp } = useGamificationStore();

    // Local state for profile details (height, weight)
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showMemoryModal, setShowMemoryModal] = useState(false);

    useEffect(() => {
        fetchProfile();
        fetchStats();
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

    const nextLevelXp = (level + 1) * (level + 1) * 100;
    // Current level base XP: level^2 * 100. 
    // Example: Lvl 1 starts at 100 XP. Lvl 2 starts at 400 XP.
    // Progress calculation is tricky with this formula.
    // Simpler View: Just show Total XP. 

    // Let's us a simple linear progress for "XP towards next level" ?
    // Or just show "Total XP".
    // TDD Formula: Level = floor(sqrt(total_xp / 100)).
    // So next level is (CurrentLevel + 1). 
    // XP needed for Next Level = (CurrentLevel + 1)^2 * 100.
    const xpNeeded = Math.pow(level + 1, 2) * 100;
    const progress = Math.min((xp / xpNeeded) * 100, 100);

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

                        {/* Gamification Badge */}
                        <View className="flex-row mt-6 items-center space-x-4 w-full justify-center">
                            <View className="bg-blue-50 px-4 py-2 rounded-xl items-center min-w-[100px]">
                                <Text className="text-blue-600 font-bold text-lg">Lvl {level}</Text>
                                <Text className="text-blue-400 text-xs font-medium">Rank</Text>
                            </View>
                            <View className="bg-orange-50 px-4 py-2 rounded-xl items-center min-w-[100px]">
                                <Text className="text-orange-600 font-bold text-lg">{streak} Days</Text>
                                <Text className="text-orange-400 text-xs font-medium uppercase">Streak</Text>
                            </View>
                        </View>

                        {/* XP Bar */}
                        <View className="w-full mt-6 px-4">
                            <View className="flex-row justify-between mb-2">
                                <Text className="text-gray-500 font-medium text-xs">XP Progress</Text>
                                <Text className="text-gray-900 font-bold text-xs">{xp} / {xpNeeded} XP</Text>
                            </View>
                            <View className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                <View
                                    className="h-full bg-blue-500 rounded-full"
                                    style={{ width: `${progress}%` }}
                                />
                            </View>
                        </View>
                    </View>
                </View>

                {/* AI Settings Section */}
                <View className="px-6 mb-6">
                    <Text className="text-xs font-bold text-gray-400 uppercase mb-2">AI Settings</Text>
                    <Pressable
                        onPress={() => setShowMemoryModal(true)}
                        className="bg-white p-4 rounded-xl border border-gray-100 flex-row items-center justify-between shadow-sm"
                    >
                        <View className="flex-row items-center space-x-3">
                            <View className="bg-purple-100 p-2 rounded-full">
                                <Ionicons name="bulb" size={20} color="#8B5CF6" />
                            </View>
                            <View>
                                <Text className="text-gray-900 font-semibold">AI Memory</Text>
                                <Text className="text-gray-500 text-xs">View what VitalQuest knows</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    </Pressable>
                </View>

                {/* Debug Zone */}
                <View className="px-6 mb-6">
                    <Text className="text-xs font-bold text-gray-400 uppercase mb-2">Developer Tools</Text>
                    <Pressable
                        onPress={() => addXp(50)}
                        className="bg-gray-900 p-3 rounded-lg flex-row items-center justify-center space-x-2"
                    >
                        <Ionicons name="construct" size={16} color="white" />
                        <Text className="text-white font-medium">Add 50 XP (Test Level Up)</Text>
                    </Pressable>
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

            <MemoryListModal visible={showMemoryModal} onClose={() => setShowMemoryModal(false)} />
        </SafeAreaView>
    );
}
