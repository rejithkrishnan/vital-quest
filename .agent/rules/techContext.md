# Tech Context

## Stack
- **Framework**: React Native (Expo SDK 54)
- **Navigation**: Expo Router (v6)
- **Styling**: NativeWind v4 (Tailwind CSS)
- **Backend**: Supabase (Postgres with pgvector, Auth, Storage)
- **AI**: Google Gemini 2.5 Flash (via Supabase Edge Functions)
- **State**: Zustand (with localized persistence)

## Development Patterns
- **AI Integration**: Logic handled in `supabase/functions/chat-agent/`.
- **RAG System**: Uses vector embeddings for `user_memory` retrieval.
- **Screens/Routes**: Managed via `app/` directory (Tabs and Stack groups).
- **Stores**: Global business logic in `stores/`, consumable via hooks.

## Known Issues / Gotchas
- **Realtime**: Realtime subscriptions should be carefully managed to avoid memory leaks (see `subscribeToRealtime` in stores).
- **Asset Loading**: Lottie files must be bundled and loaded via `expo-asset`.
- **Safe Areas**: Use `SafeAreaView` from `react-native-safe-area-context` for all screens.

## Critical Files
- `app/_layout.tsx`: Root application entry and auth setup.
- `stores/goalsStore.ts`: Core planning and task logic.
- `supabase/functions/chat-agent/index.ts`: AI engine logic.
- `global.css`: NativeWind configuration.
