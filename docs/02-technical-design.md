Here is the **Technical Design Document (TDD)** for your AI Personal Health Coach application. This document is written to serve as the "Master Blueprint" for AI Agents (like Cursor or Windsurf) to generate the code efficiently.

---

# **Technical Design Document (TDD)**

**Project Name:** AI Personal Health Coach & Gamification System
**Version:** 2.0
**Date:** January 2026

---

## **Implementation Status**

| Component | Status | Notes |
|-----------|--------|-------|
| **Frontend (5 Tabs)** | 🔶 Partial | 4 tabs done, Plans/Insights pending |
| **Auth & Profile** | ✅ Complete | Supabase Auth + Profiles table |
| **Gamification** | ✅ Complete | XP, Levels, Streak store |
| **AI Chat (Basic)** | ✅ Complete | Chat UI + Edge Function |
| **Chat Sessions** | ⏳ Pending | Multi-session support |
| **Chat Attachments** | ⏳ Pending | File upload support |
| **RAG Memory** | ⏳ Pending | pgvector + user_memory table |
| **Daily Plans** | 🔶 Partial | Schema exists, UI pending |
| **Plan Tasks** | 🔶 Partial | Schema exists, interactive edit pending |
| **Sensors (Gait/HRV)** | ⏳ Pending | Not started |
| **Advanced Gamification** | ⏳ Pending | Streaks, Quests, Badges |

---

## **1. System Architecture Overview**

The system follows a **Hybrid Client-Server Architecture** enhanced by the **Model Context Protocol (MCP)**.

* **Client (Frontend):** React Native (Expo) for UI, sensor data collection, and local interactions.
* **Server (Backend):** Node.js (Express/FastAPI) acting as the "Orchestrator." It manages user authentication, aggregates data, and proxies requests to the AI.
* **Intelligence Layer:** Google Gemini API connected via **MCP** to secure tools (Database, Calculator, Search).

---

## **2. Frontend Design (Mobile Application)**

### **2.1. Tech Stack**

* **Framework:** React Native (Expo SDK 50+).
* **Language:** TypeScript.
* **UI Library:** **NativeWind v4** (Tailwind CSS for React Native).
* **State Management:** **Zustand** (Global Store) + **TanStack Query** (Server State/Caching).
* **Media:** **expo-image-picker** (Camera & Gallery access).
* **Navigation:** Expo Router (File-based routing).
* **Animations:** React Native Reanimated + Lottie.

### **2.2. Navigation Structure (5 Tabs)**

```
app/
├── (tabs)/
│   ├── _layout.tsx       # Tab navigator with 5 tabs
│   ├── index.tsx         # 🏠 Home (Dashboard)
│   ├── plans.tsx         # 📋 Plans (Daily/Weekly Tasks)
│   ├── chat.tsx          # 💬 Chat (AI Coach)
│   ├── insights.tsx      # 📊 Insights (Gait/HRV/Sleep)
│   └── profile.tsx       # 👤 Profile (Settings/Badges)
├── (auth)/
│   ├── login.tsx
│   ├── signup.tsx
│   └── onboarding/
│       └── [step].tsx    # 3-step onboarding wizard
├── plan/
│   └── [id].tsx          # Plan detail + edit
├── camera/
│   └── verify.tsx        # Visual verification camera
└── chat-history/
    └── index.tsx         # Session list modal/screen
```

### **2.3. Core Modules**

1. **Dashboard Module (`/app/(tabs)/index.tsx`)**
   * Today's plan summary (compact cards).
   * XP Bar + Level Badge (animated).
   * Calorie Progress Ring (Planned vs. Actual).
   * Quick action buttons (Log Meal, Start Workout).

2. **Plans Module (`/app/(tabs)/plans.tsx`)**
   * Day-wise task list with checkboxes.
   * Camera icon for visual verification.
   * Long-press to "Edit with AI".
   * Progress: "5 of 8 tasks complete".

