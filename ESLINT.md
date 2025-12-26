# ESLint Configuration

This project uses strict ESLint rules to enforce code quality and type safety.

## Quick Reference

### Before Committing

Always run all quality checks:
```bash
npm run validate
```

This runs:
1. **Prettier** - Formatting check
2. **ESLint** - Code quality and type safety
3. **svelte-check** - Svelte component validation
4. **TypeScript** - Type compilation check

All must pass before committing.

### Key Rules

#### Type Safety (All Errors)
- ❌ `any` type is not allowed
- ❌ Unsafe operations on `any` values blocked
- ✅ All function return types must be explicit
- ✅ All variables must be properly typed

#### Import Rules (All Errors)
- ✅ Use `import type { ... }` for type-only imports
- ❌ Cannot mix type and value imports

#### Async/Promise Safety (All Errors)
- ❌ Floating promises (unawaited) are not allowed
- ❌ Cannot await non-promises
- ❌ Promises misused in conditionals/callbacks blocked
- ✅ Must properly handle all async operations

#### Code Quality
- ⚠️ `console.log` triggers warnings (remove before committing)
- ✅ `console.warn` and `console.error` are allowed
- ✅ Must use `const` for non-reassigned variables
- ✅ Must use strict equality (`===`)
- ✅ Must use template literals over concatenation

## Common Violations and Fixes

### 1. Using `any` Type

```typescript
// ❌ Error
function process(data: any): any {
  return data.value;
}

// ✅ Fix
function process(data: UserData): string {
  return data.value;
}
```

### 2. Missing Return Type

```typescript
// ❌ Error
function calculateTotal(items: Item[]) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ✅ Fix
function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

### 3. Floating Promise

```typescript
// ❌ Error
function loadData(): void {
  fetchUser('123'); // Not awaited!
}

// ✅ Fix - Option 1: Await
async function loadData(): Promise<void> {
  await fetchUser('123');
}

// ✅ Fix - Option 2: Handle with .then/.catch
function loadData(): void {
  fetchUser('123')
    .then(user => console.log(user))
    .catch(error => console.error(error));
}

// ✅ Fix - Option 3: Explicitly ignore
function loadData(): void {
  void fetchUser('123');
}
```

### 4. Wrong Import Type Syntax

```typescript
// ❌ Error
import { User } from '$lib/types/User';

// ✅ Fix
import type { User } from '$lib/types/User';
```

### 5. Console.log Statement

```typescript
// ⚠️ Warning
console.log('Debug info:', data);

// ✅ Fix - Remove or use appropriate level
console.warn('Deprecated API used');
console.error('Failed to load:', error);
```

### 6. Unused Variables

```typescript
// ❌ Error
function process(data: Data, _unusedParam: string): void {
  return data.value;
}

// ✅ Fix - Prefix with underscore if intentionally unused
function process(data: Data, _unusedParam: string): void {
  return data.value;
}

// ✅ Better - Remove if truly unused
function process(data: Data): void {
  return data.value;
}
```

## Complete Rule List

### Type Safety Rules
```javascript
'@typescript-eslint/no-explicit-any': 'error'
'@typescript-eslint/no-unsafe-assignment': 'error'
'@typescript-eslint/no-unsafe-member-access': 'error'
'@typescript-eslint/no-unsafe-call': 'error'
'@typescript-eslint/no-unsafe-return': 'error'
'@typescript-eslint/no-unsafe-argument': 'error'
'@typescript-eslint/explicit-function-return-type': 'error'
```

### Async/Promise Rules
```javascript
'@typescript-eslint/no-floating-promises': 'error'
'@typescript-eslint/await-thenable': 'error'
'@typescript-eslint/no-misused-promises': 'error'
'@typescript-eslint/require-await': 'error'
```

### Import Rules
```javascript
'@typescript-eslint/consistent-type-imports': 'error'
'@typescript-eslint/no-import-type-side-effects': 'error'
```

### Code Quality Rules
```javascript
'@typescript-eslint/no-unused-vars': 'error'
'@typescript-eslint/no-unnecessary-type-assertion': 'error'
'@typescript-eslint/prefer-nullish-coalescing': 'error'
'@typescript-eslint/prefer-optional-chain': 'error'
'no-console': 'warn' (allows warn/error)
'eqeqeq': 'error'
'prefer-const': 'error'
'no-var': 'error'
'prefer-template': 'error'
```

## Disabling Rules (Not Recommended)

If you absolutely must disable a rule for a specific line:

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const legacyData: any = oldApiCall();
```

**However**, this should be extremely rare. If you find yourself disabling rules frequently, the types should be properly defined instead.

## Why These Rules?

- **Type Safety**: Prevents runtime type errors by enforcing proper TypeScript usage
- **Async Safety**: Prevents bugs from unhandled promises and race conditions
- **Code Quality**: Enforces modern JavaScript patterns and catches common mistakes
- **Maintainability**: Makes code more predictable and easier to refactor

## Resources

- Full config: `svelte-app/eslint.config.js`
- TypeScript ESLint docs: https://typescript-eslint.io/
- Project conventions: `CONVENTIONS.md`
- AI guidelines: `agents.md`

## Development Workflow

1. Make changes to code
2. Run `npm run format` to auto-fix formatting
3. Run `npm run validate` to check all quality rules
4. Fix any errors reported
5. Commit your changes

CI/CD will automatically run `npm run validate` on all PRs and merges.
