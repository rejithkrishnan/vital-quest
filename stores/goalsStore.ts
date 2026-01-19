import { create } from 'zustand';
import { supabase } from '@/services/supabase';

// DB Types
export interface HealthGoal {
    id: string;
    user_id: string;
    goal_type: string;
    target_value: number;
    target_unit: string;
    start_value: number;
    start_date: string;
    target_date: string;
    duration_weeks: number;
    status: 'active' | 'completed' | 'modified' | 'abandoned';
    is_realistic: boolean;
    ai_summary: string;
    daily_calorie_target: number;
    protein_target: number;
    carbs_target: number;
    fat_target: number;
}

export interface WeeklyPlan {
    id: string;
    goal_id: string;
    week_number: number;
    week_start_date: string;
    calorie_target: number;
    focus_areas: any;
    ai_tips: string;
    status: 'upcoming' | 'in_progress' | 'completed';
}

export interface PlanTask {
    id: string;
    plan_id: string;
    description: string;
    is_completed: boolean;
    xp_reward: number;
    task_type: 'workout' | 'nutrition' | 'mindfulness';
    metadata: any;
    time_slot: string;
    meal_type?: string;
}

export interface DailyPlan {
    id: string;
    user_id: string;
    date: string;
    summary: string;
    weekly_plan_id?: string;
    calorie_target: number;
    protein_target: number;
    carbs_target: number;
    fat_target: number;
}

export interface GoalsState {
    activeGoal: HealthGoal | null;
    weeklyPlans: WeeklyPlan[];
    dailyPlan: DailyPlan | null;
    tasks: PlanTask[];
    isLoading: boolean;
    error: string | null;

    fetchActiveGoal: () => Promise<void>;
    createGoal: (goalData: Partial<HealthGoal>) => Promise<HealthGoal | null>;
    validateGoalWithAI: (description: string, currentWeight: number, targetWeight: number, durationWeeks: number) => Promise<any>;
    generateFullPlan: (goalId: string, context: any) => Promise<void>;
    generateDailyTasks: (date: Date) => Promise<void>; // New action
    fetchWeeklyPlans: (goalId: string) => Promise<void>;
    fetchDailyPlan: (date: Date) => Promise<void>;
    toggleTaskCompletion: (taskId: string, isCompleted: boolean) => Promise<void>;
    analyzeMeal: (imageOrText: string | { uri: string, base64?: string }, context: any) => Promise<any>;
    logMeal: (taskId: string, logData: any, photoUrl?: string) => Promise<void>;
    deleteGoal: (goalId: string) => Promise<void>;
}

