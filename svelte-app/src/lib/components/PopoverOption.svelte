<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';

	type IconName = 'arrow-right' | 'plus' | 'file' | 'x' | 'search' | 'grid' | 'settings';

	interface Props {
		icon: IconName;
		title: string;
		subtitle?: string;
		extras?: Snippet; // For tags or other custom content
		isSelected?: boolean;
		onclick: () => void;
		variant?: 'default' | 'primary' | 'result';
	}

	const {
		icon,
		title,
		subtitle,
		extras,
		isSelected = false,
		onclick,
		variant = 'default'
	}: Props = $props();
</script>

<button
	type="button"
	class="popover-option"
	class:selected={isSelected}
	role="option"
	aria-selected={isSelected}
	{onclick}
	onmousedown={(e) => e.preventDefault()}
	tabindex="-1"
>
	<div class="option-icon option-icon-{variant}">
		<Icon name={icon} size={20} />
	</div>
	<div class="option-content">
		<div class="option-title-row">
			<div class="option-title">{title}</div>
			{#if extras}
				<div class="option-extras">
					{@render extras()}
				</div>
			{/if}
		</div>
		{#if subtitle}
			<div class="option-subtitle">{subtitle}</div>
		{/if}
	</div>
</button>

<style>
	.popover-option {
		width: 100%;
		display: flex;
		align-items: center;
		gap: var(--spacing-md);
		padding: var(--spacing-md) var(--spacing-lg);
		border: none;
		background: transparent;
		color: var(--color-text);
		cursor: pointer;
		transition: all var(--transition-fast);
		text-align: left;
		border-bottom: 1px solid var(--color-border);
	}

	.popover-option:last-child {
		border-bottom: none;
	}

	.popover-option:hover,
	.popover-option.selected {
		background: var(--color-surface-hover);
	}

	.popover-option.selected {
		border-left: 3px solid var(--color-primary);
	}

	.option-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border-radius: var(--radius-lg);
		flex-shrink: 0;
	}

	.option-icon-primary {
		background: linear-gradient(135deg, var(--color-primary) 0%, #c4b5fd 100%);
		color: var(--color-text-inverted);
	}

	.option-icon-result {
		background: var(--color-bg-tertiary);
		color: var(--color-text-secondary);
	}

	.option-icon-default {
		background: var(--color-bg-tertiary);
		color: var(--color-text-secondary);
	}

	.option-content {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}

	.option-title-row {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		justify-content: space-between;
		min-width: 0;
	}

	.option-title {
		font-size: var(--font-size-md);
		font-weight: var(--font-weight-medium);
		color: var(--color-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		flex-shrink: 1;
		min-width: 0;
	}

	.option-extras {
		display: flex;
		gap: var(--spacing-xs);
		flex-wrap: nowrap;
		flex-shrink: 0;
		overflow: hidden;
		align-items: center;
	}

	.option-subtitle {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
</style>
