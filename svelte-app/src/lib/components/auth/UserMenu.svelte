<script lang="ts">
	interface Props {
		email: string;
		onSignOut: () => void;
	}

	const { email, onSignOut }: Props = $props();
</script>

<div class="user-section">
	<span class="user-email">{email}</span>
	<button class="sign-out-button" onclick={onSignOut}>Sign Out</button>
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

	@media (max-width: 768px) {
		.user-section {
			padding: var(--spacing-xs) var(--spacing-sm);
		}

		.user-email {
			display: none;
		}
	}
</style>
