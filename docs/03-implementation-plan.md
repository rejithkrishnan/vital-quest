# vitalQuest Implementation Plan

**Project:** AI Personal Health Coach with Gamification  
**Version:** 1.0  
**Last Updated:** January 2026

---

## Quick Reference

| Document | Purpose |
|----------|---------|
| [01-business-requirements.md](./01-business-requirements.md) | Business requirements, user personas, functional specs |
| [02-technical-design.md](./02-technical-design.md) | Architecture, database schema, API design |
| **This Document** | Step-by-step implementation guide |

---

## **Implementation Status**

| Phase | Status | Completion |
|-------|--------|------------|
| **Phase 1: Foundation** | ✅ Complete | 100% |
| **Phase 2: Auth & Profile** | ✅ Complete | 100% |
| **Phase 3: Basic Gamification** | ✅ Complete | 100% |
| **Phase 4: AI Chat** | ✅ Complete | 100% |
| **Phase 4b: Enhanced AI** | ⏳ Pending | 0% |
| **Phase 5: Plans & Logging** | 🔶 Partial | 30% (Schema only) |
| **Phase 6: Sensors** | ⏳ Pending | 0% |
| **Phase 7: Advanced Gamification** | ⏳ Pending | 0% |
| **Phase 8: Polish & Launch** | ⏳ Pending | 0% |

---

## Technology Stack Summary

| Layer | Technology |
|-------|------------|
| **Mobile Framework** | React Native (Expo SDK 50+) |
| **Language** | TypeScript |
| **Styling** | NativeWind v4 (Tailwind CSS) |
| **State Management** | Zustand + TanStack Query |
| **Navigation** | Expo Router |
| **Backend** | Supabase Edge Functions (Deno) |
| **Database** | PostgreSQL (Supabase) |
| **Authentication** | Supabase Auth |
| **Storage** | Supabase Storage |
| **AI** | Google Gemini via MCP |
| **Animations** | React Native Reanimated |

---

## Phase Overview

```
Phase 1 ──► Phase 2 ──► Phase 3 ──► Phase 4
Foundation   Auth       Gamification  AI Chat
   │           │            │            │
   └───────────┴────────────┴────────────┘
                      │
              Phase 5 ▼
           Plans & Logging
                 │
              Phase 6 ▼
              Sensors
                 │
              Phase 7 ▼
         Advanced Gamification
                 │
              Phase 8 ▼
           Polish & Launch
```

---

## Phase 1: Foundation (Days 1-3)

### Goal
Project scaffold with navigation and theming - **no backend yet**.

### Tasks

| # | Task | Command / Action | Est. Time |
|---|------|------------------|-----------|
| 1.1 | Create Expo project | `npx create-expo-app@latest vitalquest --template tabs` | 5 min |
| 1.2 | Install libraries | `npm install nativewind tailwindcss react-native-reanimated lottie-react-native` | 10 min |
| 1.3 | Configure Tailwind | Create `tailwind.config.js` with Google Fit colors | 15 min |
| 1.4 | Config Metro/Babel | Add NativeWind + Reanimated plugins | 15 min |
| 1.5 | Create tab layout | 5 tabs: Home, Plans, Chat, Insights, Profile | 45 min |
| 1.6 | Design tokens | Define Google Fit-style colors: Primary Blue (`#4285F4`), Health Green (`#34A853`), Energy Red (`#EA4335`) | 20 min |
| 1.7 | Create base components | Button, Card, Input with NativeWind styling | 1 hr |
| 1.8 | Test on device | Run on iOS Simulator / Android Emulator | 15 min |

### Exit Criteria
- [x] App runs with 5 functional tabs (Home, Plans, Chat, Insights, Profile)
- [x] NativeWind styling works correctly
- [x] Custom color theme applied

