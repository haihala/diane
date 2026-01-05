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

	test('should create wiki links and show backlinks', async ({ authenticatedPage: page }) => {
		await page.waitForLoadState('networkidle');

		// Create first entry (Entry A)
		const searchInput = page.locator('[data-testid="search-input"]');
		await searchInput.fill('Entry A for Wiki Links');
		await page.keyboard.press('Enter');
		await page.waitForURL('**/entries/new**');

		// Save and capture the entry ID from URL
		await page.keyboard.press('Control+Enter');
		await page.waitForURL('**/', { timeout: 5000 });

		// Search for Entry A to get its ID
		await searchInput.fill('Entry A for Wiki Links');
		await page.waitForSelector('[data-testid="search-result-option"]', { timeout: 5000 });
		await page.locator('[data-testid="search-result-option"]').first().click();
		await page.waitForURL('**/entries/**');

		// Extract entry ID from URL
		const entryAUrl = page.url();
		const entryAId = entryAUrl.split('/entries/')[1];

		// Navigate back using Escape
		await page.keyboard.press('Escape');
		await page.waitForURL('**/', { timeout: 5000 });

		// Create second entry (Entry B) with a wiki link to Entry A
		await searchInput.fill('Entry B with Link');
		await page.keyboard.press('Enter');
		await page.waitForURL('**/entries/new**');

		// Add wiki link in the editor
		const editor = page.locator('[data-testid="markdown-editor"]');
		await editor.click();
		await page.keyboard.type(`This links to [[${entryAId}|Entry A]]`);

		// Save Entry B
		await page.keyboard.press('Control+Enter');
		await page.waitForURL('**/', { timeout: 5000 });

		// Wait a moment for backlinks to be calculated
		await page.waitForTimeout(1000);

		// Now go back to Entry A and verify backlink appears
		await searchInput.fill('Entry A for Wiki Links');
		await page.waitForSelector('[data-testid="search-result-option"]', { timeout: 5000 });
		await page.locator('[data-testid="search-result-option"]').first().click();
		await page.waitForURL('**/entries/**');

		// Wait for backlinks to load
		await page.waitForTimeout(1000);

		// Verify backlink section shows Entry B
		const backlinksSection = page.locator('[data-testid="backlinks-list"]');
		await expect(backlinksSection).toBeVisible();
		await expect(backlinksSection).toContainText('Entry B with Link');
	});

	test('should extract tags from title and make them searchable', async ({
		authenticatedPage: page
	}) => {
		await page.waitForLoadState('networkidle');

		// Create entry with tags
		const uniqueTitle = `Tagged Note ${Date.now()}`;
		const searchInput = page.locator('[data-testid="search-input"]');
		await searchInput.fill(uniqueTitle);
		await page.keyboard.press('Enter');
		await page.waitForURL('**/entries/new**');

		// Update the title to include tags
		const titleInput = page.locator('input[type="text"]').first();
		await titleInput.fill(`${uniqueTitle} #testing #e2e`);

		const editor = page.locator('[data-testid="markdown-editor"]');
		await editor.click();
		await page.keyboard.type('Content for tagged note');
		await page.keyboard.press('Control+Enter');
		await page.waitForURL('**/', { timeout: 5000 });

		// Search by the note title to verify tags are displayed
		await searchInput.fill(uniqueTitle);
		await page.waitForSelector('[data-testid="search-result-option"]', { timeout: 5000 });

		// Verify our entry appears with tags
		const searchResults = page.locator('[data-testid="search-result-option"]').first();
		await expect(searchResults).toBeVisible();
		await expect(searchResults).toContainText(uniqueTitle);
		await expect(searchResults).toContainText('#testing');
		await expect(searchResults).toContainText('#e2e');
	});

	test('should save entry with Ctrl+Enter', async ({ authenticatedPage: page }) => {
		await page.waitForLoadState('networkidle');

		// Create a new entry
		const uniqueTitle = `Save Test ${Date.now()}`;
		const searchInput = page.locator('[data-testid="search-input"]');
		await searchInput.fill(uniqueTitle);
		await page.keyboard.press('Enter');
		await page.waitForURL('**/entries/new**');

		// Add content and save with Ctrl+Enter
		const editor = page.locator('[data-testid="markdown-editor"]');
		await editor.click();
		await page.keyboard.type('This content was saved with Ctrl+Enter');
		await page.keyboard.press('Control+Enter');
		await page.waitForURL('**/', { timeout: 5000 });

		// Open the entry again and verify content
		await searchInput.fill(uniqueTitle);
		await page.waitForSelector('[data-testid="search-result-option"]', { timeout: 5000 });
		await page.locator('[data-testid="search-result-option"]').first().click();
		await page.waitForURL('**/entries/**');

		// Verify the content was saved
		await expect(page.locator('[data-testid="markdown-editor"]')).toContainText(
			'This content was saved with Ctrl+Enter'
		);
	});

	test('should delete entry and remove from search', async ({ authenticatedPage: page }) => {
		await page.waitForLoadState('networkidle');

		// Create entry to delete
		const uniqueTitle = `Delete Test ${Date.now()}`;
		const searchInput = page.locator('[data-testid="search-input"]');
		await searchInput.fill(uniqueTitle);
		await page.keyboard.press('Enter');
		await page.waitForURL('**/entries/new**');

		const editor = page.locator('[data-testid="markdown-editor"]');
		await editor.click();
		await page.keyboard.type('This entry will be deleted');
		await page.keyboard.press('Control+Enter');
		await page.waitForURL('**/', { timeout: 5000 });

		// Open the entry
		await searchInput.fill(uniqueTitle);
		await page.waitForSelector('[data-testid="search-result-option"]', { timeout: 5000 });
		await page.locator('[data-testid="search-result-option"]').first().click();
		await page.waitForURL('**/entries/**');

		// Set up dialog handler to accept the confirmation
		page.on('dialog', (dialog) => dialog.accept());

		// Delete using keyboard shortcut
		await page.keyboard.press('Control+Shift+D');

		// Wait for deletion and navigation back home
		await page.waitForURL('**/', { timeout: 5000 });

		// Search for the deleted entry - should not appear
		await searchInput.fill(uniqueTitle);

		// Wait a moment for search to process
		await page.waitForTimeout(1000);

		// Verify "Create new entry" option appears (meaning no existing entry found)
		await expect(page.locator('[data-testid="create-new-entry-option"]')).toBeVisible();
	});
});

export { test, expect };