export const useGoalsStore = create<GoalsState>((set, get) => ({
    activeGoal: null,
    weeklyPlans: [],
    dailyPlan: null,
    tasks: [],
    isLoading: false,
    error: null,

    fetchActiveGoal: async () => {
        set({ isLoading: true, error: null });
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;
            const user = session.user;

            const { data, error } = await supabase
                .from('health_goals')
                .select('*')
                .eq('user_id', user.id)
                .eq('status', 'active')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows found"

            if (data) {
                set({ activeGoal: data });
                await get().fetchWeeklyPlans(data.id);
            }
        } catch (e: any) {
            console.error('Error fetching goal:', e);
            set({ error: e.message });
        } finally {
            set({ isLoading: false });
        }
    },

    createGoal: async (goalData) => {
        set({ isLoading: true, error: null });
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) throw new Error('No user found');
            const user = session.user;
            if (!user) throw new Error('No user found');

            const { data, error } = await supabase
                .from('health_goals')
                .insert([{ ...goalData, user_id: user.id }])
                .select()
                .single();

            if (error) throw error;

            set({ activeGoal: data });
            return data;
        } catch (e: any) {
            set({ error: e.message });
            return null;
        } finally {
            set({ isLoading: false });
        }
    },

    validateGoalWithAI: async (description, currentWeight, targetWeight, durationWeeks) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { data, error } = await supabase.functions.invoke('chat-agent', {
                body: {
                    mode: 'validate_goal',
                    userId: user?.id || '00000000-0000-0000-0000-000000000000',
                    context: {
                        goalDescription: description,
                        weight: currentWeight,
                        targetValue: targetWeight,
                        targetUnit: 'kg',
                        durationWeeks: durationWeeks
                    }
                }
            });

            if (error) throw error;
            return JSON.parse(data.text);
        } catch (e: any) {
            console.error('Validation error:', e);
            return { is_realistic: false, reason: "Failed to validate goal." };
        }
    },

    generateFullPlan: async (goalId, context) => {
        set({ isLoading: true, error: null });
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) throw new Error('No user found');
            const user = session.user;

            // 1. Call AI for Roadmap
            const { data, error } = await supabase.functions.invoke('chat-agent', {
                body: {
                    mode: 'generate_roadmap', // Updated mode
                    context: { ...context, goalId },
                    userId: user.id
                }
            });

            if (error) throw error;
            let planJson = data.text ? JSON.parse(data.text) : data;
            if (typeof planJson === 'string') {
                try {
                    planJson = JSON.parse(planJson);
                } catch (e) {
                    console.error("JSON Parse Error", e);
                }
            }

            console.log("Roadmap Generated:", planJson);

            // 2. Create Weekly Plans
            const startDate = new Date();
            const weeklyPlansData = planJson.weekly_plans.map((wp: any, index: number) => {
                const weekStart = new Date(startDate);
                weekStart.setDate(startDate.getDate() + (index * 7));
                return {
                    goal_id: goalId,
                    user_id: user.id,
                    week_number: wp.week,
                    week_start_date: weekStart.toISOString(),
                    calorie_target: wp.calorie_target || planJson.daily_calorie_target,
                    focus_areas: wp.focus,
                    ai_tips: wp.ai_tips,
                    status: index === 0 ? 'in_progress' : 'upcoming'
                };
            });

            const { data: createdWeeks, error: weekError } = await supabase
                .from('weekly_plans')
                .insert(weeklyPlansData)
                .select();

            if (weekError) throw weekError;

            // 3. Create Daily Plans (Skeleton for entire duration)
            const dailyPlansData = [];
            const durationDays = context.durationWeeks * 7;

            // Helper to find relevant weekly plan ID
            const getWeeklyPlanId = (dayIndex: number) => {
                const weekIndex = Math.floor(dayIndex / 7);
                return createdWeeks[weekIndex]?.id;
            };

            for (let i = 0; i < durationDays; i++) {
                const currentDate = new Date(startDate);
                currentDate.setDate(startDate.getDate() + i);

                dailyPlansData.push({
                    user_id: user.id,
                    goal_id: goalId,
                    weekly_plan_id: getWeeklyPlanId(i),
                    date: currentDate.toISOString().split('T')[0],
                    calorie_target: planJson.daily_calorie_target,
                    protein_target: planJson.macros?.protein,
                    carbs_target: planJson.macros?.carbs,
                    fat_target: planJson.macros?.fat,
                    summary: i === 0 ? "Day 1 Kickoff" : "Pending AI generation"
                });
            }

            const { data: createdDays, error: dayError } = await supabase
                .from('daily_plans')
                .insert(dailyPlansData)
                .select();

            if (dayError) throw dayError;

            // 4. Create Day 1 Tasks (Immediate)
            const day1PlanId = createdDays.find((d: any) => d.date === startDate.toISOString().split('T')[0])?.id;

            if (day1PlanId && planJson.day_1_tasks) {
                const day1Tasks: any[] = [];
                // Meals
                (planJson.day_1_tasks.meals || []).forEach((meal: any, i: number) => {
                    day1Tasks.push({
                        plan_id: day1PlanId,
                        description: meal.description || `Meal ${i + 1}`,
                        is_completed: false,
                        xp_reward: 20,
                        task_type: 'nutrition',
                        time_slot: meal.time || '12:00',
                        meal_type: meal.meal_type || 'meal',
                        metadata: {
                            calories: meal.calories,
                            protein: meal.protein,
                            carbs: meal.carbs,
                            fat: meal.fat
                        }
                    });
                });

                // Workouts
                (planJson.day_1_tasks.workouts || []).forEach((workout: any) => {
                    day1Tasks.push({
                        plan_id: day1PlanId,
                        description: workout.description || 'Workout',
                        is_completed: false,
                        xp_reward: 30,
                        task_type: 'workout',
                        time_slot: workout.time || '18:00',
                        metadata: {
                            duration: workout.duration,
                            calories_burned: workout.calories_burned
                        }
                    });
                });

                if (day1Tasks.length > 0) {
                    const { error: taskError } = await supabase.from('plan_tasks').insert(day1Tasks);
                    if (taskError) console.error("Error creating Day 1 tasks:", taskError);
                }
            }

            // Refresh local state
            await get().fetchWeeklyPlans(goalId);
            await get().fetchDailyPlan(startDate);

        } catch (e: any) {
            set({ error: e.message });
            console.error("Plan Generation Failed:", e);
            throw e;
        } finally {
            set({ isLoading: false });
        }
    },

    generateDailyTasks: async (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        const { dailyPlan, activeGoal, weeklyPlans } = get();

        let targetPlan = dailyPlan;
        if (dailyPlan?.date !== dateStr) {
            const { data } = await supabase.from('daily_plans').select('*').eq('date', dateStr).single();
            targetPlan = data;
        }

        if (!targetPlan || !activeGoal) return;

        set({ isLoading: true });
        try {
            // Find context (Week focus)
            const relevantWeek = weeklyPlans.find((wp: any) => wp.id === targetPlan?.weekly_plan_id);

            const { data, error } = await supabase.functions.invoke('chat-agent', {
                body: {
                    mode: 'generate_daily_tasks',
                    context: {
                        goalDescription: activeGoal.ai_summary,
                        weekFocus: relevantWeek?.focus_areas || "General Health",
                        calorieTarget: targetPlan.calorie_target,
                        dietPreference: "Balanced",
                        dayNumber: new Date(date).getDay() + 1
                    },
                    userId: (await supabase.auth.getSession()).data.session?.user?.id
                }
            });

            if (error) throw error;
            let tasksJson = data.text ? JSON.parse(data.text) : data;
            if (typeof tasksJson === 'string') tasksJson = JSON.parse(tasksJson);

            const newTasks: any[] = [];

            (tasksJson.meals || []).forEach((meal: any) => {
                newTasks.push({
                    plan_id: targetPlan?.id,
                    description: meal.description,
                    is_completed: false,
                    xp_reward: 20,
                    task_type: 'nutrition',
                    time_slot: meal.time || '12:00',
                    meal_type: meal.meal_type || 'meal',
                    metadata: { calories: meal.calories, protein: meal.protein, carbs: meal.carbs, fat: meal.fat }
                });
            });

            (tasksJson.workouts || []).forEach((workout: any) => {
                newTasks.push({
                    plan_id: targetPlan?.id,
                    description: workout.description,
                    is_completed: false,
                    xp_reward: 30,
                    task_type: 'workout',
                    time_slot: workout.time || '17:00',
                    metadata: { duration: workout.duration, calories_burned: workout.calories_burned }
                });
            });

            if (newTasks.length > 0) {
                await supabase.from('plan_tasks').insert(newTasks);
                await get().fetchDailyPlan(date);
            }

        } catch (e) {
            console.error("Lazy generation failed", e);
        } finally {
            set({ isLoading: false });
        }
    },

    fetchWeeklyPlans: async (goalId) => {
        const { data, error } = await supabase
            .from('weekly_plans')
            .select('*')
            .eq('goal_id', goalId)
            .order('week_number', { ascending: true });

        if (!error && data) {
            set({ weeklyPlans: data });
        }
    },

    fetchDailyPlan: async (date) => {
        set({ isLoading: true, error: null });
        try {
            const dateStr = date.toISOString().split('T')[0];
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;
            const user = session.user;

            // Fetch Daily Plan
            const { data: planData, error: planError } = await supabase
                .from('daily_plans')
                .select('*')
                .eq('user_id', user.id)
                .eq('date', dateStr)
                .single();

            if (planError && planError.code !== 'PGRST116') throw planError;

            if (planData) {
                set({ dailyPlan: planData });

                // Fetch Tasks
                const { data: tasksData, error: tasksError } = await supabase
                    .from('plan_tasks')
                    .select('*')
                    .eq('plan_id', planData.id)
                    .order('time_slot', { ascending: true });

                if (tasksError) throw tasksError;
                set({ tasks: tasksData || [] });
            } else {
                set({ dailyPlan: null, tasks: [] });
            }

        } catch (e: any) {
            set({ error: e.message });
        } finally {
            set({ isLoading: false });
        }
    },

    toggleTaskCompletion: async (taskId, isCompleted) => {
        // Optimistic update
        const { tasks } = get();
        const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, is_completed: isCompleted } : t);
        set({ tasks: updatedTasks });

        try {
            const { error } = await supabase
                .from('plan_tasks')
                .update({ is_completed: isCompleted })
                .eq('id', taskId);

            if (error) throw error;
        } catch (e: any) {
            console.error("Error toggling task:", e);
            // Revert on error
            set({ tasks });
        }
    },

    analyzeMeal: async (imageOrText: string | { uri: string, base64?: string }, context: any) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            // Prepare body based on input type
            const body: any = {
                mode: 'analyze_meal',
                userId: user?.id,
                context: context,
                message: typeof imageOrText === 'string' ? imageOrText : undefined,
            };

            if (typeof imageOrText !== 'string' && imageOrText.base64) {
                // Convert base64 to what the edge function expects if needed, 
                // but based on chat-agent, we send attachments in a specific format
                // actually chat-agent expects `attachments` array or just message.
                // Let's adjust to match chat-agent logic:
                // "if (attachments && Array.isArray(attachments))"

                // If we have a direct base64, we might need to send it as an attachment
                // For now, let's assume we upload first or send base64 directly?
                // The chat-agent logic handles `attachments` with `publicUrl`.
                // It ALSO handles inlineData if we modify it, but currently it fetches from publicUrl.
                // WAIT: usage of `analyze_meal` mode in chat-agent:
                // It uses `systemPrompt = analysisPrompt` and reuses the main logic.
                // The main logic tries to fetch `attachments.publicUrl`.

                // Strategy: We can't easily upload to a public URL just for analysis without persisting it first.
                // BUT: The chat-agent can be modified or we can send text if it's just text.
                // If it's an image, we probably want to upload it first to a temp bucket or the final bucket.
                // Let's assume we upload it first in the UI or here.
                // Actually, for a smooth UX, maybe we send the base64 directly if the edge function supported it.
                // Looking at chat-agent again: 
                // It iterates `attachments` and does `fetch(attachment.publicUrl)`.
                // It DOES NOT support direct base64 in `attachments` currently.

                // Refined Strategy: 
                // 1. If it's an image, the caller should upload it first and pass the URL.
                // 2. OR `analyzeMeal` takes the file, uploads it, then calls AI.
                // Let's go with 2. `analyzeMeal` takes { uri, base64 } or string. 
                // If { uri, base64 }, we upload to 'meal-photos' immediately? 
                // Maybe we shouldn't save it permanently until the user CONFIRMS the log.
                // So we need a way to send image to AI without public URL or use a temp path.

                // Alternative: Update chat-agent to accept base64 in attachments. 
                // But I can't change chat-agent right now easily without context switching.
                // Let's look at `chat-agent` code again... 
                // It *constructs* `inlineData` from the fetched URL. 

                // Let's stick to: User uploads -> get URL -> send to AI.
                // So `analyzeMeal` expects a URL if it's an image?
                // Let's allow `analyzeMeal` to handle the upload if passed an object.
            }

            // Simpler approach for now to match verified `chat-agent` behavior:
            // We'll require the frontend to pass a URL or Text.
            // If it's a local URI, we must upload it.

            let imageUrl = '';
            if (typeof imageOrText !== 'string' && imageOrText.uri) {
                // Upload logic
                const fileExt = imageOrText.uri.split('.').pop();
                const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('meal-photos')
                    .upload(fileName, { uri: imageOrText.uri, type: `image/${fileExt}`, name: fileName } as any, {
                        contentType: `image/${fileExt}`
                    });

                if (uploadError) throw uploadError;

                // Get Public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('meal-photos')
                    .getPublicUrl(fileName);

                imageUrl = publicUrl;

                // Add to attachments
                body.attachments = [{ type: `image/${fileExt}`, publicUrl: imageUrl }];
            }

            const { data, error } = await supabase.functions.invoke('chat-agent', {
                body: body
            });

            if (error) throw error;
            const result = JSON.parse(data.text);
            // Attach the uploaded URL to the result so we can use it later
            if (imageUrl) result.photo_url = imageUrl;

            return result;

        } catch (e: any) {
            console.error('Analyze meal error:', e);
            throw e;
        }
    },

    logMeal: async (taskId: string, logData: any, photoUrl?: string) => {
        set({ isLoading: true });
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const today = new Date().toISOString().split('T')[0];

            // 1. Insert into calorie_log
            const { error: logError } = await supabase
                .from('calorie_log')
                .insert({
                    user_id: user.id,
                    log_date: today,
                    task_id: taskId,
                    log_type: 'food',
                    description: logData.detected_food || logData.description,
                    calories: logData.calories,
                    protein: logData.protein,
                    carbs: logData.carbs,
                    fat: logData.fat,
                    source: photoUrl ? 'photo_ai' : 'text_ai'
                });

            if (logError) throw logError;

            // 2. Update plan_tasks
            const { error: taskError } = await supabase
                .from('plan_tasks')
                .update({
                    is_completed: true,
                    actual_metadata: logData,
                    photo_url: photoUrl || null,
                    verified_at: new Date().toISOString()
                })
                .eq('id', taskId);

            if (taskError) throw taskError;

            // 3. Update daily_plans counters
            // We fetch the current plan to be safe or increment atomically
            // RPC is better for atomic increment, but let's do read-modify-write for simplicity now 
            // as we have the local store data which is *mostly* fresh.
            // A safer bet is to re-calculate sums or use an RPC. 
            // Let's use the local 'activeGoal' or 'dailyPlan' ID to update.

            // We can optimistic update local state first
            // ...

            // Refresh data
            await get().fetchDailyPlan(new Date());

        } catch (e: any) {
            console.error('Log meal error:', e);
            set({ error: e.message });
            throw e;
        } finally {
            set({ isLoading: false });
        }
    },

    deleteGoal: async (goalId: string) => {
        try {
            const { error } = await supabase
                .from('health_goals')
                .delete()
                .eq('id', goalId);

            if (error) throw error;

            // Clear local state
            set({ activeGoal: null, weeklyPlans: [], dailyPlan: null, tasks: [] });
        } catch (e: any) {
            console.error("Error deleting goal:", e);
            throw e;
        }
    }
}));
