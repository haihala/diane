<script lang="ts">
	import Tag from '../common/Tag.svelte';
	import EmptyState from '../common/EmptyState.svelte';
	import PopoverOption from '../common/PopoverOption.svelte';
	import { getAllEntries } from '$lib/services/entries';

	interface Props {
		searchTerm: string;
		position: { x: number; y: number };
		onSelect: (tag: string) => void;
		onClose: () => void;
		allowCreate?: boolean;
	}

	const { searchTerm, position, onSelect, onClose, allowCreate = true }: Props = $props();

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
		<EmptyState
			icon="tag"
			message={searchTerm.trim() ? `No existing tags match "${searchTerm}"` : 'No tags yet'}
		>
			{#snippet action()}
				{#if allowCreate && searchTerm.trim()}
					<div class="create-hint">
						Press <kbd>Enter</kbd> to add <Tag tag={searchTerm.trim()} size="small" />
					</div>
				{/if}
			{/snippet}
		</EmptyState>
	{:else}
		{#each availableTags as tag, index (tag)}
			<PopoverOption
				icon="grid"
				title=""
				variant="default"
				isSelected={index === selectedIndex}
				onclick={() => handleOptionClick(tag)}
			>
				{#snippet extras()}
					<Tag {tag} size="small" />
				{/snippet}
			</PopoverOption>
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
</style>
