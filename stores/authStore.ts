
import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/services/supabase';

interface AuthState {
    user: User | null;
    session: Session | null;
    profile: any | null;
    loading: boolean;
    initialized: boolean;
    initialize: () => Promise<void>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    session: null,
    profile: null,
    loading: true,
    initialized: false,

    initialize: async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            let profile = null;

            if (session?.user) {
                const { data } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();
                profile = data;
            }

            set({
                session,
                user: session?.user ?? null,
                profile,
                loading: false,
                initialized: true
            });

            // Listen for auth changes
            supabase.auth.onAuthStateChange(async (_event, session) => {
                let profile = null;
                if (session?.user) {
                    const { data } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', session.user.id)
                        .single();
                    profile = data;
                }

                set({
                    session,
                    user: session?.user ?? null,
                    profile,
                    loading: false
                });
            });
        } catch (error) {
            set({ loading: false, initialized: true });
        }
    },

    refreshProfile: async () => {
        const { user } = get();
        if (!user) return;
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
        set({ profile: data });
    },

    signOut: async () => {
        await supabase.auth.signOut();
        set({ session: null, user: null, profile: null });
    },
}));
