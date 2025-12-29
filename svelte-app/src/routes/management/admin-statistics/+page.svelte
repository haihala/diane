<script lang="ts">
	import { onMount } from 'svelte';
	import { userData, loading as authLoading } from '$lib/services/auth';
	import { getAllUsers, type UserWithStats } from '$lib/services/users';
	import LoadingSpinner from '$lib/components/common/LoadingSpinner.svelte';
	import EmptyState from '$lib/components/common/EmptyState.svelte';
	import StatCard from '$lib/components/common/StatCard.svelte';

	let users: UserWithStats[] = $state([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	const stats = $derived({
		totalUsers: users.length,
		adminUsers: users.filter((u) => u.isAdmin).length,
		activeUsers: users.filter((u) => u.entryCount > 0).length,
		totalEntries: users.reduce((sum, u) => sum + u.entryCount, 0)
	});

	async function loadUsers(): Promise<void> {
		try {
			loading = true;
			error = null;
			users = await getAllUsers();
		} catch (err) {
			console.error('Error loading users:', err);
			error = 'Failed to load users. Please try again.';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		// Wait for auth to initialize before checking admin status
		const unsubscribe = authLoading.subscribe((isAuthLoading) => {
			if (!isAuthLoading) {
				// Auth has finished loading, now check if user is admin
				if (!$userData?.isAdmin) {
					error = 'Access denied. Admin privileges required.';
					loading = false;
				} else {
					void loadUsers();
				}
				unsubscribe();
			}
		});
	});
</script>

<div class="page-header">
	<h1 class="page-title">Statistics</h1>
	<p class="page-subtitle">System-wide statistics and insights</p>
</div>

{#if loading}
	<LoadingSpinner message="Loading statistics..." />
{:else if error}
	<EmptyState icon="x" message={error} />
{:else}
	<div class="stats-grid">
		<StatCard icon="grid" value={stats.totalUsers} label="Total Users" />
		<StatCard icon="grid" value={stats.adminUsers} label="Admin Users" />
		<StatCard icon="grid" value={stats.activeUsers} label="Active Users" />
		<StatCard icon="file" value={stats.totalEntries} label="Total Entries" />
	</div>
{/if}

<style>
	.page-header {
		margin-bottom: var(--spacing-2xl);
	}

	.page-title {
		font-size: var(--font-size-3xl);
		font-weight: var(--font-weight-bold);
		color: var(--color-text);
		margin-bottom: var(--spacing-sm);
	}

	.page-subtitle {
		font-size: var(--font-size-md);
		color: var(--color-text-secondary);
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--spacing-lg);
	}

	@media (max-width: 768px) {
		.stats-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
