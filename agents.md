# AI Agent Guidelines for Diane Project

This document provides comprehensive guidelines for AI assistants working on the Diane project - a SvelteKit static adapter Firebase application.

## Project Overview

- **Framework**: SvelteKit 2.x with Svelte 5
- **Deployment**: Firebase Hosting (static adapter)
- **Backend**: Firebase Functions (Python)
- **Language**: TypeScript for frontend, Python for functions
- **Build Tool**: Vite
- **Code Quality**: ESLint (strict mode), Prettier, svelte-check

## Code Quality Enforcement

The project uses strict ESLint rules to maintain code quality:

- **Type Safety**: `any` and unsafe type operations are blocked
- **Async Safety**: Floating promises and misused promises are errors
- **Code Style**: Enforces modern JavaScript/TypeScript patterns
- **Import Organization**: Requires consistent type imports

### Running Checks

**IMPORTANT: Always use the `validate` command to run all checks**:
```bash
npm run validate
```

**DO NOT run individual checks separately** (like `npm run lint`, `npm run check`, or `tsc` alone). The `validate` command is specifically designed to run all quality checks together in the correct order:
- Prettier formatting check
- ESLint with strict rules
- Svelte component checks (`svelte-check`)
- TypeScript compilation (`tsc --noEmit`)

**When to run `validate`**:
- Before committing any code
- After making changes to verify everything passes
- Before creating a pull request
- Anytime you need to verify code quality

CI/CD pipelines run this automatically on all PRs and merges. All checks must pass.

## Core Principles

### 1. Component Design Philosophy

**Composability**: Every component should be:
- **Small and focused**: Single responsibility principle (~200 lines max)
- **Reusable**: Designed for multiple contexts
- **Prop-driven**: Configurable through clear prop interfaces
- **Self-contained**: Minimal external dependencies

Organize components logically by feature or complexity, not by arbitrary design system categories.

### 2. Code Organization

**Folder Structure**:
```
svelte-app/src/
  lib/
    components/       # Reusable UI components
    state/            # Svelte 5 runes for global state
    utils/            # Pure utility functions
    services/         # API calls and external service integrations
    types/            # TypeScript type definitions
    constants/        # Application constants
  routes/             # SvelteKit file-based routing
    (auth)/           # Route groups for organization
    api/              # API endpoints (if needed)
svelte-app/static/    # Static assets (MUST be here for production builds)
  icons/              # SVG icons
  images/             # Images
  fonts/              # Fonts
```

**File Naming**:
- Components: `PascalCase.svelte` (e.g., `UserProfile.svelte`)
- Utilities: `camelCase.ts` (e.g., `formatDate.ts`)
- Types: `PascalCase.ts` or `types.ts` (e.g., `User.ts`)
- Constants: `constants.ts` or `config.ts`
- Routes: SvelteKit conventions (`+page.svelte`, `+layout.svelte`)

### 3. DRY Principle (Don't Repeat Yourself)

**Identify Duplication Early**:
- If code appears 2-3 times, consider abstraction
- Extract repeated logic into utility functions
- Create shared components for repeated UI patterns
- Use TypeScript generics for type-safe reusable functions

**Abstraction Layers**:
```typescript
// Good: Shared utility
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

// Good: Shared component with children
<Card variant="primary" padding="md">
  {children}
</Card>

// Bad: Duplicating logic in multiple components
// Component A: const formatted = `$${amount.toFixed(2)}`;
// Component B: const formatted = `$${amount.toFixed(2)}`;
```

### 4. Type Safety

**Always Use TypeScript**:
- Define explicit types for all props and functions
- Use interfaces for component props
- **Never use `any` or `unknown`** - always define proper types
- Create shared type definitions in `lib/types/`
- ESLint enforces strict type safety with:
  - `@typescript-eslint/no-explicit-any` - Blocks `any` type
  - `@typescript-eslint/no-unsafe-*` rules - Prevents unsafe type operations
  - `@typescript-eslint/explicit-function-return-type` - Requires return types
  - Run `npm run validate` to check for violations