### Key Files Created
```
vitalquest/
├── app/
│   ├── (tabs)/
│   │   ├── _layout.tsx      # Tab navigator (5 tabs)
│   │   ├── index.tsx        # 🏠 Home (Dashboard)
│   │   ├── plans.tsx        # 📋 Plans (Daily Tasks)
│   │   ├── chat.tsx         # 💬 Chat (AI Coach)
│   │   ├── insights.tsx     # 📊 Insights (Bio-feedback)
│   │   └── profile.tsx      # 👤 Profile (Settings)
│   └── _layout.tsx          # Root layout
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   └── ProgressRing.tsx
│   └── game/
│       ├── XpBar.tsx
│       └── LevelBadge.tsx
├── tailwind.config.js
├── global.css
└── metro.config.js
```

---

## Phase 2: Authentication & User Profile (Days 4-7)

### Goal
Users can sign up, log in, and complete onboarding.

### Tasks

| # | Task | Command / Action | Est. Time |
|---|------|------------------|-----------|
| 2.1 | Create Supabase project | supabase.com → New Project | 10 min |
| 2.2 | Auth Screens | Create `(auth)/login.tsx` and `signup.tsx` with Google Fit styling | 1 hr |
| 2.3 | Onboarding | Create `(auth)/onboarding` slide deck | 1 hr |
| 2.4 | Profile Table | Create SQL table `profiles` with RLS | 20 min |
| 2.5 | Connect Auth | Wire up helper functions in `hooks/useAuth.ts` | 30 min |
| 2.6 | Build login screen | Email/password + Google button | 1 hr |
| 2.7 | Build onboarding wizard | 3 steps: Basic Info, Goals, Equipment | 2 hr |
| 2.8 | Create profile screen | View/edit user data, upload avatar from **Camera/Gallery** | 1.5 hr |
| 2.9 | Protected routes | Redirect unauthenticated users | 30 min |

### Database Schema

```sql
-- profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  profile_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
```

### Exit Criteria
- [x] User can sign up with email/password
- [x] User can sign in with Google
- [x] Onboarding flow saves to database
- [x] Profile screen shows user data

---

## Phase 3: Basic Gamification - XP & Levels (Days 8-11)

### Goal
Core game loop with XP earning and level progression.

### Tasks

| # | Task | Command / Action | Est. Time |
|---|------|------------------|-----------|
| 3.1 | Create `gamification_state` table | SQL migration | 20 min |
| 3.2 | Create XP constants | Base XP values for actions | 15 min |
| 3.3 | Build `gamify_action` Edge Function | XP calculation + level check | 1.5 hr |
| 3.4 | Create gamification Zustand store | Local state for XP/level | 45 min |
| 3.5 | Build XP progress bar | Animated SVG with Reanimated | 1 hr |
| 3.6 | Build level badge component | Current level display | 30 min |
| 3.7 | Add haptic feedback | `expo-haptics` on XP gain | 20 min |
| 3.8 | Manual activity log | Temporary UI to test XP system | 1 hr |

### Level Algorithm

```typescript
// Level formula: Level = floor(sqrt(total_xp / 100))
const calculateLevel = (totalXp: number): number => {
  return Math.floor(Math.sqrt(totalXp / 100));
};

// XP needed for next level
const xpForLevel = (level: number): number => {
  return level * level * 100;
};
```

### XP Values

| Action | Base XP | Morning Bonus (6-8 AM) | Streak Bonus (7+ days) |
|--------|---------|------------------------|------------------------|
| Log Meal | 10 | 1.2x | 1.1x |
| Complete Workout | 50 | 1.2x | 1.1x |
| Perfect Gait Score | 20 | - | 1.1x |
| Complete Daily Plan | 100 | - | 1.1x |

### Exit Criteria
- [ ] User can earn XP via manual log
- [ ] Level updates automatically
- [ ] XP bar animates on gain
- [ ] Haptic feedback works

---

## Phase 4: AI Chat Integration (Days 12-16)

### Goal
Chat with Gemini AI that knows user context.

### Tasks

| # | Task | Command / Action | Est. Time |
|---|------|------------------|-----------|
| 4.1 | Get Gemini API key | Google AI Studio | 10 min |
| 4.2 | Create chat Edge Function | Gemini SDK setup | 1 hr |
| 4.3 | MCP tool definitions | `db_get_stats`, `gamify_action` | 1.5 hr |
| 4.4 | Build chat bubble UI | User/AI message components | 1.5 hr |
| 4.5 | Implement streaming | SSE for real-time responses | 1 hr |
| 4.6 | Context injection | System prompt with user data | 45 min |
| 4.7 | Safety guardrails | Medical disclaimer, input validation | 30 min |
| 4.8 | Chat history storage | Store in Supabase | 1 hr |

