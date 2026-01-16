
import { View, Text, TextInput, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/services/supabase';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { initialize } = useAuthStore();

    async function handleLogin() {
        if (!email || !password) return;
        setLoading(true);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            await initialize();

            // Check if onboarding is complete
            const { data: profile } = await supabase
                .from('profiles')
                .select('profile_data')
                .eq('id', (await supabase.auth.getUser()).data.user!.id)
                .single();

            if (profile?.profile_data?.onboarding_completed) {
                router.replace('/(tabs)');
            } else {
                router.replace('/(auth)/onboarding'); // Redirect to onboarding
            }
        } catch (error: any) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <SafeAreaView className="flex-1 bg-white p-6 justify-center">
            <View className="mb-8">
                <Text className="text-4xl font-bold text-gray-900 mb-2">Welcome Back</Text>
                <Text className="text-gray-500 text-lg">Sign in to continue your journey</Text>
            </View>

            <View className="space-y-4">
                <View>
                    <Text className="text-gray-700 font-medium mb-1 ml-1">Email</Text>
                    <TextInput
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-900"
                        placeholder="you@example.com"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                    />
                </View>

                <View>
                    <Text className="text-gray-700 font-medium mb-1 ml-1">Password</Text>
                    <TextInput
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-900"
                        placeholder="••••••••"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />
                </View>

                <Pressable
                    className={`w-full bg-blue-500 rounded-xl p-4 items-center mt-4 active:bg-blue-600 ${loading ? 'opacity-70' : ''}`}
                    onPress={handleLogin}
                    disabled={loading}
                >
                    <Text className="text-white font-semibold text-lg">
                        {loading ? 'Signing in...' : 'Sign In'}
                    </Text>
                </Pressable>

                <View className="flex-row justify-center mt-6">
                    <Text className="text-gray-500">Don't have an account? </Text>
                    <Link href="/(auth)/signup" asChild>
                        <Pressable>
                            <Text className="text-blue-500 font-semibold">Sign Up</Text>
                        </Pressable>
                    </Link>
                </View>
            </View>
        </SafeAreaView>
    );
}
