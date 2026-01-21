-- Create weight_logs table
CREATE TABLE IF NOT EXISTS public.weight_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    weight DECIMAL NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date) -- Ensure one entry per day per user
);

-- Enable RLS
ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Users can manage own weight logs"
    ON public.weight_logs FOR ALL
    USING (auth.uid() = user_id);

-- Create index for faster queries by date
CREATE INDEX IF NOT EXISTS idx_weight_logs_user_date ON public.weight_logs(user_id, date);
