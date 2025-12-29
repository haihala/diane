<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { user, userData, impersonatedUser, signOut, stopImpersonation } from '$lib/services/auth';
	import Button from '$lib/components/common/Button.svelte';

	async function handleSignOut(): Promise<void> {
		try {
			await signOut();
		} catch (error) {
			console.error('Error signing out:', error);
		}
	}

	function handleStopImpersonation(): void {
		stopImpersonation();
		// Redirect to users list after stopping impersonation
		void goto(resolve('/management/users'));
	}
</script>

<div class="user-section">
	<div class="user-info">
		{#if $impersonatedUser}
			<div class="impersonation-info">
				<span class="impersonation-badge">Impersonating</span>
				<span class="user-email">{$impersonatedUser.userData.email}</span>
				<Button size="sm" class="stop-button" onclick={handleStopImpersonation}>Stop</Button>
			</div>
		{:else}
			{#if $userData?.isAdmin}
				<span class="admin-badge">Admin</span>
			{/if}
			{#if $user}
				<span class="user-email">{$user.email}</span>
			{/if}
		{/if}
	</div>
	<Button variant="secondary" size="sm" onclick={handleSignOut}>Sign Out</Button>
</div>

<style>
	.user-section {
		display: flex;
		align-items: center;
		gap: var(--spacing-md);
		padding: var(--spacing-sm) var(--spacing-md);
		background: var(--color-surface);
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border);
	}

	.user-info {
		display: flex;
		align-items: center;
		gap: var(--spacing-md);
	}

	.impersonation-info {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
	}

	.admin-badge {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-bold);
		color: var(--color-primary);
	}

	.impersonation-badge {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-bold);
		color: #ff9800;
		background: rgba(255, 152, 0, 0.1);
		padding: var(--spacing-xs) var(--spacing-sm);
		border-radius: var(--radius-sm);
	}

	.user-email {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}

	.user-section :global(.stop-button) {
		background: #ff9800;
		color: white;
	}

	.user-section :global(.stop-button:hover:not(:disabled)) {
		background: #f57c00;
	}

	/* Mobile responsiveness */
	@media (max-width: 768px) {
		.user-section {
			padding: var(--spacing-xs) var(--spacing-sm);
		}

		.user-info {
			display: none;
		}
	}
</style>
