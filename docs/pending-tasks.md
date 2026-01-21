# Pending Tasks & Future Roadmap

This document tracks upcoming features and refinements for **vitalQuest**, categorized by priority and phase.

## 🚀 High Priority (Next Session)

### Phase 6: Sensor Integration
- [ ] **Steps & Activity**: Research alternative solutions for step tracking (e.g., native health APIs like HealthKit/Google Fit).
- [ ] **Gait Analysis**: Implement the walk test feature using accelerometer data to measure walking stability.
- [ ] **Heart Rate (rPPG)**: Research and implement camera-based heart rate measurement for quick bio-feedback.

### Phase 7: Advanced Gamification
- [ ] **Daily Quests**: Have the AI generate 1-2 "Special Quests" each morning for extra XP (e.g., "Drink 3L of water today").
- [ ] **Achievements & Badges**: Implement the badge unlocking logic for milestones (e.g., "7-Day Streak", "First 5000 kcal burned").
- [ ] **Notifications**: Implement `expo-notifications` to remind users of upcoming meals and workouts.
- [ ] **Streak Protection Shop**: Implement logic to purchase and use streak freezes.
- [ ] **Dynamic Quests**: AI generates daily challenges based on weather/schedule.

## 🧠 AI & Advanced Features (Module B & E)
- [ ] **Goal Modification**: Allow users to change goal targets mid-plan (e.g., 5kg -> 3kg) with AI re-planning.
- [ ] **Real-time Adaptation**: Feature to "Rewrite Today" if user has limited time.
- [ ] **RAG Memory**: Implement vector search for long-term user fact retention.
- [ ] **Visual Verification**: Automated verification of meal/workout photos to auto-complete tasks.
- [ ] **Variance Alerts**: Warn users if logged calories differ significantly from the plan.

## 📡 Bio-Signals (Module C)
- [ ] **Sedentary Tremor**: Gyroscope analysis for fatigue detection.
- [ ] **Sleep Ambience**: Mic/Light sensor scoring for sleep quality.
- [ ] **Inertia Test**: Reaction time game for morning grogginess.

## 📊 Insights & Analytics
- [ ] **Historical Trends**: Build the "Insights" tab to show weekly/monthly progress charts for weight and calories.
- [ ] **AI Summaries**: Weekly AI-generated report summarizing progress and suggesting adjustments for the next week.

## 👤 User Experience & Personas
- [ ] **The "Gamer" Mode**: Add "Rapid Reward" toggle to emphasize badges, streaks, and XP popups over raw data.
- [ ] **The "Bio-Hacker" Dashboard**: Create a dense data view showing raw sensor graphs, correlations, and CSV export.
- [ ] **The "Beginner" Guide**: Implement a simplified "Just tell me what to do" mode with minimal charts and step-by-step wizardry.

## 💅 Polish & Refinement
- [ ] **Lottie Animations**: Replace static icons with playful Lottie animations for:
  - [ ] XP Gain (sparkles/floaters)
  - [ ] Goal Achievement (confetti/trophy)
  - [ ] Today's Plan completion (party poppers)
- [ ] **Meal DB Enrichment**: Add a local database of common foods to allow quick search logging without always calling the AI.
- [ ] **Haptics**: Add subtle haptic feedback (using `expo-haptics`) when tasks are completed or XP is gained.
- [ ] **Optimizations**: Implement image compression for meal photo uploads to save bandwidth.
- [ ] **Dark Mode**: Implement full dark mode support with theme toggle in Profile settings.
- [ ] **Evolving Avatar**: Avatar visuals that change as user levels up (Rookie → Warrior → Titan).
- [ ] **Pull-to-Refresh Animation**: Custom XP-themed animation for pull-to-refresh gestures.
- [ ] **Skeleton Loaders**: Replace all loading spinners with shimmering skeleton placeholders.

## 🛠️ Infrastructure
- [ ] **Edge Function Testing**: Add unit tests for the `chat-agent` to ensure JSON plan generation remains stable.
- [ ] **Database Backups**: Set up automated backups for the Supabase project.
