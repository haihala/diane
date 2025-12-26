# Project Architecture

## Overview

Diane is a SvelteKit-based static web application deployed on Firebase, following modern web development best practices with a focus on component composability and maintainability.

## Technology Stack

### Frontend
- **Framework**: SvelteKit 2.x with Svelte 5
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: Scoped CSS with global CSS variables
- **Linting**: ESLint 9.x with svelte-plugin
- **Formatting**: Prettier with svelte-plugin

### Backend
- **Functions**: Firebase Functions (Python-based)
- **Database**: Firestore
- **Storage**: Firebase Storage
- **Authentication**: Firebase Auth (when implemented)

### Deployment
- **Hosting**: Firebase Hosting
- **Adapter**: @sveltejs/adapter-static
- **Strategy**: Static site generation (SSG)

## Directory Structure

```
diane/
├── svelte-app/                 # Frontend SvelteKit application
│   ├── src/
│   │   ├── lib/               # Shared library code
│   │   │   ├── components/    # Reusable UI components
│   │   │   ├── state/         # Svelte 5 runes (global state)
│   │   │   ├── utils/         # Utility functions
│   │   │   ├── services/      # API clients and services
│   │   │   ├── types/         # TypeScript type definitions
│   │   │   ├── constants/     # Application constants
│   │   │   ├── assets/        # Static assets
│   │   │   └── index.ts       # Public API exports
│   │   ├── routes/            # SvelteKit file-based routing
│   │   │   ├── (app)/         # Main app routes (route group)
│   │   │   ├── (auth)/        # Auth routes (route group)
│   │   │   ├── api/           # API endpoints (optional)
│   │   │   ├── +layout.svelte # Root layout
│   │   │   ├── +layout.ts     # Root layout load function
│   │   │   ├── +page.svelte   # Home page
│   │   │   └── +error.svelte  # Error page
│   │   ├── app.html           # HTML template
│   │   ├── app.css            # Global styles and CSS variables
│   │   └── app.d.ts           # App type definitions
│   ├── static/                # Static files (copied as-is)
│   ├── tests/                 # Test files
│   │   ├── unit/
│   │   └── e2e/
│   ├── package.json
│   ├── vite.config.ts
│   ├── svelte.config.js
│   └── tsconfig.json
├── functions/                  # Firebase Functions (Python)
│   ├── main.py                # Cloud Functions entry point
│   ├── requirements.txt       # Python dependencies
│   └── ...                    # Additional function modules
├── firebase.json              # Firebase configuration
├── firestore.rules           # Firestore security rules
├── firestore.indexes.json    # Firestore index definitions
├── storage.rules             # Storage security rules
├── agents.md                 # AI agent guidelines
├── ARCHITECTURE.md           # This file
└── README.md                 # Project documentation
```

## Component Architecture

### Component Organization

Organize components logically by feature or complexity. Keep components:
- **Small and focused** (< 200 lines)
- **Reusable and composable**
- **Self-contained with minimal dependencies**

Group related components together in feature folders when it makes sense, or keep them flat if the structure is simple.

### Component Communication

#### Props (Parent → Child)
Primary method for passing data down:
```typescript
<ChildComponent data={parentData} onAction={handleAction} />
```

#### Events (Child → Parent)
Use callback props for child-to-parent communication:
```typescript
interface Props {
  onSubmit?: (data: FormData) => void;
}
```

#### State Modules (Global State)
For cross-cutting concerns using Svelte 5 runes:
```typescript
// state/auth.svelte.ts
import type { User } from '$lib/types/User';

let currentUser = $state<User | null>(null);

export function authState() {
  return {
    get user() { return currentUser; },
    set user(value: User | null) { currentUser = value; }
  };
}
```

#### Context API (Nested Components)
For deeply nested component trees:
```typescript
// Parent
setContext('theme', themeState);

// Deep child
const theme = getContext<ThemeState>('theme');
```

## Data Flow Patterns

### Loading Data

**Page Load Functions** (`+page.ts`):
```typescript
export async function load({ fetch }) {
  const data = await fetch('/api/data').then(r => r.json());
  return { data };
}
```

**Component-Level Loading**:
```svelte
<script>
  import { onMount } from 'svelte';
  
  let data = $state([]);
  
  onMount(async () => {
    data = await fetchData();
  });
</script>
```

### State Management

**Local State** (Svelte 5 runes):
```typescript
let count = $state(0);
let doubled = $derived(count * 2);
```

**Global State** (Runes):
```typescript
// state/cart.svelte.ts
import type { CartItem } from '$lib/types/Cart';

let items = $state<CartItem[]>([]);
let total = $derived(items.reduce((sum, item) => sum + item.price, 0));

export function cartState() {
  return {
    get items() { return items; },
    get total() { return total; },
    addItem(item: CartItem) { items = [...items, item]; }
  };
}
```

### Firebase Integration

