# Active Context

## Current Focus
**Phase 3: Basic Gamification**
- We have just completed Phase 2 (Auth/Profile).
- The immediate goal is to implement XP, Levels, and Streaks.

## Recent Changes
- **Auth**: Implemented Supabase Auth with Google/Email.
- **Onboarding**: Created a 3-step wizard (Basic Info, Goals, Equipment).
- **Profile**: Created a Profile tab fetching real data from `profiles` table.
- **Security**: Moved credentials to `.env` and updated `.gitignore`.

## Active Decisions
- **Gamification Schema**: We decided to add `xp`, `level`, `current_streak` directly to the `profiles` table (cols) rather than a separate `gamification_state` table, to simplify initial queries. *Correction*: The Implementation Plan v1 called for a separate table, but for "Basic" gamification, columns might be easier. *Wait, let's stick to the TDD*. TDD says `gamification_state` table. We should follow the TDD unless we consciously pivot.
- **State Management**: Using `stores/authStore.ts` for session. Will need `gamificationStore.ts`.

## Next Steps
1.  Run Migration: `20240118000000_add_gamification.sql`.
2.  create `stores/gamificationStore.ts`.
3.  Update `profile.tsx` to show progress bar.
