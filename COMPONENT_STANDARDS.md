# Component Standards

This document defines standards for creating, organizing, and maintaining Svelte components in the Diane project.

## Table of Contents
- [Component Structure](#component-structure)
- [Component Organization](#component-organization)
- [Props and TypeScript](#props-and-typescript)
- [Component Patterns](#component-patterns)
- [Styling Guidelines](#styling-guidelines)
- [Accessibility](#accessibility)
- [Performance](#performance)
- [Testing Components](#testing-components)

## Component Structure

### Standard Component Template

```svelte
<script lang="ts">
  import type { ComponentType } from '$lib/types';
  import ChildComponent from './ChildComponent.svelte';
  
  // Props interface
  interface Props {
    propName: Type;
    optionalProp?: Type;
  }
  
  // Destructure props
  let { propName, optionalProp = defaultValue }: Props = $props();
  
  // State
  let internalState = $state(initialValue);
  
  // Derived values
  let computed = $derived(someCalculation);
  
  // Functions
  function handleAction() {
    // Handle action
  }
</script>

<div class="component-name">
  <!-- Content -->
</div>

<style>
  .component-name {
    /* Use global CSS variables */
    padding: var(--spacing-md);
    background: var(--color-bg);
  }
</style>
```

### File Organization

Each component should:
1. Have its own file named in PascalCase
2. Be placed logically within `lib/components/`
3. Include TypeScript types for all props
4. Have scoped styles using global CSS variables
5. Be self-documenting through clear names and types

## Component Organization

Organize components by feature or complexity, not by arbitrary categories.

**Simple Structure**:
```
lib/components/
  Button.svelte
  Input.svelte
  Card.svelte
  Header.svelte
  LoginForm.svelte
```

**Feature-Based** (for larger apps):
```
lib/components/
  ui/
    Button.svelte
    Input.svelte
  auth/
    LoginForm.svelte
    RegisterForm.svelte
  dashboard/
    DashboardHeader.svelte
    MetricsCard.svelte
```

**Guidelines**:
- Keep components under 200 lines
- Extract reusable pieces into separate components
- Group related components together when it makes sense
- Don't over-organize - start simple and refactor as needed

## Props and TypeScript

### Always Define Props Interface

```typescript
// ✅ Good - Explicit types
interface Props {
  user: User;
  editable?: boolean;
  onSave?: (user: User) => void;
}

let { user, editable = false, onSave }: Props = $props();

// ❌ Bad - No types
let { user, editable, onSave } = $props();

// ❌ Bad - Using any or unknown
interface Props {
  data: any;  // Never!
}
```

### Use $bindable for Two-Way Binding

```typescript
interface Props {
  value: string;
  selected?: boolean;
}

let { 
  value,
  selected = $bindable(false)
}: Props = $props();
```

### Provide Defaults

```typescript
interface Props {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
}

let { 
  variant = 'primary',
  size = 'md'
}: Props = $props();
```

### Example: Button Component

```svelte
<script lang="ts">
  interface Props {
    variant?: 'primary' | 'secondary' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
    onclick?: () => void;
  }
  
  let { 
    variant = 'primary',
    size = 'md',
    disabled = false,
    type = 'button',
    onclick,
    children
  }: Props = $props();
</script>

<button 
  class="btn btn-{variant} btn-{size}"
  {type}
  {disabled}
  {onclick}
>
  {@render children()}
</button>

<style>
  .btn {
    border: none;
    border-radius: var(--radius-sm);
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .btn-sm { padding: var(--spacing-xs) var(--spacing-sm); font-size: 0.875rem; }
  .btn-md { padding: var(--spacing-sm) var(--spacing-md); font-size: 1rem; }
  .btn-lg { padding: var(--spacing-md) var(--spacing-lg); font-size: 1.125rem; }
  
  .btn-primary { background: var(--color-primary); color: white; }
  .btn-secondary { background: var(--color-secondary); color: white; }
  .btn-danger { background: var(--color-danger); color: white; }
</style>
```

## Component Patterns

### Composition with Children

Svelte 5 uses snippets for composition:

```svelte
<!-- Card.svelte -->
<script lang="ts">
  interface Props {
    variant?: 'default' | 'bordered';
    children: Snippet;
  }
  
  let { variant = 'default', children }: Props = $props();
</script>

<div class="card card-{variant}">
  {@render children()}
</div>

<!-- Usage -->
<Card variant="bordered">
  <h2>Title</h2>
  <p>Content</p>
</Card>
```

### Named Snippets

```svelte
<!-- List.svelte -->
<script lang="ts">
  interface Props<T> {
    items: T[];
    children: Snippet<[T]>;
  }
  
  let { items, children }: Props = $props();
</script>

{#each items as item}
  {@render children(item)}
{/each}

<!-- Usage -->
<List items={users}>
  {#snippet children(user)}
    <div>{user.name}</div>
  {/snippet}
</List>
```

### Conditional Rendering

```svelte
<script lang="ts">
  let isLoading = $state(false);
  let error = $state<string | null>(null);
  let data = $state<Data | null>(null);
</script>

{#if isLoading}
  <Spinner />
{:else if error}
  <ErrorMessage message={error} />
{:else if data}
  <DataDisplay {data} />
{:else}
  <EmptyState />
{/if}
```

## Styling Guidelines

### Use Scoped Styles with Global Variables

```svelte
<style>
  .container {
    padding: var(--spacing-md);
    background: var(--color-bg);
    border-radius: var(--radius-md);
    color: var(--color-text);
  }
  
  .title {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    margin-bottom: var(--spacing-sm);
  }
</style>
```

### Define Global Variables

In your `app.css` or root stylesheet:

```css
:root {
  /* Colors */
  --color-primary: #3b82f6;
  --color-secondary: #6b7280;
  --color-danger: #ef4444;
  --color-bg: #ffffff;
  --color-text: #1f2937;
  
  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  
  /* Border radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 1rem;
  
  /* Font sizes */
  --font-size-sm: 0.875rem;
  --font-size-md: 1rem;
  --font-size-lg: 1.25rem;
  --font-size-xl: 1.5rem;
  
  /* Font weights */
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-bold: 700;
}
```

### Responsive Design

```svelte
<style>
  .grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--spacing-md);
  }
  
  @media (min-width: 768px) {
    .grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  
  @media (min-width: 1024px) {
    .grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }
</style>
```

## Accessibility

### Semantic HTML

```svelte
<!-- ✅ Good -->
<button onclick={handleClick}>Click me</button>
<nav><a href="/about">About</a></nav>
<main><article>Content</article></main>

<!-- ❌ Bad -->
<div onclick={handleClick}>Click me</div>
<div><span onclick={navigate}>About</span></div>
```

### ARIA Attributes

```svelte
<button
  aria-label="Close dialog"
  aria-pressed={isPressed}
  aria-expanded={isExpanded}
>
  <Icon name="close" />
</button>

<div role="alert" aria-live="polite">
  {message}
</div>
```

### Keyboard Navigation

```svelte
<script lang="ts">
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleAction();
    }
  }
</script>

<div
  role="button"
  tabindex="0"
  onclick={handleAction}
  onkeydown={handleKeydown}
>
  Action
</div>
```

### Focus Management

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  
  let inputRef: HTMLInputElement;
  
  onMount(() => {
    inputRef?.focus();
  });
</script>

<input bind:this={inputRef} />
```

## Performance

### Avoid Expensive Computations in Templates

```svelte
<!-- ❌ Bad -->
{#each items.filter(i => i.active).map(i => transform(i)) as item}
  <div>{item.name}</div>
{/each}

<!-- ✅ Good -->
<script lang="ts">
  let activeItems = $derived(
    items.filter(i => i.active).map(i => transform(i))
  );
</script>

{#each activeItems as item}
  <div>{item.name}</div>
{/each}
```

### Use {#key} for Forced Re-renders

```svelte
{#key userId}
  <UserProfile id={userId} />
{/key}
```

### Lazy Load Heavy Components

```svelte
<script lang="ts">
  let HeavyComponent: typeof import('./Heavy.svelte').default | null = null;
  
  async function loadComponent() {
    const module = await import('./Heavy.svelte');
    HeavyComponent = module.default;
  }
</script>

{#if HeavyComponent}
  <HeavyComponent />
{:else}
  <button onclick={loadComponent}>Load</button>
{/if}
```

## Testing Components

### Unit Testing with Vitest

```typescript
import { render, fireEvent } from '@testing-library/svelte';
import Button from './Button.svelte';
import { describe, it, expect, vi } from 'vitest';

describe('Button', () => {
  it('calls onclick when clicked', async () => {
    const mockFn = vi.fn();
    const { getByRole } = render(Button, { onclick: mockFn });
    
    await fireEvent.click(getByRole('button'));
    
    expect(mockFn).toHaveBeenCalledOnce();
  });
  
  it('applies correct variant class', () => {
    const { getByRole } = render(Button, { variant: 'danger' });
    const button = getByRole('button');
    
    expect(button.classList.contains('btn-danger')).toBe(true);
  });
  
  it('is disabled when disabled prop is true', () => {
    const { getByRole } = render(Button, { disabled: true });
    const button = getByRole('button') as HTMLButtonElement;
    
    expect(button.disabled).toBe(true);
  });
});
```

### Testing User Interactions

```typescript
import { render, fireEvent } from '@testing-library/svelte';
import LoginForm from './LoginForm.svelte';

it('submits form with email and password', async () => {
  const mockSubmit = vi.fn();
  const { getByLabelText, getByRole } = render(LoginForm, { 
    onSubmit: mockSubmit 
  });
  
  const emailInput = getByLabelText('Email') as HTMLInputElement;
  const passwordInput = getByLabelText('Password') as HTMLInputElement;
  const submitButton = getByRole('button', { name: 'Login' });
  
  await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
  await fireEvent.input(passwordInput, { target: { value: 'password123' } });
  await fireEvent.click(submitButton);
  
  expect(mockSubmit).toHaveBeenCalledWith({
    email: 'test@example.com',
    password: 'password123'
  });
});
```

## Component Checklist

When creating or reviewing a component, verify:

- [ ] Component is appropriately sized (< 200 lines)
- [ ] Props interface is defined with TypeScript
- [ ] **No `any` or `unknown` types used**
- [ ] Default values provided for optional props
- [ ] Component name is descriptive and PascalCase
- [ ] No duplicated logic from other components
- [ ] Styles use global CSS variables
- [ ] Semantic HTML is used
- [ ] Accessibility attributes included where needed
- [ ] Component handles loading/error states appropriately
- [ ] Code is self-documenting (clear names, good types)
- [ ] No console.logs or debug code
- [ ] Component is testable and focused
- [ ] **`npm run validate` passes without errors**

---

Following these standards ensures consistent, maintainable, and high-quality components throughout the project.
