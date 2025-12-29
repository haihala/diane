<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import '../app.css';
	import { initializeAuth, user, loading } from '$lib/services/auth';
	import Login from '$lib/components/auth/Login.svelte';
	import LoadingSpinner from '$lib/components/common/LoadingSpinner.svelte';
	import Toast from '$lib/components/Toast.svelte';

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
