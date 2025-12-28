<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import '../app.css';
	import { initializeAuth, user, loading } from '$lib/services/auth';
	import Login from '$lib/components/Login.svelte';

	interface Props {
		children: Snippet;
	}

	const { children }: Props = $props();

	// Track if we're invalidating data after login
	let isInvalidating = $state(false);

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
			invalidateAll().then(() => {
				isInvalidating = false;
			});
		}

		// Update previous user for next comparison
		previousUser = $user;
	});
</script>

{#if $loading || isInvalidating}
	<div class="loading-container">
		<div class="loading-spinner"></div>
		<p>Loading...</p>
	</div>
{:else if !$user}
	<Login />
{:else}
	{@render children()}
{/if}

<style>
	.loading-container {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--spacing-lg);
		background: linear-gradient(
			135deg,
			var(--color-bg) 0%,
			var(--color-bg-secondary) 50%,
			var(--color-bg-tertiary) 100%
		);
	}

	.loading-spinner {
		width: 48px;
		height: 48px;
		border: 4px solid var(--color-border);
		border-top-color: var(--color-primary);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.loading-container p {
		color: var(--color-text-secondary);
		font-size: var(--font-size-md);
	}
</style>
