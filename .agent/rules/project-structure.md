# Project Structure Guide

## Directory Structure
Follow this exact folder structure for all code generation:

```
vitalquest/
├── app/                    # Expo Router screens
│   ├── (tabs)/             # Tab-based navigation
│   │   ├── _layout.tsx     # Tab navigator config
│   │   ├── index.tsx       # Home tab
│   │   ├── chat.tsx        # Chat tab
│   │   └── profile.tsx     # Profile tab
│   ├── (auth)/             # Auth screens (not in tabs)
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   └── onboarding/
│   ├── _layout.tsx         # Root layout
│   └── +not-found.tsx
├── components/
│   ├── ui/                 # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   └── index.ts        # Barrel export
│   ├── game/               # Gamification components
│   │   ├── XPBar.tsx
│   │   ├── LevelBadge.tsx
│   │   └── index.ts
│   └── chat/               # Chat components
│       ├── MessageBubble.tsx
│       └── index.ts
├── hooks/                  # Custom React hooks
│   ├── useAuth.ts
│   ├── useGamification.ts
│   └── useSensors.ts
├── services/               # External service integrations
│   ├── supabase.ts         # Supabase client
│   └── gemini.ts           # AI service
├── stores/                 # Zustand stores
│   ├── authStore.ts
│   └── gameStore.ts
├── lib/                    # Utility functions
│   ├── constants.ts
│   └── helpers.ts
├── types/                  # TypeScript type definitions
│   └── index.ts
└── assets/                 # Static assets (images, fonts)
```

## File Placement Rules
* Screens go in `app/` following Expo Router conventions
* Reusable components go in `components/`
* Business logic hooks go in `hooks/`
* Third-party integrations go in `services/`
* Global state goes in `stores/`
* Type definitions go in `types/`
