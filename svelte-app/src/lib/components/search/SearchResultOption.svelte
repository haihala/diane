<script lang="ts">
	import Icon from '../common/Icon.svelte';
	import Tag from '../common/Tag.svelte';
	import type { Entry } from '$lib/types/Entry';

	interface Props {
		type: 'new' | 'result';
		entry?: Entry;
		inputValue?: string;
		preview?: string;
		isSelected?: boolean;
		onclick?: () => void;
	}

	const {
		type,
		entry,
		inputValue = '',
		preview = '',
		isSelected = false,
		onclick
	}: Props = $props();
</script>

<button
	type="button"
	class="popover-option"
	class:selected={isSelected}
	data-testid={type === 'new' ? 'create-new-entry-option' : 'search-result-option'}
	role="option"
	aria-selected={isSelected}
	{onclick}
	tabindex="-1"
>
	{#if type === 'new'}
		<div class="option-icon">
			<Icon name="plus" size={20} />
		</div>
		<div class="option-content">
			{#if inputValue.trim()}
				<div class="option-title">Add New Entry: "{inputValue.trim()}"</div>
				<div class="option-subtitle">Create a new note with this title</div>
			{:else}
				<div class="option-title">Add New Entry</div>
				<div class="option-subtitle">Create a new note or document</div>
			{/if}
		</div>
	{:else if entry}
		<div class="option-icon option-icon-result">
			<Icon name="file" size={20} />
		</div>
		<div class="option-content">
			<div class="option-title-row">
				<div class="option-title">{entry.title}</div>
				{#if entry.tags && entry.tags.length > 0}
					<div class="option-tags">
						{#each entry.tags as tag (tag)}
							<Tag {tag} size="small" />
						{/each}
					</div>
				{/if}
			</div>
			<div class="option-subtitle">{preview}</div>
		</div>
	{/if}
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
		background: linear-gradient(135deg, var(--color-primary) 0%, #c4b5fd 100%);
		color: var(--color-text-inverted);
		flex-shrink: 0;
	}

	.option-icon-result {
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

	.option-tags {
		display: flex;
		gap: var(--spacing-xs);
		flex-wrap: nowrap;
		flex-shrink: 0;
		overflow: hidden;
	}

	.option-subtitle {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* Mobile optimization */
	@media (max-width: 768px) {
		.popover-option {
			padding: var(--spacing-sm) var(--spacing-md);
		}

		.option-icon {
			width: 36px;
			height: 36px;
		}
	}
</style>
