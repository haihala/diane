# Coding Conventions

This document outlines naming conventions, code style, and best practices for the Diane project.

## Table of Contents
- [File Naming](#file-naming)
- [Code Naming](#code-naming)
- [TypeScript Conventions](#typescript-conventions)
- [Svelte Conventions](#svelte-conventions)
- [Import Organization](#import-organization)
- [Code Style](#code-style)
- [Comments and Documentation](#comments-and-documentation)
- [Git Conventions](#git-conventions)

## File Naming

### Components
**Format**: `PascalCase.svelte`

```
✅ Button.svelte
✅ UserProfile.svelte
✅ NavigationBar.svelte

❌ button.svelte
❌ user-profile.svelte
❌ navigation_bar.svelte
```

### Utilities and Services
**Format**: `camelCase.ts`

```
✅ formatDate.ts
✅ apiClient.ts
✅ validateEmail.ts

❌ FormatDate.ts
❌ format-date.ts
❌ format_date.ts
```

### Types
**Format**: `PascalCase.ts` or grouped as `types.ts`

```
✅ User.ts
✅ Product.ts
✅ types.ts
✅ apiTypes.ts

❌ user.ts (unless exporting utilities)
❌ user-types.ts
```

### Constants
**Format**: `camelCase.ts` or `constants.ts`

```
✅ constants.ts
✅ apiConstants.ts
✅ themeConstants.ts

❌ CONSTANTS.ts
❌ Constants.ts
```

### Routes
**Format**: SvelteKit conventions

```
✅ +page.svelte
✅ +page.ts
✅ +layout.svelte
✅ +layout.ts
✅ +error.svelte
✅ +server.ts
```

### Test Files
**Format**: Match source file with `.test.ts` or `.spec.ts`

```
✅ Button.test.ts
✅ formatDate.test.ts
✅ apiClient.spec.ts
```

## Code Naming

### Variables and Functions
**Format**: `camelCase`

```typescript
// ✅ Good
const userName = 'John';
let itemCount = 0;
function calculateTotal(items: Item[]): number { }
const handleClick = () => { };

// ❌ Bad
const UserName = 'John';
const user_name = 'John';
function CalculateTotal() { }
```

### Constants
**Format**: `SCREAMING_SNAKE_CASE` for true constants, `camelCase` for config objects

```typescript
// ✅ Good - True constants
const MAX_RETRY_COUNT = 3;
const API_BASE_URL = 'https://api.example.com';
const DEFAULT_TIMEOUT = 5000;

// ✅ Good - Config objects
const apiConfig = {
  baseUrl: 'https://api.example.com',
  timeout: 5000,
  retries: 3
};

// ❌ Bad
const maxRetryCount = 3;  // Should be uppercase
const API_CONFIG = { };   // Should be camelCase
```

### Classes and Interfaces
**Format**: `PascalCase`

```typescript
// ✅ Good
interface User {
  id: string;
  name: string;
}

class UserService {
  async getUser(id: string): Promise<User> { }
}

type ApiResponse<T> = {
  data: T;
  error?: string;
};

// ❌ Bad
interface user { }
class userService { }
type apiResponse = { };
```

### Type Parameters
**Format**: Single uppercase letter or PascalCase starting with `T`

```typescript
// ✅ Good
function identity<T>(value: T): T { }
function map<TInput, TOutput>(items: TInput[]): TOutput[] { }
interface Response<TData> { }

// ❌ Bad
function identity<t>(value: t): t { }
function map<Input, Output>() { }
```

### Boolean Variables
**Format**: Start with `is`, `has`, `should`, `can`

```typescript
// ✅ Good
let isLoading = false;
let hasError = false;
let shouldRender = true;
let canEdit = true;

// ❌ Bad
let loading = false;
let error = false;
let render = true;
```

### Event Handlers
**Format**: `handle` + `EventName`

```typescript
// ✅ Good
function handleClick() { }
function handleSubmit(e: Event) { }
function handleInputChange(value: string) { }

// ❌ Bad
function onClick() { }
function submit() { }
function change() { }
```

### Private Properties/Methods
**Format**: Prefix with underscore (TypeScript private keyword preferred)

```typescript
// ✅ Best - Use private keyword
class Service {
  private apiKey: string;
  private async fetchData() { }
}

// ✅ Acceptable - Underscore convention
class Service {
  _apiKey: string;
  _fetchData() { }
}

// ❌ Bad
class Service {
  apiKey: string;  // Looks public but should be private
}
```

## TypeScript Conventions

### Type Definitions

```typescript
// ✅ Good - Explicit and clear
interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

function getUser(id: string): Promise<User | null> {
  // Implementation
}

// ❌ Bad - Using any
function getUser(id: any): Promise<any> {
  // Implementation
}
```

### Use Interfaces for Objects, Types for Unions

```typescript
// ✅ Good
interface User {
  id: string;
  name: string;
}

type Status = 'pending' | 'active' | 'inactive';
type ApiResponse<T> = { data: T } | { error: string };

// Acceptable but less conventional
type User = {
  id: string;
  name: string;
};
```

### Never Use any or unknown

ESLint strictly enforces this with multiple rules:

```typescript
// ❌ Bad - Using any (ESLint error)
function getUser(id: any): Promise<any> {
  // Implementation
}

// ❌ Bad - Using unknown (cannot safely use)
function processData(data: unknown): void {
  // Implementation
}

// ✅ Good - Proper types
function getUser(id: string): Promise<User | null> {
  // Implementation
}

function processData(data: UserData | ProductData): void {
  // Implementation with proper types
}

// ✅ Good - Define proper types for all cases
type ApiData = UserData | ProductData | OrderData;

function handleApiResponse(data: ApiData): void {
  if ('userId' in data) {
    // Handle UserData
  } else if ('productId' in data) {
    // Handle ProductData
  }
}
```

**ESLint Rules Enforcing This**:
- `@typescript-eslint/no-explicit-any` - Error on `any`
- `@typescript-eslint/no-unsafe-assignment` - Error on unsafe assignments
- `@typescript-eslint/no-unsafe-member-access` - Error on accessing `any` members
- `@typescript-eslint/no-unsafe-call` - Error on calling `any` functions
- `@typescript-eslint/no-unsafe-return` - Error on returning `any`
- `@typescript-eslint/no-unsafe-argument` - Error on passing `any` as argument

### Null/Undefined Handling

```typescript
// ✅ Good - Explicit optional
interface Props {
  user?: User;  // Can be undefined
  onSave?: (user: User) => void;  // Optional callback
}

// ✅ Good - Explicit nullable
function findUser(id: string): User | null {
  // Return null if not found
}

// ✅ Good - Optional chaining
const userName = user?.name;
const email = user?.contact?.email;

// ❌ Bad - Non-null assertion without check
const userName = user!.name;
```

### Explicit Function Return Types

ESLint requires explicit return types on all functions:

```typescript
// ❌ Bad - No return type (ESLint error)
function calculateTotal(items: Item[]) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ✅ Good - Explicit return type
function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ✅ Good - Arrow function with return type
const formatUser = (user: User): string => {
  return `${user.firstName} ${user.lastName}`;
};

// ✅ Good - Async function with Promise return type
async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}
```

**ESLint Rule**: `@typescript-eslint/explicit-function-return-type`

### Async/Promise Safety

ESLint enforces proper handling of promises:

```typescript
// ❌ Bad - Floating promise (ESLint error)
function loadData(): void {
  fetchUser('123'); // Promise not awaited or handled
}

// ✅ Good - Awaited promise
async function loadData(): Promise<void> {
  await fetchUser('123');
}

// ✅ Good - Promise handled with .then()
function loadData(): void {
  fetchUser('123').then(user => {
    console.log(user);
  }).catch(error => {
    console.error(error);
  });
}

// ✅ Good - Explicitly ignored
function loadData(): void {
  void fetchUser('123'); // Explicitly mark as intentionally ignored
}
```

**ESLint Rules**:
- `@typescript-eslint/no-floating-promises` - Error on unhandled promises
- `@typescript-eslint/await-thenable` - Only await promises
- `@typescript-eslint/no-misused-promises` - Catch promise misuse
- `@typescript-eslint/require-await` - Remove unnecessary async

### Generic Constraints

```typescript
// ✅ Good - Constrained generics
function getProperty<T extends object, K extends keyof T>(
  obj: T,
  key: K
): T[K] {
  return obj[key];
}

interface HasId {
  id: string;
}

function findById<T extends HasId>(items: T[], id: string): T | undefined {
  return items.find(item => item.id === id);
}

// ❌ Bad - Using any or unknown
function getProperty(obj: any, key: string): any {
  return obj[key];
}

function handleData(data: unknown) {
  // Bad - can't do anything with unknown
}
```

## Svelte Conventions

### Script Organization

```svelte
<script lang="ts">
  // 1. Imports - external first, then internal
  import { onMount } from 'svelte';
  import ExternalLib from 'external-lib';
  
  import Button from '$lib/components/Button.svelte';
  import type { User } from '$lib/types/User';
  import { formatDate } from '$lib/utils/formatDate';
  
  // 2. Props interface and destructuring
  interface Props {
    user: User;
    editable?: boolean;
  }
  
  let { user, editable = false }: Props = $props();
  
  // 3. State variables
  let isEditing = $state(false);
  let formData = $state({ ...user });
  
  // 4. Derived values
  let fullName = $derived(`${user.firstName} ${user.lastName}`);
  let canSave = $derived(isEditing && formData !== user);
  
  // 5. Reactive effects
  $effect(() => {
    console.log('User changed:', user);
  });
  
  // 6. Functions
  function handleEdit() {
    isEditing = true;
  }
  
  function handleSave() {
    // Save logic
    isEditing = false;
  }
  
  // 7. Lifecycle
  onMount(() => {
    // Setup code
  });
</script>
```

### Component Props

```svelte
<script lang="ts">
  // ✅ Good - Clear interface
  interface Props {
    title: string;
    subtitle?: string;
    variant?: 'primary' | 'secondary';
    onclick?: () => void;
  }
  
  let { 
    title,
    subtitle,
    variant = 'primary',
    onclick
  }: Props = $props();
  
  // ❌ Bad - No types
  let { title, subtitle, variant, onclick } = $props();
</script>
```

### Reactive State (Svelte 5)

```svelte
<script lang="ts">
  // ✅ Good - Use runes
  let count = $state(0);
  let doubled = $derived(count * 2);
  
  $effect(() => {
    console.log('Count changed:', count);
  });
  
  // ❌ Bad - Old Svelte syntax (don't use in Svelte 5)
  let count = 0;
  $: doubled = count * 2;
  $: console.log('Count changed:', count);
</script>
```

### Event Handling

```svelte
<!-- ✅ Good - Inline for simple cases -->
<button onclick={() => count++}>Increment</button>

<!-- ✅ Good - Function reference for complex cases -->
<button onclick={handleClick}>Click me</button>

<!-- ✅ Good - With parameters -->
<button onclick={() => handleDelete(item.id)}>Delete</button>

<!-- ❌ Bad - Don't call immediately -->
<button onclick={handleClick()}>Click me</button>
```

### Conditional Rendering

```svelte
<!-- ✅ Good - Clear conditions -->
{#if isLoading}
  <Spinner />
{:else if error}
  <ErrorMessage {error} />
{:else if data}
  <DataDisplay {data} />
{:else}
  <EmptyState />
{/if}

<!-- ✅ Good - Simple boolean -->
{#if user}
  <UserProfile {user} />
{/if}

<!-- ❌ Bad - Complex inline logic -->
{#if items && items.length > 0 && !isLoading && !error}
  <!-- Extract to derived variable -->
{/if}
```

### List Rendering

```svelte
<!-- ✅ Good - With key -->
{#each items as item (item.id)}
  <ItemCard {item} />
{/each}

<!-- ✅ Good - With index when needed -->
{#each items as item, index (item.id)}
  <div>#{index + 1}: {item.name}</div>
{/each}

<!-- ⚠️ Acceptable - No key for static lists -->
{#each colors as color}
  <div>{color}</div>
{/each}

<!-- ❌ Bad - Using index as key for dynamic lists -->
{#each items as item, index (index)}
  <ItemCard {item} />
{/each}
```

## Import Organization

### Order of Imports

ESLint enforces consistent type imports:

```typescript
// 1. Node/Svelte built-ins
import { onMount } from 'svelte';
import { browser } from '$app/environment';

// 2. External dependencies
import axios from 'axios';
import { format } from 'date-fns';

// 3. Internal components (absolute imports)
import Button from '$lib/components/Button.svelte';
import Header from '$lib/components/Header.svelte';

// 4. Internal utilities/services
import { apiClient } from '$lib/services/apiClient';
import { formatDate } from '$lib/utils/formatDate';

// 5. Types - MUST use 'import type' syntax (ESLint enforces)
import type { User } from '$lib/types/User';
import type { ApiResponse } from '$lib/types/Api';

// 6. Styles (if needed)
import './styles.css';
```

**ESLint Rules**:
- `@typescript-eslint/consistent-type-imports` - Requires `import type` for types
- `@typescript-eslint/no-import-type-side-effects` - Prevents side effects in type imports

### Path Aliases

```typescript
// ✅ Good - Use path aliases
import Button from '$lib/components/Button.svelte';
import { formatDate } from '$lib/utils/formatDate';
import type { User } from '$lib/types/User';

// ❌ Bad - Relative paths for lib imports
import Button from '../../../lib/components/Button.svelte';
```

### Named vs Default Exports

```typescript
// ✅ Preferred - Named exports
// utils/formatDate.ts
export function formatDate(date: Date): string { }
export function parseDate(str: string): Date { }

// Usage
import { formatDate, parseDate } from '$lib/utils/formatDate';

// ✅ Acceptable - Default for components
// Button.svelte
export default Button;

// Usage
import Button from '$lib/components/Button.svelte';

// ❌ Bad - Mixing without reason
export default function formatDate() { }
export function parseDate() { }
```

## Code Style

### Indentation
- Use **tabs** for indentation (as per project config)
- Consistent with Prettier configuration

### Line Length
- Prefer **80-100 characters** max
- Break long lines logically
- Prettier handles this automatically

### Spacing

```typescript
// ✅ Good
function calculate(a: number, b: number): number {
  const result = a + b;
  return result;
}

if (condition) {
  doSomething();
}

const obj = { name: 'John', age: 30 };
const arr = [1, 2, 3];

// ❌ Bad
function calculate(a:number,b:number):number{
  const result=a+b;
  return result;
}

if(condition){
  doSomething();
}
```

### Quotes
- **Single quotes** for strings (Prettier default)
- **Template literals** for interpolation

```typescript
// ✅ Good
const name = 'John';
const greeting = `Hello, ${name}!`;

// ❌ Bad
const name = "John";
const greeting = 'Hello, ' + name + '!';
```

### Semicolons
- **Use semicolons** (Prettier adds them)

```typescript
// ✅ Good
const x = 1;
const y = 2;

// ❌ Bad (auto-fixed by Prettier)
const x = 1
const y = 2
```

### Object and Array Formatting

```typescript
// ✅ Good - Short objects inline
const point = { x: 10, y: 20 };

// ✅ Good - Long objects multiline
const user = {
  id: '123',
  name: 'John Doe',
  email: 'john@example.com',
  createdAt: new Date()
};

// ✅ Good - Trailing commas (easier diffs)
const items = [
  'item1',
  'item2',
  'item3',
];
```

### Function Declarations

```typescript
// ✅ Good - Named function
function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ✅ Good - Arrow function for callbacks
const handleClick = () => {
  console.log('clicked');
};

// ✅ Good - Concise arrow function
const double = (x: number) => x * 2;

// ❌ Bad - Unnecessary arrow function
const calculateTotal = (items: Item[]): number => {
  return items.reduce((sum, item) => sum + item.price, 0);
};  // Just use function declaration
```

## Comments and Documentation

### Prefer Self-Documenting Code

Avoid verbose documentation. Use clear names and types to make code self-explanatory.

```typescript
// ❌ Bad - Obvious documentation
/**
 * Formats a date for display using the specified locale
 * 
 * @param date - The date to format (Date object or ISO string)
 * @param locale - The locale code (default: 'en-US')
 * @returns Formatted date string
 * 
 * @example
 * formatDate(new Date(), 'en-US') // "Jan 1, 2024"
 */
export function formatDate(date: Date | string, locale = 'en-US'): string {
  // Implementation
}

// ✅ Good - Self-documenting with types
export function formatDate(date: Date | string, locale = 'en-US'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString(locale);
}
```

### Only Comment When Necessary

```typescript
// ✅ Good - Explains non-obvious reasoning
// Cache user preferences to avoid repeated Firebase reads
const cachedPrefs = localStorage.getItem('prefs');

// ✅ Good - Explains complex algorithm
// Boyer-Moore algorithm for efficient string searching
const index = boyerMooreSearch(text, pattern);

// ✅ Good - Documents workaround
// HACK: Firebase SDK doesn't support this yet, so we use REST API
const data = await fetch(firebaseRestUrl);

// ❌ Bad - Obvious from code
// Increment counter
counter++;

// ❌ Bad - Commented out code (delete it)
// const oldFunction = () => { };
```

### TODO Comments

```typescript
// TODO: Add retry logic for failed requests
// FIXME: Race condition when multiple users edit simultaneously
// NOTE: This runs on every render - consider memoization
```

### Console Statements

ESLint warns about `console.log` - use for debugging only and remove before committing:

```typescript
// ❌ Bad - Will trigger ESLint warning
console.log('User data:', user);

// ✅ Good - Allowed for warnings/errors
console.warn('Deprecated function called');
console.error('Failed to fetch user:', error);

// ✅ Good - Remove console.log before committing
```

**ESLint Rule**: `no-console` (warns on `console.log`, allows `warn`/`error`)

## ESLint Summary

Run before committing:

```bash
npm run validate
```

This comprehensive check includes:
- **Prettier**: Code formatting
- **ESLint**: All code quality rules
- **svelte-check**: Svelte component validation  
- **TypeScript**: Type compilation

**Key Rules**:
- ❌ No `any` or unsafe type operations
- ✅ Explicit function return types required
- ✅ `import type` syntax for types
- ❌ No floating promises
- ❌ No `console.log` (warnings only)
- ✅ Modern JavaScript patterns enforced

See `eslint.config.js` for complete rule list.

## Git Conventions

### Commit Messages

**Format**: `type: brief description`

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code restructuring without behavior change
- `docs`: Documentation changes
- `style`: Code style/formatting changes
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples**:
```
✅ feat: add user authentication flow
✅ fix: resolve infinite loop in data fetching
✅ refactor: extract form validation to utility
✅ docs: update component usage examples
✅ style: format files with Prettier
✅ test: add unit tests for formatDate utility
✅ chore: update dependencies

❌ Update stuff
❌ Fixed bug
❌ changes
```

### Branch Names

**Format**: `type/brief-description`

```
✅ feature/user-authentication
✅ fix/login-validation-error
✅ refactor/component-structure
✅ docs/api-documentation

❌ new-feature
❌ fix
❌ my-branch
```

## Linting and Formatting

### Run Before Committing

```bash
# Auto-fix formatting issues
npm run format

# Run all quality checks (required before commit)
npm run validate
```

The `validate` command runs:
1. Prettier formatting check
2. ESLint with strict rules
3. Svelte component validation
4. TypeScript type checking

### Individual Commands

```bash
# Just format check + ESLint
npm run lint

# Just Svelte validation
npm run check

# Watch mode for Svelte validation
npm run check:watch
```

### Editor Setup

Configure your editor to:
- Use project's Prettier config
- Use project's ESLint config
- Format on save
- Show TypeScript errors inline

---

Following these conventions ensures code consistency, readability, and maintainability across the project. When in doubt, follow existing patterns in the codebase and refer to these guidelines.
