# **Business Requirement Document (BRD)**

**Project Name:** vitalQuest (AI Personal Health Coach)
**Version:** 2.1
**Date:** January 2026
**Primary Tech Stack:** React Native (Expo), Supabase (PostgreSQL + Edge Functions), Google Gemini, MCP

---

## **1. Executive Summary**

**vitalQuest** is a mobile-first, AI-driven health assistant that goes beyond simple tracking. It combines **generative AI (Google Gemini)** to create hyper-personalized plans with **advanced signal processing** (gait, HRV, environment) to understand the user's physical reality. To drive retention, the app uses a deep **Gamification Layer** (RPG-style leveling, streaks, quests) to turn health improvement into an addictive, rewarding game.

---

## **2. User Personas**

* **The "Gamer":** Motivated by streaks, badges, and leveling up. Needs instant gratification for healthy choices.
* **The "Bio-Hacker":** obsessed with data. Wants to see how their gait symmetry or HRV improves over time.
* **The "Confused Beginner":** Overwhelmed by fitness info. Needs a simple "Do this, then eat that" instruction from the AI.

---

## **3. Functional Requirements**

### **3.1. Module A: Onboarding & The "Digital Twin"**

The system must create a detailed digital profile of the user to inform the AI.

* **Basic Inputs:** Age, Gender, Weight, Height, Injuries (e.g., "Left knee pain").
* **Contextual Inputs:** Equipment available (Gym vs. Home), dietary restrictions (Vegan, Keto), and primary goal (Bulk, Cut, Maintain).
* **Initial Calibration:** A 1-minute "Walk Test" using phone sensors to establish a baseline gait score.

### **3.2. Module B: The "Brain" (AI Plan Generation via MCP)**

Using the **Model Context Protocol (MCP)**, the app connects Gemini to data tools to generate plans.

* **Dynamic Planning:**
* **Workout:** Generates a weekly schedule (sets, reps, rest) adjusted for injuries.
* **Nutrition:** Calculates precise macro targets (Protein/Carb/Fat) and meal suggestions.


* **Real-time Adaptation:**
* *User:* "I only have 15 mins today."
* *System:* Instantly rewrites the day's session to a high-intensity interval training (HIIT) session.



### **3.3. Module C: Signal Features (The "Senses")**

The app processes raw sensor data to provide "Bio-Feedback."

| Feature | Sensor | Insight Generated |
| --- | --- | --- |
| **Gait Asymmetry** | Accelerometer (60Hz) | Detects favoring of one leg; warns of potential injury risk. |
| **Sedentary Tremor** | Gyroscope | Detects micro-shakes indicating fatigue or excessive caffeine. |
| **Digital HRV** | Camera (Flash) | Measures rPPG (blood flow) to estimate stress levels. |
| **Sleep Ambience** | Mic/Light Sensor | Scores the bedroom environment (Lux/Decibels) for sleep quality. |
| **Inertia Test** | Touchscreen | Reaction time game at wake-up to measure "Morning Grogginess." |

### **3.4. Module D: The Gamification Engine (The "Hook")**

Users engage with a **PBL (Points, Badges, Leaderboards)** system.

* **XP System:**
* Log Meal = +10 XP
* Workout = +50 XP
* Perfect Gait Score = +20 XP


* **Leveling:** Users progress from "Rookie" (Lvl 1) to "Titan" (Lvl 50). Visual avatar evolves with levels.
* **Streak Mechanics:** "Streak Protection" items can be bought with earned points.
* **Dynamic Quests:** AI generates daily challenges (e.g., "Walk 5k steps before noon") based on weather/schedule.

### **3.5. Module E: The AI Assistant (Chat)**

* **Context Aware:** Knows the user's level, recent signals, and plan status.
* **Safety First:** Filters out medical advice; redirects to professional help for serious pain signals.
* **Multimedia:** Can analyze food photos (via Gemini Vision) to log calories automatically.

---

## **4. Non-Functional Requirements**

* **Latency:** Chat responses < 3 seconds; Signal processing < 2 seconds.
* **Privacy:** Raw sensor data (audio/images) processed **on-device** or in ephemeral memory; only "Scores" are saved to the cloud.
* **Offline Capability:** Daily plan and logging must work without internet. Syncs upon reconnection.
* **Battery:** Background sensor sampling must not drain >5% battery per day.

