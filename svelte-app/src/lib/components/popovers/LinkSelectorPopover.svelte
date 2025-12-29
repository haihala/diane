<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import DOMPurify from 'dompurify';
	import Tag from '../common/Tag.svelte';
	import EmptyState from '../common/EmptyState.svelte';
	import PopoverOption from '../common/PopoverOption.svelte';
	import {
		searchEntries,
		extractEntryIdsFromContent,
		loadEntryTitles
	} from '$lib/services/entries';
	import { parseMarkdown } from '$lib/services/markdown';
	import { toast } from '$lib/services/toast';
	import type { Entry } from '$lib/types/Entry';

	interface Props {
		searchTerm: string;
		position: { x: number; y: number };
		onSelect: (entry: Entry) => void;
		onClose: () => void;
		onCreateNew?: (title: string) => void;
		currentEntryId?: string; // ID of the current entry to exclude from results
	}

	const { searchTerm, position, onSelect, onClose, onCreateNew, currentEntryId }: Props = $props();

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
				toast.error('Link search failed');
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
			toast.error('Failed to load entry titles');
			// Keep existing titles on error
		}
	}

	// Get preview text with resolved wiki links
	function getEntryPreview(entry: Entry): string {
		if (!entry.content) return '';

		// Parse the content to resolve wiki links
		const parsed = parseMarkdown(entry.content, -1, entryTitles);

		// Sanitize HTML to prevent XSS before setting innerHTML
		const sanitizedHtml = DOMPurify.sanitize(parsed.html);

		// Extract text content from HTML
		const div = document.createElement('div');
		div.innerHTML = sanitizedHtml;
		const textContent = div.textContent || div.innerText || '';

		return textContent.trim().substring(0, 100);
	}

	function handleKeydown(e: KeyboardEvent): void {
		// Total options = search results + create new option (if available)
		const totalOptions = searchResults.length + (onCreateNew && searchTerm.trim() ? 1 : 0);

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				selectedIndex = (selectedIndex + 1) % totalOptions;
				break;
			case 'ArrowUp':
				e.preventDefault();
				selectedIndex = selectedIndex === 0 ? totalOptions - 1 : selectedIndex - 1;
				break;
			case 'Enter':
				e.preventDefault();
				// If on the "Create new" option (last index when results exist or first when no results)
				if (searchResults.length === 0 && onCreateNew && searchTerm.trim()) {
					handleCreateNew();
				} else if (selectedIndex === searchResults.length && onCreateNew && searchTerm.trim()) {
					handleCreateNew();
				} else if (searchResults[selectedIndex]) {
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

	function handleCreateNew(): void {
		if (onCreateNew && searchTerm.trim()) {
			onCreateNew(searchTerm.trim());
		}
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
		{#if onCreateNew && searchTerm.trim()}
			<PopoverOption
				icon="plus"
				title="Create '{searchTerm}'"
				subtitle="Create a new note with this title"
				variant="result"
				isSelected={selectedIndex === 0}
				onclick={handleCreateNew}
			/>
		{:else}
			<EmptyState icon="search" message="No entries found" />
		{/if}
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
		{#if onCreateNew && searchTerm.trim()}
			<PopoverOption
				icon="plus"
				title="Create '{searchTerm}'"
				subtitle="Create a new note with this title"
				variant="result"
				isSelected={selectedIndex === searchResults.length}
				onclick={handleCreateNew}
			/>
		{/if}
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