3. **Chat Module (`/app/(tabs)/chat.tsx`)**
   * Message bubbles with markdown support.
   * Attach button (Direct Camera or Gallery picker).
   * History drawer (swipe from left).
   * "New Chat" button in header.

4. **Insights Module (`/app/(tabs)/insights.tsx`)**
   * Gait score trend chart.
   * HRV variability graph.
   * Sleep quality score.
   * Weekly comparison cards.

5. **Profile Module (`/app/(tabs)/profile.tsx`)**
   * User avatar (upload via Camera/Gallery) + level.
   * Badge showcase (collectible cards).
   * Settings (Notifications, Dark Mode).
   * Streak Freeze shop.

### **2.4. Offline Strategy**

* Uses **WatermelonDB** (local SQLite wrapper) to cache today's plan.
* Users can check off items offline; sync happens when connection is restored.
* Pending uploads queued and retried.

## **3. Backend Design (The Orchestrator)**

### **3.1. Tech Stack**

* **Runtime:** Deno via **Supabase Edge Functions**.
* **Database:** **PostgreSQL** (Supabase managed, with Row Level Security).
* **Realtime:** **Supabase Realtime** (PostgreSQL Changes via WebSocket).
* **Authentication:** **Supabase Auth** (Google, Apple, Email/Password, Magic Link).
* **AI SDK:** Google Generative AI SDK + Model Context Protocol (MCP) SDK.

### **3.2. MCP Architecture (The "Brain's Hands")**

The backend hosts the **MCP Host**. When Gemini decides to take an action, it calls these defined tools:

| MCP Server | Tool Name | Description |
| --- | --- | --- |
| **Persistence** | `db_log_activity` | Inserts activity into Postgres. |
| **Persistence** | `db_get_stats` | Fetches XP, Level, and Streak for context. |
| **Logic** | `calc_gait_score` | Inputs raw accelerometer array  Returns asymmetry score (0-100). |
| **Logic** | `gamify_action` | Inputs ActionID  Returns XP gained & checks for Level Up. |
| **External** | `search_nutrition` | Inputs food name  Returns macros (Protein/Carb/Fat). |

### **3.3. API Endpoints (REST)**

* `POST /auth/login`: Exchange credentials for JWT.
* `GET /dashboard/sync`: Fetch Plan + Game Stats + Badges in one payload.
* `POST /chat/message`: Streams Gemini response.
* `POST /log/signals`: Uploads compressed sensor data chunks for analysis.

---

## **4. Data Design (Schema)**

**Database:** PostgreSQL (v15+, Supabase managed)
**Extensions:** `pgvector` (for semantic search), `pg_cron` (scheduled jobs).

### **4.1. Entity Relationship Diagram (ERD)**

### **4.2. Database Tables**

**1. `profiles`** (extends Supabase auth.users)

* `id` (UUID, PK, references auth.users)
* `email` (text)
* `full_name` (text)
* `avatar_url` (text)
* `profile_data` (JSONB: height, weight, injuries, preferences)
* `created_at` (timestamptz)
* `updated_at` (timestamptz)

**2. `gamification_state`**

* `id` (UUID, PK)
* `user_id` (UUID, FK → profiles.id, UNIQUE)
* `total_xp` (integer, default 0)
* `current_level` (integer, default 1)
* `current_streak` (integer, default 0)
* `last_log_date` (date)
* `frozen_streaks_available` (integer, default 3)

**3. `daily_plans`**

* `id` (UUID, PK)
* `user_id` (UUID, FK → profiles.id)
* `plan_date` (date)
* `status` (text: 'pending' | 'partial' | 'completed')
* `plan_data` (JSONB) -- Deprecated in favor of plan_tasks? Or keeping for summary.
* `created_at` (timestamptz)

**3b. `plan_tasks`**

