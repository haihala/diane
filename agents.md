# AI Agent Guidelines

SvelteKit 2.x + Svelte 5, Firebase Hosting (static), Firebase Functions (Python), TypeScript, Vite, ESLint (strict), Prettier.

## Code Quality

**Always run `npm run validate` before committing** - runs Prettier, ESLint, svelte-check, and tsc.

## Core Principles

### Components

- Small and focused (~200 lines max)
- Reusable and prop-driven
- Self-contained with minimal dependencies

### File Organization

```
svelte-app/src/
  lib/
    components/       # Reusable UI components
    state/            # Svelte 5 runes for global state, prefer these over writeable
    services/         # API calls, external service integrations
    types/            # TypeScript type definitions
  routes/             # SvelteKit file-based routing
svelte-app/static/    # Static assets (icons, images, fonts)
```

**Naming**: Components `PascalCase.svelte`, utilities `camelCase.ts`, types `PascalCase.ts`

### DRY Principle

- Extract repeated logic into utility functions
- Create shared components for repeated UI patterns
- If code appears 2-3 times, consider abstraction

### Type Safety

- Always use TypeScript with explicit types
- **Never use `any` or `unknown`** - ESLint blocks this
- Define interfaces for component props
- All functions must have explicit return types
- Use `import type` syntax for type imports

### State Management

- Prefer component-level `$state` when possible
- Use runes for global state in `lib/state/*.svelte.ts`
- Avoid prop drilling - use context API for deeply nested props

### Performance

- Keep components small and focused
- Use `$derived` for computed values
- Lazy load routes/components when appropriate
- **All runtime assets must be in `static/` folder**
- Optimize images before committing

### Styling

- Use scoped styles in Svelte components
- Use global CSS custom properties for theming (in app.css)
- **Never include inline SVG markup** - store SVG files in `static/icons/`
- Reference static assets with absolute paths: `/icons/file.svg`
- Create an Icon component that references static assets

### ESLint Rules

Strict type safety, async safety, consistent imports, no `console.log`, prefer `const`, strict equality.

### Documentation

- Prefer self-documenting code (clear names, explicit types)
- Only add comments for complex logic that isn't obvious

## Firebase

**Development**:

- Always use Firebase emulators (`firebase emulators:start`)
- Check for running dev server before starting: `lsof -i :5173`
- Data in emulator isn't persisted between restarts

**Static Adapter**:

- All routes pre-rendered or use static adapter
- All runtime assets in `static/` folder
- Reference static assets with absolute paths

**Functions**: Keep Python functions in `functions/`, one per file

**Firestore**: Define clear data models, use TypeScript interfaces matching schemas

## Checklist

- [ ] Run `npm run validate` - all checks must pass
- [ ] No duplication (DRY applied)
- [ ] Explicit TypeScript types, no `any`/`unknown`
- [ ] All functions have explicit return types
- [ ] Type imports use `import type`
- [ ] No floating promises
- [ ] Correct directory and naming conventions
- [ ] Components <200 lines
- [ ] Accessibility considerations
- [ ] Self-documenting code
- [ ] No inline SVG markup
- [ ] Static assets in `static/` folder
- [ ] Error handling implemented
- [ ] No `console.log`

## Anti-Patterns

❌ Monolithic components (>300 lines) → ✅ Break into smaller components
❌ Deep prop drilling → ✅ Use context or state modules
❌ Copy-pasted code → ✅ Extract to utilities
❌ Magic numbers/strings → ✅ Use named constants
❌ Using `any`/`unknown` → ✅ Use proper types
❌ Floating promises → ✅ Always await or handle properly
❌ Missing return types → ✅ Explicitly type all returns

## Before Coding

1. Does similar component/utility exist?
2. Can this be broken into smaller pieces?
3. Is this logic repeated elsewhere?
4. What type definitions are needed?
5. Is naming clear and self-documenting?

Keep it simple, small, DRY, and typed.
