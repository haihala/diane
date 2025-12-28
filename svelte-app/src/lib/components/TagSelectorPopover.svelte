<script lang="ts">
	import Icon from './Icon.svelte';
	import Tag from './Tag.svelte';
	import { getAllEntries } from '$lib/services/entries';

	interface Props {
		searchTerm: string;
		position: { x: number; y: number };
		onSelect: (tag: string) => void;
		onClose: () => void;
	}

	const { searchTerm, position, onSelect, onClose }: Props = $props();

	let availableTags = $state<string[]>([]);
	let selectedIndex = $state(0);

	// Fetch all tags when component mounts and filter based on search term
	$effect(() => {
		// Capture searchTerm outside the promise to ensure reactivity tracking
		const term = searchTerm.toLowerCase().trim();

		void getAllEntries()
			.then((entries) => {
				// Extract all unique tags from all entries
				const allUniqueTagsMap: Record<string, boolean> = {};
				entries.forEach((entry) => {
					entry.tags?.forEach((tag) => {
						allUniqueTagsMap[tag] = true;
					});
				});

				// Convert to array and filter by search term
				const allTags = Object.keys(allUniqueTagsMap);

				if (term) {
					availableTags = allTags.filter((tag) => tag.toLowerCase().includes(term)).sort();
				} else {
					availableTags = allTags.sort();
				}

				selectedIndex = 0;
			})
			.catch((err) => {
				console.error('Failed to load tags:', err);
				availableTags = [];
			});
	});

	function handleKeydown(e: KeyboardEvent): void {
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				selectedIndex = (selectedIndex + 1) % availableTags.length;
				break;
			case 'ArrowUp':
				e.preventDefault();
				selectedIndex = selectedIndex === 0 ? availableTags.length - 1 : selectedIndex - 1;
				break;
			case 'Enter':
				e.preventDefault();
				if (availableTags[selectedIndex]) {
					onSelect(availableTags[selectedIndex]);
				}
				break;
			case 'Escape':
				e.preventDefault();
				onClose();
				break;
		}
	}

	function handleOptionClick(tag: string): void {
		onSelect(tag);
	}

	// Expose the keydown handler so parent can forward events
	export function handleExternalKeydown(e: KeyboardEvent): void {
		handleKeydown(e);
	}

	// Expose whether there are available tags for the parent to check
	export function hasAvailableTags(): boolean {
		return availableTags.length > 0;
	}
</script>

<div
	class="tag-selector-popover"
	role="listbox"
	aria-label="Select tag"
	style="left: {position.x}px; top: {position.y}px"
>
	{#if availableTags.length === 0}
		<div class="no-results">
			<div class="no-results-icon">
				<Icon name="search" size={24} />
			</div>
			<div class="no-results-text">
				{#if searchTerm.trim()}
					No existing tags match "{searchTerm}"
				{:else}
					No tags yet
				{/if}
			</div>
			{#if searchTerm.trim()}
				<div class="create-hint">
					Press <kbd>Enter</kbd> to add <Tag tag={searchTerm.trim()} size="small" />
				</div>
			{/if}
		</div>
	{:else}
		{#each availableTags as tag, index (tag)}
			<button
				type="button"
				class="popover-option"
				class:selected={index === selectedIndex}
				role="option"
				aria-selected={index === selectedIndex}
				onmousedown={(e) => e.preventDefault()}
				onclick={() => handleOptionClick(tag)}
			>
				<div class="option-icon">
					<Icon name="grid" size={20} />
				</div>
				<div class="option-content">
					<Tag {tag} size="small" />
				</div>
			</button>
		{/each}
	{/if}
</div>

<style>
	.tag-selector-popover {
		position: fixed;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-lg);
		overflow: hidden;
		z-index: 10000;
		max-height: 300px;
		min-width: 250px;
		overflow-y: auto;
		pointer-events: auto;
	}

	.no-results {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: var(--spacing-xl);
		text-align: center;
		gap: var(--spacing-md);
	}

	.no-results-icon {
		color: var(--color-text-secondary);
	}

	.no-results-text {
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
	}

	.create-hint {
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
	}

	.create-hint kbd {
		padding: 2px 6px;
		border: 1px solid var(--color-border);
		background: var(--color-bg);
		border-radius: var(--radius-sm);
		font-family: monospace;
		font-size: var(--font-size-xs);
	}

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
		width: 36px;
		height: 36px;
		border-radius: var(--radius-md);
		background: var(--color-bg-tertiary);
		color: var(--color-text-secondary);
		flex-shrink: 0;
	}

	.option-content {
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: center;
	}
</style>
