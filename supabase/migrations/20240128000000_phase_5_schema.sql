-- Create health_goals table
CREATE TABLE IF NOT EXISTS public.health_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    goal_type TEXT NOT NULL, -- 'weight_loss', 'muscle_gain', 'maintenance', 'custom'
    target_value DECIMAL, -- target weight in kg
    target_unit TEXT DEFAULT 'kg',
    start_value DECIMAL, -- starting weight
    start_date DATE DEFAULT CURRENT_DATE,
    target_date DATE,
    duration_weeks INTEGER,
    daily_calorie_target INTEGER,
    protein_target INTEGER,
    carbs_target INTEGER,
    fat_target INTEGER,
    status TEXT DEFAULT 'active', -- 'active', 'completed', 'modified', 'abandoned'
    is_realistic BOOLEAN DEFAULT true, -- AI validated
    ai_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.health_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own goals"
    ON public.health_goals FOR ALL
    USING (auth.uid() = user_id);

-- Create weekly_plans table
CREATE TABLE IF NOT EXISTS public.weekly_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID REFERENCES public.health_goals(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    week_number INTEGER NOT NULL,
    week_start_date DATE NOT NULL,
    calorie_target INTEGER,
    focus_areas JSONB,
    ai_tips TEXT,
    status TEXT DEFAULT 'upcoming', -- 'upcoming', 'in_progress', 'completed'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.weekly_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own weekly plans"
    ON public.weekly_plans FOR ALL
    USING (auth.uid() = user_id);

-- Alter daily_plans table
ALTER TABLE public.daily_plans
ADD COLUMN IF NOT EXISTS goal_id UUID REFERENCES public.health_goals(id),
ADD COLUMN IF NOT EXISTS weekly_plan_id UUID REFERENCES public.weekly_plans(id),
ADD COLUMN IF NOT EXISTS calorie_target INTEGER,
ADD COLUMN IF NOT EXISTS calorie_consumed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS calorie_burned INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS protein_target INTEGER,
ADD COLUMN IF NOT EXISTS carbs_target INTEGER,
ADD COLUMN IF NOT EXISTS fat_target INTEGER;

-- Alter plan_tasks table
ALTER TABLE public.plan_tasks
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS actual_metadata JSONB, -- AI-verified actual values
ADD COLUMN IF NOT EXISTS meal_type TEXT, -- 'breakfast', 'lunch', 'dinner', 'snack', 'workout'
ADD COLUMN IF NOT EXISTS time_slot TEXT, -- '08:00'
ADD COLUMN IF NOT EXISTS photo_url TEXT, -- Photo of actual meal
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- Create calorie_log table
CREATE TABLE IF NOT EXISTS public.calorie_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    log_date DATE NOT NULL,
    task_id UUID REFERENCES public.plan_tasks(id),
    log_type TEXT NOT NULL, -- 'food', 'exercise'
    description TEXT,
    calories INTEGER,
    protein INTEGER,
    carbs INTEGER,
    fat INTEGER,
    source TEXT DEFAULT 'plan', -- 'plan', 'manual', 'photo_ai', 'text_ai'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.calorie_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own calorie logs"
    ON public.calorie_log FOR ALL
    USING (auth.uid() = user_id);

-- Create meal-photos bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) VALUES ('meal-photos', 'meal-photos', false) ON CONFLICT DO NOTHING;

-- Policies for meal-photos bucket
CREATE POLICY "Users can upload meal photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'meal-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view their own meal photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'meal-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