* `id` (UUID, PK)
* `plan_id` (UUID, FK → daily_plans.id)
* `description` (text)
* `is_completed` (boolean)
* `xp_reward` (integer)
* `task_type` (text: 'workout' | 'nutrition' | 'mindfulness')
* `metadata` (JSONB: { calories: 300, protein: 10, macros: {...} })
* `completed_image_url` (text)
* `actual_metadata` (JSONB: { calories: 350, protein: 12 } -- AI verification)
* `created_at` (timestamptz)

**4. `biomarker_logs`**

* `id` (UUID, PK)
* `user_id` (UUID, FK → profiles.id)
* `logged_at` (timestamptz)
* `signal_type` (text: 'gait' | 'hrv' | 'sleep')
* `raw_value` (JSONB)
* `log_id` (UUID, FK → biomarker_logs.id)
* `insight_text` (text)
* `created_at` (timestamptz)

**5. `chat_sessions`**

* `id` (UUID, PK)
* `user_id` (UUID, FK → profiles.id)
* `title` (text, e.g., "Workout Advice")
* `created_at` (timestamptz)
* `updated_at` (timestamptz)

**6. `chat_messages`**

* `id` (UUID, PK)
* `session_id` (UUID, FK → chat_sessions.id)
* `user_id` (UUID, FK → profiles.id)
* `role` (text: 'user' | 'model')
* `text` (text)
* `created_at` (timestamptz)

**7. `chat_attachments`**

* `id` (UUID, PK)
* `message_id` (UUID, FK → chat_messages.id)
* `file_path` (text, Storage path)
* `file_type` (text, e.g., 'image/jpeg', 'application/pdf')
* `created_at` (timestamptz)

**8. `user_memory` (RAG)**

* `id` (UUID, PK)
* `user_id` (UUID, FK → profiles.id)
* `fact_text` (text, e.g., "User has nut allergy")
* `embedding` (vector(768)) -- Gemini Embedding dimensions
* `created_at` (timestamptz)

**9. `health_goals`** (NEW)

* `id` (UUID, PK)
* `user_id` (UUID, FK → profiles.id)
* `goal_type` (text: 'weight_loss' | 'muscle_gain' | 'maintenance')
* `target_value` (decimal, target weight in kg)
* `start_value` (decimal, starting weight)
* `start_date` (date)
* `target_date` (date)
* `duration_weeks` (integer)
* `daily_calorie_target` (integer)
* `protein_target` (integer)
* `carbs_target` (integer)
* `fat_target` (integer)
* `status` (text: 'active' | 'completed' | 'modified')
* `is_realistic` (boolean) -- AI validated
* `ai_summary` (text)
* `created_at`, `updated_at` (timestamptz)

**10. `weekly_plans`** (NEW)

* `id` (UUID, PK)
* `goal_id` (UUID, FK → health_goals.id)
* `user_id` (UUID, FK → profiles.id)
* `week_number` (integer)
* `week_start_date` (date)
* `calorie_target` (integer)
* `focus_areas` (JSONB)
* `ai_tips` (text)
* `status` (text: 'upcoming' | 'in_progress' | 'completed')
* `created_at` (timestamptz)

**11. `calorie_log`** (NEW)

* `id` (UUID, PK)
* `user_id` (UUID, FK → profiles.id)
* `log_date` (date)
* `task_id` (UUID, FK → plan_tasks.id, nullable)
* `log_type` (text: 'food' | 'exercise')
* `description` (text)
* `calories` (integer)
* `protein`, `carbs`, `fat` (integer)
* `source` (text: 'plan' | 'manual' | 'photo_ai' | 'text_ai')
* `created_at` (timestamptz)

### **4.3. Storage Buckets**
* `chat-attachments`: Private bucket for user uploads (Images, PDFs). Policies restricted to owner.
* `avatars`: Public bucket for profile pictures. Per-user folder structure.
* `meal-photos`: Private bucket for meal verification photos. (NEW)

---

## **5. AI & Prompt Strategy**

### **5.1. System Prompt Construction**