### System Prompt Template

```typescript
const buildSystemPrompt = (user: User, gameState: GameState) => `
You are vitalQuest, a friendly AI health coach. You help users achieve their fitness goals through personalized advice and encouragement.

USER CONTEXT:
- Name: ${user.fullName}
- Level: ${gameState.currentLevel} (${gameState.totalXp} XP)
- Current Streak: ${gameState.currentStreak} days
- Goals: ${user.profileData.goals}
- Limitations: ${user.profileData.injuries || 'None'}

RULES:
1. Be encouraging but realistic
2. Never diagnose medical conditions - refer to doctors
3. Celebrate achievements and progress
4. Suggest actionable, specific advice
5. Keep responses concise (under 150 words)
`;
```

### Exit Criteria
- [x] User can send messages to AI
- [x] AI responses stream in real-time
- [x] AI knows user's level and profile
- [x] Medical queries show disclaimer
- [x] Chat history persists in database

---

## Phase 4b: Enhanced AI Features (Days 17-20)

### Goal
Multi-session chat, file uploads, RAG memory, and visual verification.

### Tasks

| # | Task | Command / Action | Est. Time |
|---|------|------------------|-----------|
| 4b.1 | Create `chat_sessions` table | SQL migration | 20 min |
| 4b.2 | Build ChatHistoryModal | Session list + New Chat button | 1.5 hr |
| 4b.3 | Integrate session switching | Update `chat.tsx` state logic | 1 hr |
| 4b.4 | Create `chat_attachments` table | SQL migration + Storage bucket | 30 min |
| 4b.5 | Add file picker UI | `expo-image-picker` with **Camera** and **Gallery** options | 1.5 hr |
| 4b.6 | Update Edge Function for uploads | Base64 encode + Gemini Vision | 2 hr |
| 4b.7 | Create `user_memory` table (pgvector) | SQL migration + embedding index | 30 min |
| 4b.8 | Implement extraction chain | Gemini extracts facts from chat | 1.5 hr |
| 4b.9 | Implement retrieval pipeline | Vector search on user query | 1.5 hr |
| 4b.10 | Add verification columns to `plan_tasks` | `completed_image_url`, `actual_metadata` | 20 min |
| 4b.11 | Build visual verification flow | Camera -> AI analysis -> DB update | 2 hr |

### Exit Criteria
- [ ] User can create and switch chat sessions
- [ ] User can attach images/PDFs to chat
- [ ] AI remembers facts mentioned previously (RAG)
- [ ] User can verify meal with photo

---

## Phase 5: Daily Plans & Activity Logging (Days 21-26)

### Goal
AI generates personalized daily plans, users log and edit activities with AI assistance.

### Tasks

| # | Task | Command / Action | Est. Time |
|---|------|------------------|-----------|
| 5.1 | Create `plan_tasks` table (if needed) | SQL migration with `metadata` column | 20 min |
| 5.2 | Plan generation prompt | Gemini creates workout/nutrition plan in JSON | 1.5 hr |
| 5.3 | Build Plans tab UI | Day-wise task list with checkboxes | 2 hr |
| 5.4 | Activity completion flow | Check off → earn XP | 1 hr |
| 5.5 | Build "Edit with AI" modal | Long-press → prompt input | 1.5 hr |
| 5.6 | Implement AI recalculation | Gemini adjusts plan to maintain targets | 2 hr |
| 5.7 | Calorie progress ring | Dashboard widget: Planned vs. Actual | 1 hr |
| 5.8 | Install WatermelonDB | `npm install @nozbe/watermelondb` | 30 min |
| 5.9 | Offline schema | Local models for plans | 1 hr |
| 5.10 | Sync logic | Sync on reconnection | 1.5 hr |

