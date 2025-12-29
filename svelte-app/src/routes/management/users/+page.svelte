<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { userData, loading as authLoading, startImpersonation } from '$lib/services/auth';
	import { getAllUsers, type UserWithStats } from '$lib/services/users';
	import LoadingSpinner from '$lib/components/common/LoadingSpinner.svelte';
	import EmptyState from '$lib/components/common/EmptyState.svelte';
	import StatCard from '$lib/components/common/StatCard.svelte';
	import Button from '$lib/components/common/Button.svelte';

	let users: UserWithStats[] = $state([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let impersonating = $state<string | null>(null);

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

	async function handleImpersonate(userId: string): Promise<void> {
		try {
			impersonating = userId;
			await startImpersonation(userId);
			// Redirect to home page after starting impersonation
			void goto(resolve('/'));
		} catch (err) {
			console.error('Error impersonating user:', err);
			error = err instanceof Error ? err.message : 'Failed to impersonate user';
			impersonating = null;
		}
	}

	function formatDate(date: Date | null): string {
		if (!date) return 'Never';
		return new Intl.DateTimeFormat('en-US', {
			dateStyle: 'medium'
		}).format(date);
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
	<h1 class="page-title">Users</h1>
	<p class="page-subtitle">Manage users and view statistics</p>
</div>

{#if loading}
	<LoadingSpinner message="Loading users..." />
{:else if error}
	<EmptyState icon="x" message={error} />
{:else}
	<div class="stats-grid">
		<StatCard icon="grid" value={stats.totalUsers} label="Total Users" />
		<StatCard icon="grid" value={stats.adminUsers} label="Admin Users" />
		<StatCard icon="grid" value={stats.activeUsers} label="Active Users" />
		<StatCard icon="file" value={stats.totalEntries} label="Total Entries" />
	</div>

	<div class="users-section">
		<h2 class="section-title">All Users</h2>
		<div class="users-table-container">
			<table class="users-table">
				<thead>
					<tr>
						<th>User</th>
						<th>Email</th>
						<th>Role</th>
						<th>Entries</th>
						<th>Last Active</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each users as user (user.uid)}
						<tr>
							<td class="user-name">
								{user.displayName ?? 'Unknown User'}
							</td>
							<td class="user-email">
								{user.email ?? 'No email'}
							</td>
							<td>
								<span class="role-badge" class:admin={user.isAdmin}>
									{user.isAdmin ? 'Admin' : 'User'}
								</span>
							</td>
							<td class="entry-count">{user.entryCount}</td>
							<td class="last-active">{formatDate(user.lastActive)}</td>
							<td>
								{#if !user.isAdmin}
									<Button
										variant="primary"
										size="sm"
										onclick={() => handleImpersonate(user.uid)}
										disabled={impersonating === user.uid}
									>
										{impersonating === user.uid ? 'Impersonating...' : 'Impersonate'}
									</Button>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
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
		margin-bottom: var(--spacing-3xl);
	}

	.users-section {
		margin-top: var(--spacing-2xl);
	}

	.section-title {
		font-size: var(--font-size-xl);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
		margin-bottom: var(--spacing-lg);
	}

	.users-table-container {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.users-table {
		width: 100%;
		border-collapse: collapse;
	}

	.users-table thead {
		background: var(--color-bg-secondary);
		border-bottom: 1px solid var(--color-border);
	}

	.users-table th {
		padding: var(--spacing-md) var(--spacing-lg);
		text-align: left;
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.users-table tbody tr {
		border-bottom: 1px solid var(--color-border);
		transition: background-color 0.2s ease;
	}

	.users-table tbody tr:last-child {
		border-bottom: none;
	}

	.users-table tbody tr:hover {
		background: var(--color-bg-secondary);
	}

	.users-table td {
		padding: var(--spacing-md) var(--spacing-lg);
		font-size: var(--font-size-sm);
		color: var(--color-text);
	}

	.user-name {
		font-weight: var(--font-weight-medium);
	}

	.user-email {
		color: var(--color-text-secondary);
	}

	.role-badge {
		display: inline-block;
		padding: var(--spacing-xs) var(--spacing-sm);
		border-radius: var(--radius-sm);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);
		background: var(--color-bg-secondary);
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.role-badge.admin {
		background: var(--color-primary);
		color: white;
	}

	.entry-count {
		font-weight: var(--font-weight-medium);
	}

	.last-active {
		color: var(--color-text-secondary);
		font-size: var(--font-size-xs);
	}

	/* Mobile responsiveness */
	@media (max-width: 768px) {
		.stats-grid {
			grid-template-columns: 1fr;
		}

		.users-table-container {
			overflow-x: auto;
		}

		.users-table {
			min-width: 600px;
		}

		.users-table th,
		.users-table td {
			padding: var(--spacing-sm) var(--spacing-md);
		}
	}
</style>
