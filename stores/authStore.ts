
import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/services/supabase';

interface AuthState {
    user: User | null;
    session: Session | null;
    loading: boolean;
    initialized: boolean;
    initialize: () => Promise<void>;
    signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    session: null,
    loading: true,
    initialized: false,

    initialize: async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            set({
                session,
                user: session?.user ?? null,
                loading: false,
                initialized: true
            });

            // Listen for auth changes
            supabase.auth.onAuthStateChange(async (_event, session) => {
                set({
                    session,
                    user: session?.user ?? null,
                    loading: false
                });
            });
        } catch (error) {
            set({ loading: false, initialized: true });
        }
    },

    signOut: async () => {
        await supabase.auth.signOut();
        set({ session: null, user: null });
    },
}));
