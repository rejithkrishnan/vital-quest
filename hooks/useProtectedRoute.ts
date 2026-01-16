
import { useEffect } from 'react';
import { useSegments, router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/services/supabase';

export function useProtectedRoute() {
    const { session, initialized } = useAuthStore();
    const segments = useSegments();

    useEffect(() => {
        if (!initialized) return;

        const inAuthGroup = segments[0] === '(auth)';

        const checkProfile = async () => {
            if (!session) return;

            const { data: profile } = await supabase
                .from('profiles')
                .select('profile_data')
                .eq('id', session.user.id)
                .single();

            const isOnboardingComplete = profile?.profile_data?.onboarding_completed;
            const inAttributes = segments[0] === '(auth)' && segments[1] === 'onboarding';

            if (!isOnboardingComplete && !inAttributes) {
                router.replace('/(auth)/onboarding');
            }
        };

        if (!session && !inAuthGroup) {
            // Redirect to the sign-in page.
            router.replace('/(auth)/login');
        } else if (session && inAuthGroup && segments[1] !== 'onboarding') {
            // Redirect away from sign-in page but check onboarding first
            checkProfile().then(() => router.replace('/(tabs)'));
        } else if (session && !inAuthGroup) {
            checkProfile();
        }
    }, [session, segments, initialized]);
}