### Exit Criteria
- [ ] AI generates daily plan
- [ ] User can complete activities
- [ ] User can edit items with AI ("Change Idli to Dosa")
- [ ] Calorie ring shows Planned vs. Actual
- [ ] XP awarded on completion
- [ ] Works offline

---

## Phase 6: Sensor Features (Days 22-28)

### Goal
Collect and analyze phone sensor data for health insights.

### Tasks

| # | Task | Command / Action | Est. Time |
|---|------|------------------|-----------|
| 6.1 | Install expo-sensors | `npx expo install expo-sensors` | 10 min |
| 6.2 | Create `useAccelerometer` hook | 60Hz sampling, 5s buffer | 1 hr |
| 6.3 | Gait analysis algorithm | FFT-based asymmetry detection | 3 hr |
| 6.4 | Create `biomarker_logs` table | SQL migration | 20 min |
| 6.5 | Create `calc_gait_score` Edge Function | Process raw data | 2 hr |
| 6.6 | Walk test UI | Guided 1-minute walk | 1.5 hr |
| 6.7 | Install vision-camera | `npm install react-native-vision-camera` | 30 min |
| 6.8 | rPPG HRV measurement | Camera-based heart rate | 4 hr |
| 6.9 | Insights dashboard | Gait/HRV trends over time | 2 hr |

### Exit Criteria
- [ ] Walk test produces gait score
- [ ] Camera measures heart rate
- [ ] Insights show trends
- [ ] Battery impact < 5%

---

## Phase 7: Advanced Gamification (Days 29-33)

### Goal
Streaks, quests, badges, and notifications.

### Tasks

| # | Task | Command / Action | Est. Time |
|---|------|------------------|-----------|
| 7.1 | Streak tracking logic | Daily streak calculation | 1 hr |
| 7.2 | Streak freeze items | Purchase with XP | 1 hr |
| 7.3 | Quest generation | AI creates daily challenges | 1.5 hr |
| 7.4 | Badge system | 10 initial badges with unlock logic | 2 hr |
| 7.5 | Badge showcase UI | Achievement gallery | 1 hr |
| 7.6 | Push notifications | `expo-notifications` setup | 1.5 hr |
| 7.7 | Reminder scheduling | Daily activity reminders | 1 hr |

### Exit Criteria
- [ ] Streaks track correctly
- [ ] Quests appear daily
- [ ] Badges unlock on achievement
- [ ] Push notifications work

---

## Phase 8: Polish & Launch (Days 34-40)

### Goal
Production-ready app submitted to stores.

### Tasks

| # | Task | Command / Action | Est. Time |
|---|------|------------------|-----------|
| 8.1 | Global error boundaries | Catch and report errors | 1 hr |
| 8.2 | Performance optimization | Memoization, lazy loading | 2 hr |
| 8.3 | Create app icon | Design + export all sizes | 1 hr |
| 8.4 | Create splash screen | Branded launch screen | 30 min |
| 8.5 | EAS Build setup | `eas build:configure` | 1 hr |
| 8.6 | Build iOS | `eas build --platform ios` | - |
| 8.7 | Build Android | `eas build --platform android` | - |
| 8.8 | TestFlight upload | Submit for testing | 30 min |
| 8.9 | Play Console upload | Submit for testing | 30 min |
| 8.10 | Analytics setup | Basic event tracking | 1 hr |

### Exit Criteria
- [ ] App icon and splash screen complete
- [ ] Builds succeed for iOS and Android
- [ ] Apps submitted to TestFlight and Play Console
- [ ] No critical bugs

---

## Appendix: Environment Setup

### Prerequisites

```bash
# Node.js v20+
node --version

# Install Expo CLI
npm install -g expo-cli

# Install EAS CLI
npm install -g eas-cli

# Supabase CLI (optional, for local dev)
npm install -g supabase
```

### Environment Variables

```env
# .env.local
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_GEMINI_API_KEY=your-gemini-key
```

---

## Appendix: Useful Commands

```bash
# Start development server
npx expo start

# Run on iOS
npx expo run:ios

# Run on Android
npx expo run:android

# Deploy Edge Functions
supabase functions deploy

# Build production APK
eas build --platform android --profile production

# Build production IPA
eas build --platform ios --profile production
```