We use a **Dynamic Context Injection** strategy. Before sending a user message to Gemini, the backend compiles:

1. **Static Persona:** "You are a world-class health coach..."
2. **User Bio:** "User is 30M, recovering from ACL injury."
3. **Game State:** "User is Level 5. If they log this, they reach Level 6."
4. **Recent Signals:** "Gait analysis shows 4% asymmetry today."

### **5.2. Safety Guardrails**

* **Pre-Prompting:** "If the user asks for medical diagnosis, refuse and refer to a doctor."
* **Output Validation:** Use **Zod** schema validation to ensure Gemini's JSON (for plans) matches the app's expected format.

---

## **6. Gamification Logic (The "Loop")**

This logic resides in the `gamify_action` MCP Tool to ensure consistency.

**Algorithm: `process_activity(user_id, activity_type)**`

1. **Base XP:** Lookup table (e.g., Workout = 50 XP).
2. **Multipliers:**
* Morning Bonus (6 AM - 8 AM): 1.2x
* Streak Bonus (Streak > 7): 1.1x


3. **Update State:** `total_xp += earned_xp`.
4. **Level Check:** `Level = floor(sqrt(total_xp / 100))`.
5. **Return:** `{ gained: 55, new_level: 6, level_up_event: true }`.

---

## **7. Infrastructure & Deployment**

### **7.1. Environment (Supabase)**

* **Backend Hosting:** **Supabase Edge Functions** (Deno, serverless, globally distributed).
* **Database:** **Supabase PostgreSQL** - Managed Postgres with automatic backups.
* **Authentication:** **Supabase Auth** - Multi-provider (Google, Apple, Email, Magic Link).
* **Storage:** **Supabase Storage** (for user profile pics / food photos).
* **Realtime:** **Supabase Realtime** - WebSocket-based database change subscriptions.
* **AI Services:** Google Gemini API (called from Edge Functions).

### **7.2. CI/CD Pipeline**

* **GitHub Actions:**
  * On Push: Run Linting & Type Checking.
  * On Merge to Main: Deploy Edge Functions via `supabase functions deploy`.
  * On Tag Release: Build `.apk` / `.ipa` via **EAS Build** (Expo Application Services).

* **Supabase CLI:** Local development with `supabase start` (Docker-based local stack).



---

## **8. Security & Privacy**

* **Encryption at Rest:** DB volumes encrypted.
* **Encryption in Transit:** TLS 1.3.
* **Data Minimization:** AI prompts send `user_id` (UUID), not email/name.
* **Sensitive Signals:** Raw accelerometer data is deleted after processing; only the "Score" is kept.

---

## **9. Development Phases (Modular & Incremental)**

The app will be built in **8 incremental phases**, starting with the foundation and progressively adding complexity. Each phase is designed to produce a working, testable version of the app.

---

### **Phase 1: Foundation** (Days 1-3)
**Goal:** Project scaffold with navigation and theming.

| Task | Deliverable |
|------|-------------|
| Initialize Expo project | `npx create-expo-app` with TypeScript |
| Setup NativeWind v4 | Tailwind config + `nativewind` preset |
| Configure Expo Router | File-based routing structure |
| Create base layout | Tab navigation (Home, Chat, Profile) |
| Design tokens | Colors, typography, spacing in `tailwind.config.js` |

**Exit Criteria:** App runs with 3 tabs, theming works, no backend yet.

---

### **Phase 2: Authentication & User Profile** (Days 4-7)
**Goal:** Users can sign up, log in, and have a profile.

| Task | Deliverable |
|------|-------------|
| Setup Supabase project | Create project, get API keys |
| Database schema | `profiles` table with RLS policies |
| Supabase Auth integration | Google + Email/Password sign-in |
| Onboarding flow UI | 3-step wizard (basic info, goals, equipment) |
| Profile screen | View/edit profile data |

**Exit Criteria:** User can sign up, complete onboarding, view profile.

---

