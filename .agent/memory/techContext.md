# Tech Context

## Stack
- **Framework**: React Native (Expo SDK 52)
- **Language**: TypeScript
- **Styling**: NativeWind v4 (Tailwind CSS)
- **Backend**: Supabase (Postgres, Auth)
- **State**: Zustand

## Development Patterns
- **Screens**: Located in `app/`. Use `export default function`.
- **Components**: Reusable UI in `components/`. Use NativeWind.
- **Services**: `services/supabase.ts` for singleton client.
- **Protected Routes**: managed by `hooks/useProtectedRoute.ts`.

## Known Issues / Gotchas
- **Layout**: Always use `SafeAreaView` from `react-native-safe-area-context` for top-level screen containers to handle notches/safe areas correctly.
- **NativeWind**: Requires `global.css` import in `_layout.tsx`.
- **Supabase**: `supabase-js` client must be initialized with `AsyncStorage` adapter for React Native.

## Critical Files
- `services/supabase.ts`: Auth client configuration.
- `app/_layout.tsx`: Root provider setup.
- `global.css`: Tailwind directives.
