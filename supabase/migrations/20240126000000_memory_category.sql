-- Add category column to user_memory
ALTER TABLE user_memory 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';

-- Add check constraint for category values
ALTER TABLE user_memory 
ADD CONSTRAINT user_memory_category_check 
CHECK (category IN ('personal', 'diet', 'medical', 'fitness', 'general'));
