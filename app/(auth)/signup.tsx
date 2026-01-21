
import { View, Text, TextInput, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { supabase } from '@/services/supabase';

import { CustomAlert as Alert } from '@/utils/CustomAlert';

export default function SignupScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSignup() {
        if (!email || !password) return;
        setLoading(true);

        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
            });

            if (error) throw error;

            Alert.alert("Success", "Check your email for the confirmation link!");
            router.back();
        } catch (error: any) {
            Alert.alert("Signup Failed", error.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <SafeAreaView className="flex-1 bg-white p-6 justify-center">
            <View className="mb-8">
                <Text className="text-4xl font-bold text-gray-900 mb-2">Create Account</Text>
                <Text className="text-gray-500 text-lg">Start your vital quest today</Text>
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
                    onPress={handleSignup}
                    disabled={loading}
                >
                    <Text className="text-white font-semibold text-lg">
                        {loading ? 'Creating account...' : 'Sign Up'}
                    </Text>
                </Pressable>

                <View className="flex-row justify-center mt-6">
                    <Text className="text-gray-500">Already have an account? </Text>
                    <Link href="/(auth)/login" asChild>
                        <Pressable>
                            <Text className="text-blue-500 font-semibold">Sign In</Text>
                        </Pressable>
                    </Link>
                </View>
            </View>
        </SafeAreaView>
    );
}
