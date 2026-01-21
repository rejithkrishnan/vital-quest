import { create } from 'zustand';
import { supabase } from '@/services/supabase';
import { useAuthStore } from './authStore';

interface UserSettings {
    water_increment: number;
    // Add future settings here (e.g., theme, notifications)
}

interface SettingsState {
    settings: UserSettings;
    isLoading: boolean;
    fetchSettings: () => Promise<void>;
    updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => Promise<void>;
}

const DEFAULT_SETTINGS: UserSettings = {
    water_increment: 250,
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
    settings: DEFAULT_SETTINGS,
    isLoading: false,

    fetchSettings: async () => {
        const user = useAuthStore.getState().user;
        if (!user) return;

        set({ isLoading: true });
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('settings')
                .eq('id', user.id)
                .single();

            if (data?.settings) {
                // Merge with defaults to ensure all keys exist
                set({ settings: { ...DEFAULT_SETTINGS, ...data.settings } });
            }
        } catch (e) {
            console.error('Failed to fetch settings:', e);
        } finally {
            set({ isLoading: false });
        }
    },

    updateSetting: async (key, value) => {
        const user = useAuthStore.getState().user;
        if (!user) return;

        // Optimistic update
        const currentSettings = get().settings;
        const newSettings = { ...currentSettings, [key]: value };
        set({ settings: newSettings });

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ settings: newSettings })
                .eq('id', user.id);

            if (error) throw error;
        } catch (e) {
            console.error('Failed to update setting:', e);
            // Revert on error
            set({ settings: currentSettings });
        }
    }
}));