**Example**:
```typescript
// src/lib/types/User.ts
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

// Component with typed props
<script lang="ts">
  import type { User } from '$lib/types/User';
  
  interface Props {
    user: User;
    onEdit?: (user: User) => void;
  }
  
  let { user, onEdit }: Props = $props();
</script>
```

### 5. State Management

**Prefer Local State (Svelte 5 Runes)**:
- Use component-level state with `$state` when possible
- Only lift state when multiple components need it

**Use Runes for Global State**:
```typescript
// src/lib/state/auth.svelte.ts
import type { User } from '$lib/types/User';

let currentUser = $state<User | null>(null);

export function authState() {
  return {
    get user() { return currentUser; },
    set user(value: User | null) { currentUser = value; }
  };
}
```

**Avoid Prop Drilling**:
- Use context API for deeply nested props
- Consider state modules for cross-cutting concerns

### 6. Performance Best Practices

**Component Optimization**:
- Keep components small and focused
- Use `{#key}` blocks to force re-rendering when needed
- Avoid expensive computations in templates - use `$derived` instead
- Use derived runes for computed values

**Code Splitting**:
- Lazy load routes and components when appropriate
- Use dynamic imports for large dependencies
- Keep initial bundle size minimal

**Asset Optimization**:
- **All runtime assets must be in the `static/` folder** (icons, images, fonts, etc.)
- Optimize images before committing
- Use appropriate image formats (WebP, AVIF)
- Implement lazy loading for images
- Files in `static/` are accessible at `/filename` in the build output

### 7. Styling Standards

**Approach**:
- Use scoped styles in Svelte components
- Use global CSS custom properties for theming (defined in app.css or similar)
- Keep styles simple and maintainable - no CSS frameworks

**Structure**:
```svelte
<style>
  /* Component-specific styles */
  .container {
    display: flex;
    gap: var(--spacing-md);
  }
  
  /* Use global CSS custom properties for theming */
  .button {
    background: var(--color-primary);
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--radius-sm);
  }
</style>
```

**Global Theme Variables**:
```css
/* app.css or global stylesheet */
:root {
  --color-primary: #3b82f6;
  --color-secondary: #6b7280;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --radius-sm: 0.25rem;
}
```

**SVG Assets**:
- **Never include SVG markup directly in component templates** - it's completely illegible to humans
- **Store all SVG files in the `static/` directory** for SvelteKit static adapter compatibility
- Files in `static/` are copied to the build output and accessible at runtime
- **DO NOT** store SVG files in `lib/assets/` - they won't be accessible in the production build
- For icon systems, create a dedicated Icon component that references SVG files from `/icons/` (which maps to `static/icons/`)

```svelte
<!-- ❌ Bad - Inline SVG markup is illegible -->
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <path d="M12 5v14" />
  <path d="M5 12h14" />
</svg>

<!-- ❌ Bad - Will not work in production build -->
<img src="$lib/assets/icons/plus.svg" alt="Add" />

<!-- ✅ Good - Reference SVG from static folder -->
<img src="/icons/plus.svg" alt="Add" />

<!-- ✅ Good - Use an Icon component that references static assets -->
<Icon name="plus" size={24} />
<!-- Where Icon.svelte uses: <img src="/icons/{name}.svg" /> -->
```

**Static Asset Structure**:
```
svelte-app/
  static/           # Static files copied to build output
    icons/          # SVG icons
    images/         # Images
    fonts/          # Fonts
    robots.txt      # Other static files
  src/
    lib/
      assets/       # AVOID storing runtime assets here - won't be in build
```

### 8. ESLint Configuration

The project enforces strict code quality rules via ESLint:

**Type Safety Rules**:
- `@typescript-eslint/no-explicit-any` - Blocks `any` type usage
- `@typescript-eslint/no-unsafe-*` - Prevents unsafe type operations on `any`
- `@typescript-eslint/explicit-function-return-type` - Requires explicit return types

**Async/Promise Safety**:
- `@typescript-eslint/no-floating-promises` - Prevents unhandled promises
- `@typescript-eslint/await-thenable` - Ensures only promises are awaited
- `@typescript-eslint/no-misused-promises` - Catches incorrect promise usage
- `@typescript-eslint/require-await` - Prevents unnecessary async keywords

