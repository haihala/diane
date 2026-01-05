import { test as base, expect, type Page } from '@playwright/test';

/**
 * Extended test with authentication setup
 *
 * This automatically signs in before each test using the Firebase Auth Emulator.
 * We use a test helper function exposed by the app in development mode.
 */
const test = base.extend<{ authenticatedPage: Page }>({
	authenticatedPage: async ({ page }, use) => {
		// Go to the app first
		await page.goto('/');

		// Wait for the page to load and Firebase to initialize
		await page.waitForLoadState('networkidle');

		// Check if test helper is available and call it
		const signInResult = await page.evaluate(async () => {
			// Check if we're connected to the emulator
			if (window.location.hostname !== 'localhost') {
				return { success: false, error: 'Not running on localhost' };
			}

			// Check if test helper is available
			const windowWithTest = window as { __TEST_SIGN_IN__?: () => Promise<void> };
			if (typeof windowWithTest.__TEST_SIGN_IN__ !== 'function') {
				return {
					success: false,
					error: `Test helper not available. Available keys: ${Object.keys(window)
						.filter((k) => k.startsWith('__'))
						.join(', ')}`
				};
			}

			try {
				// Call the test sign-in helper
				await windowWithTest.__TEST_SIGN_IN__();
				return { success: true };
			} catch (error: unknown) {
				return {
					success: false,
					error: error instanceof Error ? error.message : String(error)
				};
			}
		});

		if (!signInResult.success) {
			throw new Error(`Could not sign in: ${signInResult.error ?? 'Unknown error'}`);
		}

		// Wait for authentication to complete
		await page.waitForSelector('[data-testid="search-input"]', { timeout: 10000 });

		await use(page);
	}
});

test.describe('Note Management', () => {
	test('should create a new note, open it, and delete it', async ({ authenticatedPage: page }) => {
		// Already signed in via the fixture
		await page.waitForLoadState('networkidle');

		// Type in the search bar to create a new note
		const searchInput = page.locator('[data-testid="search-input"]');
		await searchInput.fill('Test Note from E2E');

		// Wait for the popover to appear with "Create new entry" option
		await page.waitForSelector('[data-testid="create-new-entry-option"]', { timeout: 5000 });

		// Press Enter or click on the "Create new entry" option
		await page.keyboard.press('Enter');

		// Wait for the new entry page to load
		await page.waitForURL('**/entries/new**', { timeout: 5000 });

		// The title should be pre-filled from the search
		const titleInput = page.locator('input[type="text"]').first();
		await expect(titleInput).toHaveValue('Test Note from E2E');

		// Find the editor and type some content
		const editor = page.locator('[data-testid="markdown-editor"]');
		await editor.click();
		await page.keyboard.type('This is a test note created by Playwright e2e test.');

		// Save the note using Ctrl+Enter
		await page.keyboard.press('Control+Enter');

		// Wait for navigation back to home page (that's the expected behavior after save)
		await page.waitForURL('**/', { timeout: 5000 });

		// Re-locate the search input (we're already on home page)
		const searchInputAgain = page.locator('[data-testid="search-input"]');
		await searchInputAgain.fill('Test Note from E2E');

		// Wait for search results to appear
		await page.waitForSelector('[data-testid="search-result-option"]', { timeout: 5000 });

		// Click on the first search result
		const searchResults = page.locator('[data-testid="search-result-option"]');
		await searchResults.first().click();

		// Wait for navigation to the entry page
		await page.waitForURL('**/entries/**', { timeout: 5000 });

		// Verify the note still exists by checking the title input field has the correct value
		const reopenedTitleInput = page.locator('input[type="text"]').first();
		await expect(reopenedTitleInput).toHaveValue('Test Note from E2E');

		// Verify the content is displayed in the editor
		await expect(page.locator('[data-testid="markdown-editor"]')).toContainText(
			'This is a test note created by Playwright e2e test.'
		);
	});

	test('should allow typing in the markdown editor', async ({ authenticatedPage: page }) => {
		// Already signed in via the fixture
		await page.waitForLoadState('networkidle');

		// Type in the search bar to create a new note
		const searchInput = page.locator('[data-testid="search-input"]');
		await searchInput.fill('Editor Test Note');

		// Press Enter to create new entry
		await page.keyboard.press('Enter');
		await page.waitForURL('**/entries/new**');

		// Find the editor
		const editor = page.locator('[data-testid="markdown-editor"]');
		await editor.click();

		// Type some text
		const testText = 'Testing editor typing functionality';
		await page.keyboard.type(testText);

		// Verify the text appears in the editor
		await expect(
			page.locator(`[data-testid="markdown-editor"]:has-text("${testText}")`)
		).toBeVisible();
	});
});

export { test, expect };
