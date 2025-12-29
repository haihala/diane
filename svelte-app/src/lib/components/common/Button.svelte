<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		variant?: 'primary' | 'secondary' | 'ghost' | 'icon' | 'danger';
		size?: 'sm' | 'md' | 'lg';
		disabled?: boolean;
		onclick?: () => void;
		type?: 'button' | 'submit' | 'reset';
		class?: string;
		title?: string;
		children: Snippet;
	}

	const {
		variant = 'primary',
		size = 'md',
		disabled = false,
		onclick,
		type = 'button',
		class: className = '',
		title,
		children
	}: Props = $props();
</script>

<button
	{type}
	class="button button-{variant} button-{size} {className}"
	{disabled}
	{onclick}
	{title}
>
	{@render children()}
</button>

<style>
	.button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--spacing-sm);
		border: none;
		border-radius: var(--radius-md);
		font-weight: var(--font-weight-medium);
		cursor: pointer;
		transition: all var(--transition-fast);
		text-decoration: none;
	}

	.button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.button:not(:disabled):active {
		transform: scale(0.98);
	}

	/* Sizes */
	.button-sm {
		padding: var(--spacing-xs) var(--spacing-md);
		font-size: var(--font-size-sm);
	}

	.button-md {
		padding: var(--spacing-sm) var(--spacing-lg);
		font-size: var(--font-size-md);
	}

	.button-lg {
		padding: var(--spacing-md) var(--spacing-xl);
		font-size: var(--font-size-lg);
	}

	/* Variants */
	.button-primary {
		background: var(--color-primary);
		color: var(--color-text-inverted);
	}

	.button-primary:hover:not(:disabled) {
		background: var(--color-primary-hover);
	}

	.button-secondary {
		background: transparent;
		color: var(--color-text-secondary);
		border: 1px solid var(--color-border);
	}

	.button-secondary:hover:not(:disabled) {
		background: var(--color-surface-hover);
		border-color: var(--color-border-hover);
		color: var(--color-text);
	}

	.button-danger {
		background: #dc2626;
		color: var(--color-text-inverted);
	}

	.button-danger:hover:not(:disabled) {
		background: #b91c1c;
	}

	.button-ghost {
		background: transparent;
		color: var(--color-text-secondary);
	}

	.button-ghost:hover:not(:disabled) {
		background: var(--color-surface-hover);
		color: var(--color-text);
	}

	.button-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		padding: 0;
		border: none;
		background: transparent;
		color: var(--color-text-secondary);
		border-radius: var(--radius-md);
	}

	.button-icon:hover:not(:disabled) {
		background: var(--color-surface-hover);
		color: var(--color-text);
	}
</style>
