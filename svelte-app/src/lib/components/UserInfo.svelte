<script lang="ts">
	import { user, userData, signOut } from '$lib/services/auth';

	async function handleSignOut(): Promise<void> {
		try {
			await signOut();
		} catch (error) {
			console.error('Error signing out:', error);
		}
	}
</script>

<div class="user-section">
	<div class="user-info">
		{#if $userData?.isAdmin}
			<span class="admin-badge">Admin</span>
		{/if}
		{#if $user}
			<span class="user-email">{$user.email}</span>
		{/if}
	</div>
	<button class="sign-out-button" onclick={handleSignOut}>Sign Out</button>
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

	.admin-badge {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-bold);
		color: var(--color-primary);
	}

	.user-email {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}

	.sign-out-button {
		padding: var(--spacing-xs) var(--spacing-md);
		background: transparent;
		color: var(--color-text-secondary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		font-size: var(--font-size-sm);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.sign-out-button:hover {
		background: var(--color-bg-secondary);
		color: var(--color-text);
		border-color: var(--color-primary);
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
