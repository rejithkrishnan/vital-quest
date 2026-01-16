# Code Style Guide

## TypeScript Conventions
* Use TypeScript strict mode for all files
* Prefer `interface` over `type` for object shapes
* Use `const` by default, `let` only when reassignment is needed
* Use async/await instead of raw Promises

## React Native Conventions
* Use functional components with hooks only (no class components)
* Component files should be PascalCase (e.g., `Button.tsx`)
* Hook files should start with `use` (e.g., `useAuth.ts`)
* Keep components small - extract logic into custom hooks

## NativeWind Styling
* Always use NativeWind className for styling
* Never use inline `style` prop unless absolutely necessary
* Use design tokens from `tailwind.config.js` for colors/spacing
* Group related classes logically: layout → spacing → colors → typography

## File Organization
* One component per file
* Export component as default export
* Named exports for types/interfaces
* Co-locate tests with source files

## Naming Conventions
* Variables: camelCase
* Components: PascalCase
* Constants: UPPER_SNAKE_CASE
* Interfaces: PascalCase with `I` prefix optional
* Types: PascalCase