**Service Layer Pattern**:
```typescript
// services/firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

export const app = initializeApp(config);
export const db = getFirestore(app);

// services/users.ts
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import type { User } from '$lib/types/User';

export async function getUsers(): Promise<User[]> {
  const snapshot = await getDocs(collection(db, 'users'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
}
```

## Routing Architecture

### File-Based Routing

SvelteKit uses file-based routing in `src/routes/`:

```
routes/
├── +layout.svelte          # Root layout (wraps all pages)
├── +layout.ts              # Root layout data loading
├── +page.svelte            # Home page (/)
├── about/
│   └── +page.svelte        # About page (/about)
├── blog/
│   ├── +page.svelte        # Blog list (/blog)
│   └── [slug]/
│       └── +page.svelte    # Blog post (/blog/post-slug)
└── (app)/                  # Route group (doesn't affect URL)
    ├── +layout.svelte      # Layout for app pages only
    └── dashboard/
        └── +page.svelte    # Dashboard (/dashboard)
```

### Route Groups

Use parentheses for grouping without affecting URLs:
- `(auth)/login` → `/login`
- `(auth)/register` → `/register`
- Both share `(auth)/+layout.svelte`

### Pre-rendering

Since we use the static adapter, configure pre-rendering:

```typescript
// +page.ts
export const prerender = true; // Pre-render this page
```

## Type System

### Type Organization

```
lib/types/
├── index.ts          # Re-exports all types
├── User.ts           # User-related types
├── Product.ts        # Product types
├── Api.ts            # API response types
└── Common.ts         # Shared utility types
```

### Type Patterns

**Entity Types**:
```typescript
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}
```

**Props Types** (co-located with components):
```typescript
// In component file
interface Props {
  user: User;
  editable?: boolean;
}
```

**Service Types**:
```typescript
export type ApiResponse<T> = {
  data: T;
  error?: string;
};
```

## Build & Deployment

### Development
```bash
cd svelte-app
npm run dev
```

### Quality Checks
```bash
# Run all quality checks (required before committing)
npm run validate

# Auto-fix formatting
npm run format

# Individual checks
npm run lint      # Prettier + ESLint
npm run check     # Svelte validation
```

### Production Build
```bash
npm run build      # Builds static site to svelte-app/build/
```

### Deployment
```bash
firebase deploy    # Deploys to Firebase Hosting
```

### CI/CD

GitHub Actions workflows automatically:
- Run `npm run validate` on all PRs and merges
- Build and deploy preview for PRs (`firebase-hosting-pull-request.yml`)
- Build and deploy production on merge to main (`firebase-hosting-merge.yml`)

All code must pass validation before it can be deployed.

## Performance Considerations

### Code Splitting
- SvelteKit automatically code-splits by route
- Use dynamic imports for large dependencies:
  ```typescript
  const module = await import('heavy-library');
  ```

### Bundle Size
- Keep components small
- Tree-shake unused code
- Analyze bundle with `vite-bundle-visualizer`

### Image Optimization
- Use modern formats (WebP, AVIF)
- Implement lazy loading
- Serve appropriately sized images

### Caching Strategy
- Configure Firebase Hosting cache headers in `firebase.json`
- Use SvelteKit's cache control
- Leverage browser caching for static assets

## Security

### Firestore Rules
Define security rules in `firestore.rules`:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
  }
}
```

### Storage Rules
Define in `storage.rules`:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /uploads/{userId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
  }
}
```

### Environment Variables
Store sensitive config in `.env` files (not committed):
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_PROJECT_ID=...
```

Access in code:
```typescript
import { env } from '$env/dynamic/public';
const apiKey = env.VITE_FIREBASE_API_KEY;
```

## Testing Strategy

### Unit Tests
- Test utility functions
- Test business logic
- Use Vitest or Jest
- Focus on pure functions and logic

### E2E Tests
- Test critical user paths
- Use Playwright or Cypress
- Test complete user workflows

## Scalability Considerations

### Component Scalability
- Keep components small and focused
- Extract shared logic early
- Use composition to build complex UIs

### Data Scalability
- Implement pagination for large datasets
- Use Firestore query limits
- Consider data denormalization when appropriate

### Code Organization
- Use route groups to organize features
- Keep related code together
- Extract shared code to `lib/`

## Migration Path

As the project grows:

1. **Add State Management**: Expand rune-based state modules
2. **Add Testing**: Set up Vitest/Playwright
3. **Add Monitoring**: Firebase Analytics, Sentry
4. **Add Auth**: Implement Firebase Authentication
5. **Add Database**: Expand Firestore schema
6. **Add CMS**: Consider headless CMS integration

## Best Practices Summary

1. **Keep components small and focused** (< 200 lines)
2. **Use TypeScript everywhere** - never use `any` or `unknown`
3. **Extract duplicated code immediately**
4. **Organize files logically by feature/type**
5. **Write clear, self-documenting code**
6. **Test critical paths**
7. **Optimize for performance**
8. **Secure with proper rules**
9. **Use global CSS variables for theming**
10. **Leverage Svelte 5 runes for state**

---

This architecture is designed to scale with your project while maintaining code quality and developer productivity.
