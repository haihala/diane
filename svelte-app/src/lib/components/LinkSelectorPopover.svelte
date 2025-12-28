<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import Icon from './Icon.svelte';
	import Tag from './Tag.svelte';
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
		<div class="no-results">
			<div class="no-results-icon">
				<Icon name="search" size={24} />
			</div>
			<div class="no-results-text">No entries found</div>
		</div>
	{:else}
		{#each searchResults as entry, index (entry.id)}
			<button
				type="button"
				class="popover-option"
				class:selected={index === selectedIndex}
				role="option"
				aria-selected={index === selectedIndex}
				onmousedown={(e) => e.preventDefault()}
				onclick={() => handleOptionClick(entry)}
			>
				<div class="option-icon">
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
					{#if entry.content}
						<div class="option-subtitle">{getEntryPreview(entry)}</div>
					{/if}
				</div>
			</button>
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

	.no-results {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: var(--spacing-xl);
		text-align: center;
	}

	.no-results-icon {
		color: var(--color-text-secondary);
		margin-bottom: var(--spacing-sm);
	}

	.no-results-text {
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
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
</style>