### **Phase 3: Basic Gamification - XP & Levels** (Days 8-11)
**Goal:** Core game loop with XP earning and leveling.

| Task | Deliverable |
|------|-------------|
| Database schema | `gamification_state` table |
| XP calculation logic | Edge Function: `gamify_action` |
| Level-up algorithm | `Level = floor(sqrt(total_xp / 100))` |
| Dashboard UI | XP bar, current level, avatar |
| Haptic feedback | `expo-haptics` on XP gain |

**Exit Criteria:** User can earn XP (manual log), see level progress.

---

### **Phase 4: AI Chat Integration** (Days 12-16)
**Goal:** Chat with Gemini AI that knows user context.

| Task | Deliverable |
|------|-------------|
| Gemini API setup | Edge Function with Google AI SDK |
| MCP Host scaffold | Basic tool definitions |
| Chat UI | Bubble interface with streaming |
| Context injection | System prompt with user profile + game state |
| Safety guardrails | Medical disclaimer, input validation |

**Exit Criteria:** User can chat with AI, receives personalized responses.

---

### **Phase 5: Daily Plans & Activity Logging** (Days 17-21)
**Goal:** AI generates plans, user logs activities.

| Task | Deliverable |
|------|-------------|
| Database schema | `daily_plans` table |
| Plan generation | Gemini creates workout/nutrition plan |
| Plan UI | Today's plan with checkboxes |
| Activity logging | Manual log with XP award |
| Offline caching | WatermelonDB for local plan storage |

**Exit Criteria:** User receives daily plan, can log activities offline.

---

### **Phase 6: Sensor Features (Gait & HRV)** (Days 22-28)
**Goal:** Collect and analyze phone sensor data.

| Task | Deliverable |
|------|-------------|
| Accelerometer hook | `expo-sensors` at 60Hz, 5s buffer |
| Gait analysis algorithm | FFT-based asymmetry score (0-100) |
| Database schema | `biomarker_logs` table |
| MCP tool | `calc_gait_score` Edge Function |
| Camera-based HRV | rPPG via `react-native-vision-camera` |
| Signal insights UI | Show gait/HRV trends over time |

**Exit Criteria:** User can run walk test, see gait score, track HRV.

---

### **Phase 7: Advanced Gamification** (Days 29-33)
**Goal:** Streaks, quests, badges, and social features.

| Task | Deliverable |
|------|-------------|
| Streak mechanics | Daily streak tracking, freeze items |
| Dynamic quests | AI-generated daily challenges |
| Badge system | Unlock achievements (UI + database) |
| Leaderboard | Optional: Friends comparison |
| Push notifications | Reminders via `expo-notifications` |

**Exit Criteria:** Full gamification loop with streaks, quests, badges.

---

### **Phase 8: Polish & Launch** (Days 34-40)
**Goal:** Production-ready app.

| Task | Deliverable |
|------|-------------|
| Error handling | Global error boundaries, retry logic |
| Performance optimization | Memoization, lazy loading |
| App icons & splash | Custom branding assets |
| EAS Build setup | CI/CD for iOS + Android |
| TestFlight/Play Console | Beta distribution |
| Analytics | Basic event tracking |

**Exit Criteria:** App submitted to stores for review.

---

### **Phase Summary**

| Phase | Focus | Complexity | Dependencies |
|-------|-------|------------|--------------|
| 1 | Foundation | ⭐ | None |
| 2 | Auth + Profile | ⭐⭐ | Phase 1 |
| 3 | Basic Gamification | ⭐⭐ | Phase 2 |
| 4 | AI Chat | ⭐⭐⭐ | Phase 2 |
| 5 | Plans + Logging | ⭐⭐⭐ | Phase 3, 4 |
| 6 | Sensors (Gait/HRV) | ⭐⭐⭐⭐ | Phase 5 |
| 7 | Advanced Gamification | ⭐⭐⭐ | Phase 5, 6 |
| 8 | Polish + Launch | ⭐⭐ | All phases |