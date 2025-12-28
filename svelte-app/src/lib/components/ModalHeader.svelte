<script lang="ts">
	import Icon from './Icon.svelte';

	interface Props {
		title: string;
		onClose: () => void;
	}

	const { title, onClose }: Props = $props();
</script>

<header class="modal-header">
	<h2 id="modal-title" class="modal-title">{title}</h2>
	<button type="button" class="close-button" onclick={onClose} aria-label="Close dialog">
		<Icon name="x" size={24} />
	</button>
</header>

<style>
	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--spacing-lg);
		border-bottom: 1px solid var(--color-border);
	}

	.modal-title {
		font-size: var(--font-size-2xl);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
		margin: 0;
	}

	.close-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border: none;
		background: transparent;
		color: var(--color-text-secondary);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.close-button:hover {
		background: var(--color-surface-hover);
		color: var(--color-text);
	}
</style>
