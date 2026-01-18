# Supabase Patterns Guide

## Security 🔐
- **NEVER** commit API keys or service tokens (Project URL/Anon Key) to Git; use `.env`.
- Always use `process.env.EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- Ensure `.env` is in `.gitignore`.
- Use Row Level Security (RLS) on **ALL** tables without exception.

## Database Naming Conventions
* Table names: snake_case, plural (e.g., `daily_plans`)
* Column names: snake_case (e.g., `created_at`)
* Foreign keys: `<table>_id` (e.g., `user_id`)
* Timestamps: Use `timestamptz` type with `DEFAULT NOW()`

## Row Level Security (RLS)
* ALWAYS enable RLS on every table
* Create policies for SELECT, INSERT, UPDATE, DELETE as needed
* Use `auth.uid()` to reference the current user

### Standard User-Owned Table Pattern
```sql
-- Enable RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own data"
  ON table_name FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own data
CREATE POLICY "Users can insert own data"
  ON table_name FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own data
CREATE POLICY "Users can update own data"
  ON table_name FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can only delete their own data
CREATE POLICY "Users can delete own data"
  ON table_name FOR DELETE
  USING (auth.uid() = user_id);
```

## Edge Functions
* Use Deno/TypeScript
* Always validate input with Zod
* Return consistent JSON responses
* Handle errors gracefully

### Edge Function Template
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Your logic here

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
```

## Client-Side Patterns
* Use `@supabase/supabase-js` client
* Store client in `services/supabase.ts`
* Use environment variables for URL and anon key
