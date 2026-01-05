<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { browser, dev } from '$app/environment';
	import '../app.css';
	import { initializeAuth, user, loading } from '$lib/services/auth';
	import { auth } from '$lib/services/firebase';
	import Login from '$lib/components/auth/Login.svelte';
	import LoadingSpinner from '$lib/components/common/LoadingSpinner.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

	interface Props {
		children: Snippet;
	}

	const { children }: Props = $props();

	// Track if we're invalidating data after login
	let isInvalidating = $state(false);

	// Check if current route is public (wiki pages)
	const isPublicRoute = $derived(page.url.pathname.startsWith('/wiki'));

	onMount(() => {
		initializeAuth();

		// Expose test helper function for e2e tests (only on localhost)
		// This is safe because it only works with the Firebase emulator
		if (browser && window.location.hostname === 'localhost') {
			console.warn('[TEST] Registering __TEST_SIGN_IN__ helper function');
			console.warn('[TEST] dev mode:', dev, 'hostname:', window.location.hostname);

			(window as { __TEST_SIGN_IN__?: () => Promise<void> }).__TEST_SIGN_IN__ = async () => {
				console.warn('[TEST] __TEST_SIGN_IN__ called');
				const testEmail = 'test-user@example.com';
				const testPassword = 'test-password-123';

				try {
					console.warn('[TEST] Creating test user...');
					// Try to create the test user
					await createUserWithEmailAndPassword(auth, testEmail, testPassword);
					console.warn('[TEST] Test user created successfully');
				} catch (error: unknown) {
					// If user already exists, that's fine
					if (
						typeof error === 'object' &&
						error !== null &&
						'code' in error &&
						typeof error.code === 'string' &&
						error.code.includes('email-already-in-use')
					) {
						console.warn('[TEST] Test user already exists, continuing...');
					} else {
						console.error('[TEST] Error creating test user:', error);
						throw error;
					}
				}

				console.warn('[TEST] Signing in...');
				// Sign in with the test user
				await signInWithEmailAndPassword(auth, testEmail, testPassword);
				console.warn('[TEST] Signed in successfully');
			};

			const windowWithTest = window as { __TEST_SIGN_IN__?: () => Promise<void> };
			console.warn(
				`[TEST] Test helper registered. Type: ${typeof windowWithTest.__TEST_SIGN_IN__}`
			);
		} else {
			console.warn(
				'[TEST] Not registering test helper. browser:',
				browser,
				'dev:',
				dev,
				'hostname:',
				browser ? window.location.hostname : 'N/A'
			);
		}
	});

	// Track previous user state to detect actual changes
	let previousUser: typeof $user = $state(undefined);

	// Invalidate all data when user actually logs in or out
	$effect(() => {
		// Wait for auth to initialize
		if ($loading) return;

		// Check if user state actually changed (not just initialized)
		if (previousUser !== undefined && previousUser !== $user) {
			isInvalidating = true;
			void invalidateAll().then(() => {
				isInvalidating = false;
			});
		}

		// Update previous user for next comparison
		previousUser = $user;
	});
</script>

{#if isPublicRoute}
	<!-- Public routes don't require authentication -->
	{@render children()}
{:else if $loading || isInvalidating}
	<div class="loading-container">
		<LoadingSpinner message="Loading..." size="lg" />
	</div>
{:else if !$user}
	<Login />
{:else}
	{@render children()}
{/if}

<!-- Toast notifications -->
<Toast />

<style>
	.loading-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(
			135deg,
			var(--color-bg) 0%,
			var(--color-bg-secondary) 50%,
			var(--color-bg-tertiary) 100%
		);
	}
</style>
