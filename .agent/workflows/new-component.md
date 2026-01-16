---
description: Create a reusable UI component with NativeWind styling and TypeScript props
---

# Create New Component Workflow

## Steps

1. **Ask for component details:**
   - Component name (e.g., "Badge")
   - Category (ui, game, chat)
   - Required props

2. **Create the component file** in `components/<category>/<ComponentName>.tsx`

3. **Use this template:**

```tsx
import { View, Text, Pressable } from 'react-native';

interface ComponentNameProps {
  // Define props here
  title: string;
  onPress?: () => void;
}

export function ComponentName({ title, onPress }: ComponentNameProps) {
  return (
    <View className="bg-surface rounded-xl p-4">
      <Text className="text-foreground font-medium">{title}</Text>
    </View>
  );
}
```

4. **Export from barrel file:**
   - Add to `components/<category>/index.ts`

```tsx
export { ComponentName } from './ComponentName';
```

5. **Component guidelines:**
   - Use NativeWind for all styling
   - Define clear TypeScript interfaces
   - Make props optional where sensible
   - Add `onPress` for interactive components
