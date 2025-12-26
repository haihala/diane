# Diane - SvelteKit App

A SvelteKit static site application deployed on Firebase Hosting.

## Tech Stack

- **SvelteKit 2.x** with Svelte 5
- **TypeScript** (strict mode)
- **Firebase Hosting** (static adapter)
- **Vite** build tool
- **ESLint** (strict rules for code quality)
- **Prettier** for formatting

## Getting Started

Install dependencies:

```sh
npm install
```

Start development server:

```sh
npm run dev

# or open in browser
npm run dev -- --open
```

## Development Workflow

### Before Committing

**Always run the validation command**:

```sh
npm run validate
```

This runs all quality checks:
1. **Prettier** - Code formatting verification
2. **ESLint** - Code quality and type safety rules
3. **svelte-check** - Svelte component validation
4. **TypeScript** - Type compilation check

All checks must pass before committing code.

### Auto-fix Formatting

```sh
npm run format
```

### Individual Checks

```sh
npm run lint          # Prettier + ESLint only
npm run check         # Svelte validation only
npm run check:watch   # Svelte validation in watch mode
```

## Building

Create a production build:

```sh
npm run build
```

Preview the production build:

```sh
npm run preview
```

## Deployment

The app is automatically deployed via GitHub Actions:

- **Pull Requests**: Preview deployment to Firebase Hosting
- **Main Branch**: Production deployment to Firebase Hosting

Both workflows run `npm run validate` before building to ensure code quality.

Manual deployment (if needed):

```sh
firebase deploy
```

## Code Quality Standards

This project enforces strict code quality rules:

- ❌ No `any` or `unknown` types allowed
- ✅ Explicit function return types required
- ✅ Type-safe imports with `import type` syntax
- ❌ No floating promises (unhandled async)
- ❌ No `console.log` (use `console.warn`/`console.error`)
- ✅ Modern JavaScript/TypeScript patterns

See project documentation for details:
- `../agents.md` - AI agent guidelines
- `../CONVENTIONS.md` - Coding conventions
- `../ESLINT.md` - ESLint rules reference
- `../COMPONENT_STANDARDS.md` - Component standards
- `../ARCHITECTURE.md` - Project architecture

## Project Structure

```
src/
  lib/
    components/    # Reusable UI components
    state/         # Global state (Svelte 5 runes)
    utils/         # Utility functions
    services/      # API clients
    types/         # TypeScript types
    constants/     # Constants
    assets/        # Static assets
  routes/          # SvelteKit file-based routing
```

## Resources

- [SvelteKit Documentation](https://kit.svelte.dev/docs)
- [Svelte 5 Documentation](https://svelte.dev/docs/svelte/overview)
- [Firebase Documentation](https://firebase.google.com/docs)
