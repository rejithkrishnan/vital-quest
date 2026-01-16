---
description: Generate a Supabase SQL migration with table creation and RLS policies
---

# Database Migration Workflow

## Steps

1. **Ask for table details:**
   - Table name (e.g., "badges")
   - Columns with types
   - Foreign key relationships
   - RLS requirements

2. **Create migration file** in `supabase/migrations/<timestamp>_<table_name>.sql`

3. **Use this template:**

```sql
-- Migration: Create <table_name> table
-- Description: <brief description>

-- Create the table
CREATE TABLE <table_name> (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Add columns here
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_<table_name>_updated_at
  BEFORE UPDATE ON <table_name>
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own data"
  ON <table_name> FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data"
  ON <table_name> FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data"
  ON <table_name> FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own data"
  ON <table_name> FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes (add as needed)
CREATE INDEX idx_<table_name>_user_id ON <table_name>(user_id);
```

4. **Run migration:**
   - `supabase db push` (local)
   - Or apply via Supabase dashboard

// turbo
5. **Generate TypeScript types:**
   - `supabase gen types typescript --local > types/database.ts`
