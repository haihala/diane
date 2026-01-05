import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './tests/e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: 'html',
	use: {
		baseURL: 'http://localhost:5173',
		trace: 'on-first-retry',
		// Automatically reload the page when code changes (with Vite HMR)
		// This helps when running tests in watch mode
		actionTimeout: 10000,
		navigationTimeout: 10000
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		}
	],
	// webServer is undefined - user should run dev server manually
	// This allows Vite's HMR to work properly during test development
	webServer: undefined
});
