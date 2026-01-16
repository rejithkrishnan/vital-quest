---
description: Create a new screen with proper Expo Router setup and NativeWind styling
---

# Create New Screen Workflow

## Steps

1. **Ask for screen details:**
   - Screen name (e.g., "Settings")
   - Route group (e.g., "(tabs)", "(auth)")
   - Whether it needs authentication

2. **Create the screen file** in `app/<route-group>/<screen-name>.tsx`

3. **Use this template:**

```tsx
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ScreenNameScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-4">
        <Text className="text-foreground text-2xl font-bold mt-4">
          Screen Title
        </Text>
        {/* Screen content */}
      </View>
    </SafeAreaView>
  );
}
```

4. **If authentication required:**
   - Add auth check using `useAuth` hook
   - Redirect to login if not authenticated

5. **Update navigation if needed:**
   - Add to tab navigator if it's a tab
   - Add navigation link if needed