**Import Rules**:
- `@typescript-eslint/consistent-type-imports` - Requires `import type` syntax
- `@typescript-eslint/no-import-type-side-effects` - Prevents type import side effects

**Best Practices**:
- `no-console` - Warns about `console.log` (allows `warn`/`error`)
- `prefer-const` - Enforces const for non-reassigned variables
- `prefer-template` - Enforces template literals over concatenation
- `eqeqeq` - Requires strict equality (`===`)

### Validating Your Code

**CRITICAL: Always use `npm run validate` to run all checks**. This is the single command that runs all quality checks:

```bash
npm run validate
```

This command runs all checks in the correct order:
1. `npm run lint` - Prettier + ESLint checks
2. `npm run check` - Svelte component validation (`svelte-check`)
3. `tsc --noEmit` - TypeScript compilation check

**DO NOT run checks individually**. The `validate` command ensures all checks pass together, which is what CI/CD requires. All three checks must pass before code can be committed or merged.

### 9. Testing Philosophy

**What to Test**:
- Utility functions (unit tests)
- Complex business logic (unit tests)
- Critical user flows (e2e tests)
- Component behavior, not implementation details

**Testing Structure**:
```
tests/
  unit/
  e2e/
```

### Firebase Integration

**Development Setup**:
- **Always use Firebase emulators for local development**
- Start emulators before running the dev server: `firebase emulators:start`
- The app automatically connects to emulators when running on localhost
- Emulator configuration is in `firebase.json`

**Development Server**:
- **Check for a running dev server before starting one** - most of the time there should already be one available
- Use `lsof -i :5173` or `curl http://localhost:5173` to check if the dev server is running
- Only start a new dev server with `npm run dev` if one isn't already running
- Multiple dev servers can cause port conflicts and confusion

**Functions**:
- Keep Python functions in `functions/` directory
- One function per file when possible
- Clear function naming that describes the action

**Firestore**:
- Define clear data models
- Use TypeScript interfaces matching Firestore schemas
- Implement proper security rules
- In development, data is stored in the emulator (not persisted between restarts)

**Storage**:
- Organize files with clear naming conventions
- Implement proper access controls

**Production Configuration**:
- Replace mock Firebase credentials with real ones before deploying
- Use environment variables for sensitive configuration
- Test with emulators before deploying to production

### 10. Documentation

**Prefer Self-Documentation**:
- Use clear, descriptive names for functions and variables
- Let TypeScript types communicate intent
- Only add comments for complex logic that isn't obvious

**Avoid Verbose Documentation**:
```typescript
// ❌ Bad - Obvious from name and types
/**
 * Formats a date string for display
 * @param date - The date to format
 * @param locale - The locale to use for formatting (default: 'en-US')
 * @returns Formatted date string
 */
export function formatDate(date: Date | string, locale = 'en-US'): string {
  // ...
}

// ✅ Good - Self-documenting
export function formatDate(date: Date | string, locale = 'en-US'): string {
  // Handle both Date objects and ISO strings
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString(locale);
}
```

**Only Document When Necessary**:
- Complex algorithms or business logic
- Non-obvious workarounds or hacks
- Important architectural decisions
- Public APIs or library functions

## Development Workflow

### Before Making Changes

1. **Understand the existing structure**: Review current folder organization
2. **Check for existing components**: Search before creating new ones
3. **Identify reusable patterns**: Look for opportunities to abstract
4. **Consider type safety**: Plan type definitions upfront
5. **Run validation**: Use `npm run validate` to ensure everything passes before starting

### When Creating Components

1. **Check for existing components**: Search before creating new ones
2. **Keep it simple**: Start with the simplest solution
3. **Define props interface**: Clear TypeScript definitions
4. **Consider accessibility**: ARIA labels, keyboard navigation
5. **Test in isolation**: Ensure component works independently

### When Refactoring

1. **Identify duplication**: Find repeated patterns
2. **Extract carefully**: Don't over-abstract prematurely
3. **Maintain types**: Update TypeScript definitions
4. **Test thoroughly**: Ensure no regressions
5. **Validate changes**: Always run `npm run validate` after refactoring to catch any issues

## Code Review Checklist

When reviewing or generating code, ensure:

