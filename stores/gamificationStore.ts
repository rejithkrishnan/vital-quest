import { supabase } from '@/services/supabase';
import * as Haptics from 'expo-haptics';
import { create } from 'zustand';
import { useAuthStore } from './authStore';

export interface PlanTask {
    id: string;
    description: string;
    is_completed: boolean;
    xp_reward: number;
    task_type: string;
}

export interface DailyPlan {
    id: string;
    date: string;
    summary: string;
    tasks: PlanTask[];
}

interface GamificationState {
    xp: number;
    level: number;
    streak: number;
    loading: boolean;
    initialized: boolean;

    // Daily Plans
    dailyPlan: DailyPlan | null;
    isGeneratingPlan: boolean;

    fetchStats: () => Promise<void>;
    addXp: (amount: number) => Promise<void>;
    fetchTodayPlan: () => Promise<void>;
    generateDailyPlan: () => Promise<void>;
    toggleTask: (taskId: string) => Promise<void>;
    subscribeToRealtime: () => () => void;
}

export const useGamificationStore = create<GamificationState>((set, get) => ({
    xp: 0,
    level: 1,
    streak: 0,
    loading: false,
    initialized: false,

    dailyPlan: null,
    isGeneratingPlan: false,

    fetchStats: async () => {
        const user = useAuthStore.getState().user;
        if (!user) return;

        set({ loading: true });
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('xp, level, current_streak')
                .eq('id', user.id)
                .single();

            if (error) throw error;

            if (data) {
                set({
                    xp: data.xp || 0,
                    level: data.level || 1,
                    streak: data.current_streak || 0,
                    initialized: true
                });
            }
        } catch (error) {
            console.error('Error fetching gamification stats:', error);
        } finally {
            set({ loading: false });
        }
    },

    addXp: async (amount: number) => {
        const user = useAuthStore.getState().user;
        if (!user) return;

        // Haptic Feedback
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Optimistic Update
        const currentXp = get().xp;
        const newXp = currentXp + amount;

        let newLevel = Math.floor(Math.sqrt(newXp / 100));
        if (newLevel < 1) newLevel = 1;

        set({ xp: newXp, level: newLevel });

        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    xp: newXp,
                    level: newLevel,
                    last_active_date: new Date().toISOString()
                })
                .eq('id', user.id);

            if (error) {
                console.error('Failed to sync XP:', error);
                set({ xp: currentXp });
                throw error;
            }
        } catch (error) {
            console.error(error);
        }
    },

    fetchTodayPlan: async () => {
        const user = useAuthStore.getState().user;
        if (!user) return;

        try {
            const today = new Date().toISOString().split('T')[0];

            // 1. Check if plan exists for today
            const { data: rawData, error: planError } = await supabase
                .from('daily_plans')
                .select('id, date, summary')
                .eq('user_id', user.id)
                .eq('date', today)
                .order('created_at', { ascending: false })
                .limit(1);

            const planData = (rawData && rawData.length > 0) ? rawData[0] : null;

            if (planError) throw planError;

            if (planData) {
                // 2. Fetch tasks for the plan
                const { data: tasksData, error: tasksError } = await supabase
                    .from('plan_tasks')
                    .select('*')
                    .eq('plan_id', planData.id)
                    .order('created_at', { ascending: true });

                if (tasksError) throw tasksError;

                set({
                    dailyPlan: {
                        ...planData,
                        tasks: tasksData || []
                    }
                });
            } else {
                set({ dailyPlan: null });
            }

        } catch (error) {
            console.error('Error fetching daily plan:', error);
        }
    },

    generateDailyPlan: async () => {
        const user = useAuthStore.getState().user;
        if (!user) return;

        const currentState = get();
        if (currentState.isGeneratingPlan || currentState.dailyPlan) return;

        set({ isGeneratingPlan: true });

        try {
            // 1. Call AI to generate plan
            const { data: aiData, error: aiError } = await supabase.functions.invoke('chat-agent', {
                body: {
                    mode: 'plan',
                    context: {
                        userName: user.user_metadata?.full_name || 'User',
                        xp: currentState.xp,
                        level: currentState.level
                    }
                }
            });

            if (aiError) throw aiError;

            // Parse valid JSON
            let planJson;
            try {
                // The AI might return stringified JSON or plain string, let's parse carefully
                const rawText = typeof aiData.text === 'string' ? aiData.text : JSON.stringify(aiData.text);
                // Ensure no markdown code blocks
                const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
                planJson = JSON.parse(cleanJson);
            } catch (e) {
                console.error("Failed to parse AI plan JSON", aiData.text);
                throw new Error("Invalid format from AI");
            }

            // 2. Insert into DB
            const { data: planInsert, error: planInsertError } = await supabase
                .from('daily_plans')
                .insert({
                    user_id: user.id,
                    summary: planJson.summary,
                    date: new Date().toISOString().split('T')[0]
                })
                .select()
                .single();

            if (planInsertError) throw planInsertError;

            // 3. Insert Tasks
            const tasksToInsert = planJson.tasks.map((t: any) => ({
                plan_id: planInsert.id,
                description: t.description,
                xp_reward: t.xp_reward || 10,
                task_type: t.task_type
            }));

            const { data: tasksInsert, error: tasksInsertError } = await supabase
                .from('plan_tasks')
                .insert(tasksToInsert)
                .select();

            if (tasksInsertError) throw tasksInsertError;

            set({
                dailyPlan: {
                    ...planInsert,
                    tasks: tasksInsert
                }
            });

        } catch (error) {
            console.error('Error generating plan:', error);
            // Optionally set an error state here
        } finally {
            set({ isGeneratingPlan: false });
        }
    },

    subscribeToRealtime: () => {
        const user = useAuthStore.getState().user;
        if (!user) return () => { };

        console.log("Subscribing to realtime updates for user:", user.id);

        const channel = supabase
            .channel('db-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'plan_tasks'
                },
                (payload) => {
                    console.log('Realtime plan_tasks change:', payload.eventType);
                    get().fetchTodayPlan();
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${user.id}`
                },
                (payload) => {
                    console.log('Realtime profile change:', payload.eventType);
                    get().fetchStats();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    },

    toggleTask: async (taskId: string) => {
        const state = get();
        const plan = state.dailyPlan;
        if (!plan) return;

        // Optimistic update
        const taskIndex = plan.tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return;

        const task = plan.tasks[taskIndex];
        const newStatus = !task.is_completed;
        const xpChange = newStatus ? task.xp_reward : -task.xp_reward;

        // Update logic: Add or Remove XP
        await state.addXp(xpChange);

        // Haptics
        if (newStatus) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        // Update local state
        const updatedTasks = [...plan.tasks];
        updatedTasks[taskIndex] = { ...task, is_completed: newStatus };

        set({
            dailyPlan: {
                ...plan,
                tasks: updatedTasks
            }
        });

        // Sync with DB
        try {
            const { error } = await supabase
                .from('plan_tasks')
                .update({ is_completed: newStatus })
                .eq('id', taskId);

            if (error) throw error;
        } catch (error) {
            console.error('Error toggling task:', error);
            // Could revert here if needed
        }
    }
}));
