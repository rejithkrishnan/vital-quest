# Pending Tasks & Future Roadmap

This document tracks upcoming features and refinements for **vitalQuest**, categorized by priority and phase.

## 🚀 High Priority (Next Session)

### Phase 6: Sensor Integration
- [ ] **Steps & Activity**: Integrate `expo-sensors` to track daily steps and sync them with the home dashboard stats.
- [ ] **Gait Analysis**: Implement the walk test feature using accelerometer data to measure walking stability.
- [ ] **Heart Rate (rPPG)**: Research and implement camera-based heart rate measurement for quick bio-feedback.

### Phase 7: Advanced Gamification
- [ ] **Daily Quests**: Have the AI generate 1-2 "Special Quests" each morning for extra XP (e.g., "Drink 3L of water today").
- [ ] **Achievements & Badges**: Implement the badge unlocking logic for milestones (e.g., "7-Day Streak", "First 5000 kcal burned").
- [ ] **Notifications**: Implement `expo-notifications` to remind users of upcoming meals and workouts.

## 📊 Insights & Analytics
- [ ] **Historical Trends**: Build the "Insights" tab to show weekly/monthly progress charts for weight and calories.
- [ ] **AI Summaries**: Weekly AI-generated report summarizing progress and suggesting adjustments for the next week.

## 💅 Polish & Refinement
- [ ] **Lottie Animations**: Replace static icons with playful Lottie animations for:
  - [ ] XP Gain (sparkles/floaters)
  - [ ] Goal Achievement (confetti/trophy)
  - [ ] Today's Plan completion (party poppers)
- [ ] **Meal DB Enrichment**: Add a local database of common foods to allow quick search logging without always calling the AI.
- [ ] **Haptics**: Add subtle haptic feedback (using `expo-haptics`) when tasks are completed or XP is gained.
- [ ] **Optimizations**: Implement image compression for meal photo uploads to save bandwidth.

## 🛠️ Infrastructure
- [ ] **Edge Function Testing**: Add unit tests for the `chat-agent` to ensure JSON plan generation remains stable.
- [ ] **Database Backups**: Set up automated backups for the Supabase project.