- [ ] **Run `npm run validate`** - All quality checks must pass
- [ ] No unnecessary duplication (DRY principle applied)
- [ ] TypeScript types are explicit and correct
- [ ] **No `any` or `unknown` types used** - ESLint enforces this
- [ ] All functions have explicit return types
- [ ] Type imports use `import type` syntax
- [ ] No floating promises or unsafe async operations
- [ ] File is in the correct directory
- [ ] Naming conventions are followed
- [ ] Component is reasonably sized (<200 lines ideal)
- [ ] Props are well-defined with clear types
- [ ] Accessibility considerations included
- [ ] Performance implications considered
- [ ] Code is self-documenting (clear names, good types)
- [ ] Styles use global CSS variables where appropriate
- [ ] **No inline SVG markup** - use static folder for SVG files
- [ ] **Static assets are in `static/` folder** - not in `lib/assets/`
- [ ] No hardcoded values that should be constants
- [ ] Error handling is implemented
- [ ] Loading states are handled
- [ ] No `console.log` statements (use `console.warn` or `console.error` if needed)

## Anti-Patterns to Avoid

### Component Anti-Patterns

❌ **Monolithic components** (>300 lines)
✅ Break into smaller, focused components

❌ **Deep prop drilling** (passing props through 3+ levels)
✅ Use context or state modules

❌ **Implicit dependencies** (hidden external state)
✅ Explicit props and clear data flow

### Code Anti-Patterns

❌ **Copy-pasted code blocks**
✅ Extract to shared utilities

❌ **Magic numbers/strings**
✅ Use named constants

❌ **Using `any` or `unknown` types**
✅ Always use proper, specific type definitions (ESLint enforces this)

❌ **Nested ternaries**
✅ Extract to computed values or functions

❌ **Floating promises** (not awaiting async calls)
✅ Always await async operations or handle promises properly (ESLint enforces this)

❌ **Using `console.log` for debugging**
✅ Remove debug logs or use `console.warn`/`console.error` (ESLint warns about this)

❌ **Missing return types on functions**
✅ Explicitly type all function returns (ESLint enforces this)

## Firebase Specific Guidelines

### Hosting (Static Adapter)

- All routes must be pre-rendered or use SvelteKit's static adapter
- No server-side rendering at runtime
- Use `export const prerender = true` when needed
- Configure proper 404 handling in `firebase.json`
- **All runtime assets (images, icons, fonts) must be in `static/` folder**
- Files in `static/` are copied to the build output root
- Reference static assets with absolute paths: `/icons/file.svg` not `$lib/assets/icons/file.svg`

### Functions

- Keep functions focused and single-purpose
- Use proper error handling and logging
- Set appropriate timeout and memory limits
- Test locally with Firebase emulators

### Firestore

- Design collections for scalability
- Avoid deep nesting (max 2-3 levels)
- Use subcollections appropriately
- Implement pagination for large datasets

## Questions to Ask Before Coding

1. **Does a similar component/utility already exist?**
2. **Can this be broken into smaller pieces?**
3. **Is this logic repeated elsewhere?**
4. **What are the type definitions needed?**
5. **How will this be tested?**
6. **What are the accessibility requirements?**
7. **What are the performance implications?**
8. **Is the naming clear and self-documenting?**
9. **Where does this fit in the folder structure?**

## Resources

- [SvelteKit Documentation](https://kit.svelte.dev/docs)
- [Svelte 5 Documentation](https://svelte.dev/docs/svelte/overview)
- [Firebase Documentation](https://firebase.google.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- Project Documentation:
  - [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture
  - [CONVENTIONS.md](CONVENTIONS.md) - Coding standards and ESLint rules
  - [COMPONENT_STANDARDS.md](COMPONENT_STANDARDS.md) - Component guidelines
  - [DEVELOPMENT.md](DEVELOPMENT.md) - Local development setup
  - [DEPLOYMENT.md](DEPLOYMENT.md) - Production deployment

## Conclusion

The goal is to create a maintainable, scalable, and high-quality codebase. When in doubt:
- **Keep it simple**
- **Keep it small**
- **Keep it DRY**
- **Keep it typed**
- **Keep it documented**

These guidelines should be followed consistently to ensure long-term project health and developer productivity.
