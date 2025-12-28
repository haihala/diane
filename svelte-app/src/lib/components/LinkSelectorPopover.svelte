<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import Tag from './Tag.svelte';
	import EmptyState from './EmptyState.svelte';
	import PopoverOption from './PopoverOption.svelte';
	import {
		searchEntries,
		extractEntryIdsFromContent,
		loadEntryTitles
	} from '$lib/services/entries';
	import { parseMarkdown } from '$lib/services/markdown';
	import type { Entry } from '$lib/types/Entry';

	interface Props {
		searchTerm: string;
		position: { x: number; y: number };
		onSelect: (entry: Entry) => void;
		onClose: () => void;
		currentEntryId?: string; // ID of the current entry to exclude from results
	}

	const { searchTerm, position, onSelect, onClose, currentEntryId }: Props = $props();

	let searchResults = $state<Entry[]>([]);
	let selectedIndex = $state(0);
	let entryTitles = $state<Map<string, string>>(new Map());

	// Search entries when searchTerm changes
	$effect(() => {
		const term = searchTerm.trim();
		void searchEntries(term)
			.then((results) => {
				// Filter out the current entry
				searchResults = currentEntryId
					? results.filter((entry) => entry.id !== currentEntryId)
					: results;
				selectedIndex = 0;

				// Load titles for all entry IDs found in search results
				void loadTitlesForResults(results);
			})
			.catch((err) => {
				console.error('Link search failed:', err);
				searchResults = [];
			});
	});

	async function loadTitlesForResults(results: Entry[]): Promise<void> {
		try {
			// Extract all entry IDs from all results' content
			const allEntryIds = new SvelteSet<string>();
			for (const result of results) {
				const ids = extractEntryIdsFromContent(result.content);
				ids.forEach((id) => allEntryIds.add(id));
			}

			if (allEntryIds.size > 0) {
				const titleMap = await loadEntryTitles([...allEntryIds]);
				entryTitles = titleMap;
			} else {
				entryTitles = new Map();
			}
		} catch (err) {
			console.error('Failed to load entry titles:', err);
			// Keep existing titles on error
		}
	}

	// Get preview text with resolved wiki links
	function getEntryPreview(entry: Entry): string {
		if (!entry.content) return '';

		// Parse the content to resolve wiki links
		const parsed = parseMarkdown(entry.content, -1, entryTitles);

		// Extract text content from HTML
		const div = document.createElement('div');
		div.innerHTML = parsed.html;
		const textContent = div.textContent || div.innerText || '';

		return textContent.trim().substring(0, 100);
	}

	function handleKeydown(e: KeyboardEvent): void {
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				selectedIndex = (selectedIndex + 1) % searchResults.length;
				break;
			case 'ArrowUp':
				e.preventDefault();
				selectedIndex = selectedIndex === 0 ? searchResults.length - 1 : selectedIndex - 1;
				break;
			case 'Enter':
				e.preventDefault();
				if (searchResults[selectedIndex]) {
					onSelect(searchResults[selectedIndex]);
				}
				break;
			case 'Escape':
				e.preventDefault();
				onClose();
				break;
		}
	}

	function handleOptionClick(entry: Entry): void {
		onSelect(entry);
	}

	// Expose the keydown handler so parent can forward events
	export function handleExternalKeydown(e: KeyboardEvent): void {
		handleKeydown(e);
	}
</script>

<div
	class="link-selector-popover"
	role="listbox"
	aria-label="Select link target"
	style="left: {position.x}px; top: {position.y}px"
>
	{#if searchResults.length === 0}
		<EmptyState icon="search" message="No entries found" />
	{:else}
		{#each searchResults as entry, index (entry.id)}
			<PopoverOption
				icon="file"
				title={entry.title}
				subtitle={entry.content ? getEntryPreview(entry) : undefined}
				variant="result"
				isSelected={index === selectedIndex}
				onclick={() => handleOptionClick(entry)}
			>
				{#snippet extras()}
					{#if entry.tags && entry.tags.length > 0}
						<div class="option-tags">
							{#each entry.tags as tag (tag)}
								<Tag {tag} size="small" />
							{/each}
						</div>
					{/if}
				{/snippet}
			</PopoverOption>
		{/each}
	{/if}
</div>

<style>
	.link-selector-popover {
		position: fixed;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-lg);
		overflow: hidden;
		z-index: 10000;
		max-height: 300px;
		min-width: 300px;
		overflow-y: auto;
	}

	.option-tags {
		display: flex;
		gap: var(--spacing-xs);
		flex-wrap: nowrap;
		flex-shrink: 0;
		overflow: hidden;
	}
</style>
