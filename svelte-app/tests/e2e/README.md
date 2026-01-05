# E2E Testing with Playwright

This directory contains end-to-end tests for the application using Playwright.

## Prerequisites

1. Firebase Emulators must be running
2. The development server must be running on `localhost:5173`

## Running the Tests

### 1. Start Firebase Emulators

In the project root directory:

```bash
firebase emulators:start
```

This will start:

- Auth emulator on port 9099
- Firestore emulator on port 8080
- Functions emulator on port 5001
- Hosting emulator on port 5000

### 2. Start the Development Server

In the `svelte-app` directory:

```bash
npm run dev
```

This will start the Vite dev server on `localhost:5173`.

### 3. Run the Tests

In the `svelte-app` directory:

```bash
# Run tests in headless mode
npm run test:e2e

# Run tests with Playwright UI (interactive)
npm run test:e2e:ui

# Run tests in watch mode (automatically re-run on changes)
npm run test:e2e:watch
```

### Watch Mode for Development

When developing tests, use **watch mode** for the best experience:

```bash
npm run test:e2e:watch
```

This will:

- Open the Playwright UI
- Automatically re-run tests when **test files** change
- Work with Vite's HMR so **app code changes** are reflected in the browser immediately
- Let you click to run specific tests

**How it works:**

1. The Playwright UI watches for changes to test files (`.spec.ts`)
2. Vite's dev server handles HMR for app code changes (`.svelte`, `.ts` files)
3. When app code changes, the browser automatically refreshes via HMR
4. You can manually re-run tests in the UI after app changes, or they'll auto-run if the test file changes

**Tips:**

- Keep the Playwright UI open while developing
- When you change app code, the browser will refresh automatically
- When you change test code, tests will re-run automatically
- Use the "Watch" checkbox in the UI to toggle auto-run behavior

## Test Structure

- `notes.spec.ts` - Tests for creating, viewing, and deleting notes
  - Creates a new note with title and content
  - Verifies the note can be opened and displays correctly
  - Tests the markdown editor typing functionality
  - (Note: Delete functionality test is included but may need adjustment based on UI implementation)

## Testing Best Practices

### Using data-testid Attributes

The tests use `data-testid` attributes for selecting elements, which is more reliable than using text content or CSS classes:

```svelte
<!-- Component -->
<button data-testid="google-signin-button">Continue with Google</button>

<!-- Test -->
await page.click('[data-testid="google-signin-button"]');
```

Key test IDs used:

- `data-testid="google-signin-button"` - Login button
- `data-testid="search-input"` - Main search input
- `data-testid="markdown-editor"` - Markdown editor
- `data-testid="create-new-entry-option"` - "Create new entry" option in search results
- `data-testid="search-result-option"` - Search result items

When adding new UI elements that need to be tested, add a `data-testid` attribute to make tests more robust.

## Authentication

The tests automatically handle authentication using the Firebase Auth Emulator.

### How It Works

1. A test helper function `__TEST_SIGN_IN__` is exposed on the `window` object (only in development on localhost)
2. This function creates a test user (`test-user@example.com`) in the emulator
3. It signs in using `signInWithEmailAndPassword`, which doesn't require a popup
4. The test fixtures call this helper before running tests

This approach avoids the popup issue with `signInWithPopup` which doesn't work in automated tests.

### Security

The test helper is only available when:

- Running on `localhost` hostname
- Connected to Firebase emulators (not production Firebase)

It's automatically disabled when deployed to production since:

- The hostname won't be `localhost`
- Firebase emulators won't be available
- Even if somehow called, it would fail because production Firebase doesn't allow email/password sign-in without proper setup

This makes it safe to include in the codebase.

## Troubleshooting

### "about:blank" page issue

- Ensure the dev server is running on `localhost:5173`
- Ensure Firebase emulators are running
- The app requires authentication - the tests handle this automatically

### Tests timing out

- Increase timeouts in the test if needed
- Check that both emulators and dev server are running
- Check browser console for errors using `npm run test:e2e:ui`

### Authentication issues

- Make sure the Auth emulator is running on port 9099
- Check that `firebase.json` has emulator configuration
- Verify the app connects to emulators in development mode (check console for "Connected to Auth emulator" message)

### Element not found errors

- Check if the UI has changed and the `data-testid` is still present
- Use `npm run test:e2e:ui` to debug and inspect elements
- Verify the element is visible and not hidden by conditional rendering