---

## **5. Technical Architecture (MCP & AI-Agent Optimized)**

### **5.1. High-Level Diagram**

### **5.2. Technology Stack**

* **Frontend:** React Native (Expo) + NativeWind v4 (UI) + Zustand (State) + TanStack Query.
* **Backend:** Supabase Edge Functions (Deno) - serverless, globally distributed.
* **Database:** PostgreSQL (Supabase managed) with `pgvector` for chat history context.
* **Auth:** Supabase Auth (Google, Apple, Email/Password, Magic Link).
* **Storage:** Supabase Storage (profile pics, food photos).
* **Realtime:** Supabase Realtime (WebSocket for live XP/level updates).
* **Protocol:** **Model Context Protocol (MCP)** to standardize AI tool access.

### **5.3. MCP Tool Architecture**

The backend hosts a unified MCP Host with 5 tools for Gemini to invoke:

| MCP Tool | Description |
| --- | --- |
| `db_log_activity` | Inserts activity into PostgreSQL (workouts, meals, signals). |
| `db_get_stats` | Fetches XP, Level, Streak, and recent biomarkers for context. |
| `calc_gait_score` | Inputs raw accelerometer array → Returns asymmetry score (0-100). |
| `gamify_action` | Inputs ActionID → Returns XP gained & checks for Level Up. |
| `search_nutrition` | Inputs food name → Returns macros (Protein/Carb/Fat) via external API. |

---

## **6. Data & Database Schema Strategy**

### **6.1. Core Entity Relationship (ERD)**

* **`Users`**: Profile, Auth, Current Level.
* **`DailyLogs`**: Date, Activities Completed, Signals Recorded.
* **`Gamification`**: UserID, TotalXP, CurrentStreak, BadgesArray.
* **`Signals`**: UserID, SignalType (e.g., 'GAIT'), Value (JSON), Timestamp.

### **6.2. Signal Processing Pipeline**

1. **Capture:** React Native collects 5s buffer of Accelerometer data.
2. **Compress:** Data is downsampled and sent to Supabase Edge Function `/signals` endpoint.
3. **Analyze:** Edge Function runs FFT (Fast Fourier Transform) to extract gait frequency.
4. **Insight:** Result is passed to Gemini ("User has high variance in step frequency").
5. **Feedback:** Gemini generates a coaching tip ("Focus on a steady rhythm").

---

## **7. Project Timeline (8-Phase Modular Approach)**

The project follows an incremental approach - each phase produces a working app version.

| Phase | Focus | Days | Key Deliverables |
|-------|-------|------|------------------|
| **1** | Foundation | 1-3 | Expo + NativeWind + Tab navigation |
| **2** | Auth & Profile | 4-7 | Supabase Auth, onboarding flow |
| **3** | Basic Gamification | 8-11 | XP system, levels, dashboard |
| **4** | AI Chat | 12-16 | Gemini integration, MCP host |
| **5** | Plans & Logging | 17-21 | Daily plans, activity logging, offline |
| **6** | Sensors | 22-28 | Gait analysis, HRV tracking |
| **7** | Advanced Gamification | 29-33 | Streaks, quests, badges |
| **8** | Polish & Launch | 34-40 | EAS Build, app store submission |

**Total Duration:** ~6 weeks (40 days)

> **Note:** See TDD Section 9 for detailed task breakdowns per phase.



---

## **8. Risks & Mitigation**

| Risk | Mitigation |
| --- | --- |
| **AI Hallucination** | Use strict System Prompts; hard-coded disclaimers for injury/medical queries. |
| **Battery Drain** | Use "Job Scheduler" to only sample sensors periodically (e.g., every 15 mins), not continuously. |
| **User Cheating** | Cap daily XP limits; use "Speed Checks" (e.g., can't log a 1-hour workout in 1 minute). |

---

## **9. Next Steps**

To kick off **Week 1**, the immediate action items are:

1. **Supabase Setup:** Create project, run SQL migrations, configure RLS policies.
2. **Expo Init:** Initialize React Native project with `npx create-expo-app`.
3. **Auth Integration:** Connect Supabase Auth to the Expo app.
4. **Edge Functions:** Scaffold the MCP Host function with Gemini SDK.
