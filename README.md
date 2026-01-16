# Vital Quest 🏃‍♂️⚔️

**Vital Quest** is an AI-powered personal health coach and gamification system that transforms your fitness journey into an RPG adventure.

## 🚀 Status: Phase 2 Complete (Authentication & User Profile)

We have successfully implemented:
- **Authentication**: Sign Up, Login, and Sign Out using Supabase Auth.
- **Onboarding Wizard**: A 3-step flow to collect user goals, stats, and available equipment.
- **User Profile**: A dedicated tab displaying user stats (BMI, Level, XP) and equipment.
- **Security**: Row Level Security (RLS) and protected routes.

## 🛠 Tech Stack

- **Frontend**: React Native (Expo SDK 52)
- **Language**: TypeScript
- **Styling**: NativeWind v4 (Tailwind CSS)
- **Backend/Db**: Supabase (PostgreSQL, Auth)
- **State Mgmt**: Zustand

## 🏁 Getting Started

1.  **Install Dependencies**:
    ```bash
    cd vital-quest-app
    npm install
    ```

2.  **Environment Setup**:
    Ensure you have your Supabase URL and Anon Key configured in `services/supabase.ts`.

3.  **Run the App**:
    ```bash
    npx expo start --clear
    ```
    - Press `a` for Android Emulator.
    - Press `w` for Web (Experimental).

## 📂 Project Structure

- `app/`: Expo Router pages (screens).
- `components/`: Reusable UI components.
- `services/`: External service integrations (Supabase).
- `stores/`: Global state management (Zustand).
- `docs/`: Detailed implementation plans and documentation.

## 🔮 Next Steps (Phase 3)

- **Gamification Engine**: Implementing XP, Levels, and Streaks.
- **Daily Check-ins**: Logging workouts and meals.

---
*Built with ❤️ by the Vital Quest Team*
