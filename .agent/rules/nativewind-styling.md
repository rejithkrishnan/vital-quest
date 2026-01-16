# NativeWind Styling Guide

## Core Principles
* Always use NativeWind `className` prop for styling
* Never use React Native `StyleSheet.create()` or inline `style` prop
* Use Tailwind utility classes from the project's config

## Color Palette
Use these semantic color classes (defined in `tailwind.config.js`):

### Primary Colors
* `bg-primary` / `text-primary` - Main brand color (violet)
* `bg-secondary` / `text-secondary` - Secondary actions
* `bg-accent` / `text-accent` - Highlights and CTAs

### Semantic Colors
* `bg-success` / `text-success` - Success states (green)
* `bg-warning` / `text-warning` - Warnings (amber)
* `bg-error` / `text-error` - Errors (red)

### Neutral Colors (Dark Theme)
* `bg-background` - Main app background (slate-900)
* `bg-surface` - Card/container background (slate-800)
* `bg-muted` - Muted elements (slate-700)
* `text-foreground` - Primary text (white)
* `text-muted` - Secondary text (slate-400)

## Common Patterns

### Cards
```tsx
<View className="bg-surface rounded-2xl p-4 mx-4 my-2">
  <Text className="text-foreground text-lg font-semibold">Title</Text>
</View>
```

### Buttons
```tsx
<Pressable className="bg-primary rounded-xl py-3 px-6 active:opacity-80">
  <Text className="text-white text-center font-semibold">Action</Text>
</Pressable>
```

### XP Progress Bar
```tsx
<View className="h-3 bg-muted rounded-full overflow-hidden">
  <View className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full" />
</View>
```

## Responsive Design
* Use `flex-1` for flexible containers
* Use `w-full` for full-width elements
* Use `px-4` for standard horizontal padding
* Use `gap-*` for spacing between flex children
