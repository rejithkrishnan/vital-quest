-- Add gamification columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_active_date TIMESTAMPTZ;

-- Add checking for negative values
ALTER TABLE profiles
ADD CONSTRAINT xp_non_negative CHECK (xp >= 0),
ADD CONSTRAINT level_positive CHECK (level >= 1),
ADD CONSTRAINT streak_non_negative CHECK (current_streak >= 0);
