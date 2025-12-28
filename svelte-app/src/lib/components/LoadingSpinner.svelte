<script lang="ts">
	interface Props {
		message?: string;
		size?: 'sm' | 'md' | 'lg';
	}

	const { message = 'Loading...', size = 'md' }: Props = $props();
</script>

<div class="loading-state">
	<div class="spinner spinner-{size}"></div>
	{#if message}
		<p class="loading-message">{message}</p>
	{/if}
</div>

<style>
	.loading-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--spacing-md);
		padding: var(--spacing-3xl);
		color: var(--color-text-secondary);
	}

	.spinner {
		border: 3px solid var(--color-border);
		border-top-color: var(--color-primary);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	.spinner-sm {
		width: 24px;
		height: 24px;
		border-width: 2px;
	}

	.spinner-md {
		width: 32px;
		height: 32px;
		border-width: 3px;
	}

	.spinner-lg {
		width: 48px;
		height: 48px;
		border-width: 4px;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.loading-message {
		color: var(--color-text-secondary);
		font-size: var(--font-size-md);
		margin: 0;
	}
</style>
