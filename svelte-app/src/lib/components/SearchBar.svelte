<script lang="ts">
	import { onMount } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Icon from './Icon.svelte';
	import SearchResultOption from './SearchResultOption.svelte';
	import TagSelectorPopover from './TagSelectorPopover.svelte';
	import {
		searchEntries,
		searchEntriesByTag,
		extractEntryIdsFromContent,
		loadEntryTitles
	} from '$lib/services/entries';
	import { parseMarkdown } from '$lib/services/markdown';
	import type { Entry } from '$lib/types/Entry';

	interface Props {
		onSubmit?: (value: string) => void;
		onNewEntry?: () => void;
		autoFocus?: boolean;
	}

	const { onSubmit, onNewEntry, autoFocus = false }: Props = $props();

	let inputValue = $state('');
	let isFocused = $state(false);
	let selectedIndex = $state(0);
	let inputElement: HTMLInputElement | undefined = $state();
	let popoverElement: HTMLDivElement | undefined = $state();
	let searchResults = $state<Entry[]>([]);
	let entryTitles = $state<Map<string, string>>(new Map());

	// Tag selector popover state
	let showTagPopover = $state(false);
	let tagPopoverPosition = $state({ x: 0, y: 0 });
	let tagSearchTerm = $state('');
	let tagStartPos = $state(0);
	let tagSelectorRef:
		| { handleExternalKeydown: (e: KeyboardEvent) => void; hasAvailableTags: () => boolean }
		| undefined = $state();

	// Auto-focus on mount if requested
	onMount(() => {
		if (autoFocus && inputElement) {
			inputElement.focus();
		}
	});

	// Check if # was just typed to trigger tag selector
	function checkForTagTrigger(input: HTMLInputElement): void {
		const text = input.value;
		const cursorPos = input.selectionStart ?? 0;

		// Look backwards from cursor to find #
		const textBeforeCursor = text.substring(0, cursorPos);

		// Find the last # that's either at the start or preceded by whitespace
		let lastHashPos = -1;
		for (let i = textBeforeCursor.length - 1; i >= 0; i--) {
			if (textBeforeCursor[i] === '#') {
				// Check if it's at the start or preceded by whitespace
				if (i === 0 || /\s/.test(textBeforeCursor[i - 1])) {
					lastHashPos = i;
					break;
				}
			} else if (/\s/.test(textBeforeCursor[i])) {
				// Stop at whitespace if we haven't found a # yet
				break;
			}
		}

		// Check if we have a valid # trigger
		if (lastHashPos !== -1) {
			const textAfterHash = textBeforeCursor.substring(lastHashPos + 1);

			// Only show popover if we have # followed by word characters (no spaces)
			if (!textAfterHash.includes(' ') && /^\w*$/.test(textAfterHash)) {
				tagSearchTerm = textAfterHash;
				tagStartPos = lastHashPos;

				// Calculate popover position
				const rect = input.getBoundingClientRect();
				tagPopoverPosition = {
					x: rect.left,
					y: rect.bottom + 5
				};

				showTagPopover = true;
				return;
			}
		}

		// Hide popover if no valid # trigger found
		showTagPopover = false;
	}

	// Handle tag selection from popover
	function handleTagSelect(tag: string): void {
		if (!inputElement) return;

		// Replace # and search term with the selected tag
		const beforeTag = inputValue.substring(0, tagStartPos);
		const cursorPos = inputElement.selectionStart ?? 0;
		const afterCursor = inputValue.substring(cursorPos);

		const tagText = `#${tag}`;

		inputValue = beforeTag + tagText + afterCursor;

		// Move cursor after the inserted tag
		const newCursorPos = tagStartPos + tagText.length;

		// Update input and trigger search
		setTimeout(() => {
			if (inputElement) {
				inputElement.focus();
				inputElement.selectionStart = inputElement.selectionEnd = newCursorPos;
			}
		}, 0);

		showTagPopover = false;
	}

	// Close tag popover
	function handleTagPopoverClose(): void {
		showTagPopover = false;
	}

	// Search entries when input changes
	$effect(() => {
		const searchTerm = inputValue.trim();
		if (searchTerm) {
			// Check if searching by tag (starts with #)
			if (searchTerm.startsWith('#')) {
				const tag = searchTerm.substring(1).trim();
				if (tag) {
					void searchEntriesByTag(tag)
						.then((results) => {
							searchResults = results;
							// Load titles for all entry IDs found in search results
							void loadTitlesForResults(results);
						})
						.catch((err) => {
							console.error('Tag search failed:', err);
							searchResults = [];
						});
				} else {
					searchResults = [];
					entryTitles = new Map();
				}
			} else {
				void searchEntries(searchTerm)
					.then((results) => {
						searchResults = results;
						// Load titles for all entry IDs found in search results
						void loadTitlesForResults(results);
					})
					.catch((err) => {
						console.error('Search failed:', err);
						searchResults = [];
					});
			}
		} else {
			searchResults = [];
			entryTitles = new Map();
		}
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

	// Create dynamic placeholder with current time
	const dynamicPlaceholder = $derived.by(() => {
		const now = new Date();
		const timeStr = now.toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		});
		const dateStr = now.toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric'
		});
		return `Diane, it's ${timeStr}, ${dateStr}...`;
	});

	// All popover options (add new entry + search results)
	const popoverOptions = $derived.by(() => {
		const options: Array<{ type: 'new' | 'result'; data?: Entry }> = [{ type: 'new' }];
		searchResults.forEach((result) => options.push({ type: 'result', data: result }));
		return options;
	});

	// Reset selection when options change
	$effect(() => {
		if (popoverOptions.length > 0) {
			selectedIndex = 0;
		}
	});

	// Expose focus method to parent
	export function focus(): void {
		inputElement?.focus();
	}

	function handleSubmit(e: SubmitEvent): void {
		e.preventDefault();
		if (inputValue.trim() && onSubmit) {
			onSubmit(inputValue.trim());
			inputValue = '';
			inputElement?.blur();
		}
	}

	function handleFocus(): void {
		isFocused = true;
	}

	function handleInput(e: Event): void {
		const target = e.target as HTMLInputElement;
		checkForTagTrigger(target);
	}

	function handleBlur(e: FocusEvent): void {
		// Delay blur to allow clicks on popover items
		const relatedTarget = e.relatedTarget as HTMLElement;
		if (popoverElement?.contains(relatedTarget)) {
			return;
		}
		setTimeout(() => {
			isFocused = false;
			showTagPopover = false;
		}, 150);
	}

	function handleKeydown(e: KeyboardEvent): void {
		// If tag popover is open, handle Enter specially
		if (showTagPopover && e.key === 'Enter') {
			e.preventDefault();
			// If there are available tags, let the popover handle selection
			const hasMatches = tagSelectorRef?.hasAvailableTags?.() ?? false;
			if (hasMatches) {
				// Let the tag selector handle the Enter key
				if (tagSelectorRef?.handleExternalKeydown) {
					tagSelectorRef.handleExternalKeydown(e);
				}
			}
			// If no matches, don't create a new tag - just close the popover
			showTagPopover = false;
			return;
		}

		// If tag popover is open, let it handle arrow keys
		if (showTagPopover && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
			e.preventDefault();
			if (tagSelectorRef?.handleExternalKeydown) {
				tagSelectorRef.handleExternalKeydown(e);
			}
			return;
		}

		// Handle Escape to close tag popover
		if (e.key === 'Escape' && showTagPopover) {
			e.preventDefault();
			showTagPopover = false;
			return;
		}

		// Original key handlers for search results
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				selectedIndex = (selectedIndex + 1) % popoverOptions.length;
				break;
			case 'ArrowUp':
				e.preventDefault();
				selectedIndex = selectedIndex === 0 ? popoverOptions.length - 1 : selectedIndex - 1;
				break;
			case 'Enter':
				e.preventDefault();
				selectOption(selectedIndex);
				break;
			case 'Escape':
				e.preventDefault();
				inputElement?.blur();
				isFocused = false;
				break;
		}
	}

	function selectOption(index: number): void {
		const option = popoverOptions[index];
		if (!option) return;

		if (option.type === 'new') {
			// Navigate to new entry page with initial title
			const encodedTitle = encodeURIComponent(inputValue.trim());
			const newEntryPath = resolve('/entries/new');
			// Construct URL with query parameter - path is already resolved
			// eslint-disable-next-line svelte/no-navigation-without-resolve
			void goto(`${newEntryPath}?title=${encodedTitle}`);
			isFocused = false;
			onNewEntry?.();
			inputValue = '';
		} else if (option.type === 'result' && option.data) {
			// Navigate to the entry page
			void goto(resolve('/entries/[entryId]', { entryId: option.data.id }));
		}
	}

	function handleOptionClick(index: number): void {
		selectOption(index);
	}

	// Get preview text for an entry (first 100 chars, rendering wiki links as their display names)
	function getEntryPreview(entry: Entry): string {
		if (!entry.content) return '';

		// Simply replace double newlines with spaces to separate blocks,
		// then parse markdown to resolve wiki links
		const contentWithSpaces = entry.content.replace(/\n\n+/g, ' ');

		// Parse to resolve wiki links
		const parsed = parseMarkdown(contentWithSpaces, -1, entryTitles);

		// Extract text content from HTML
		const div = document.createElement('div');
		div.innerHTML = parsed.html;
		const textContent = div.textContent || div.innerText || '';

		return textContent.trim().substring(0, 100);
	}
</script>

<div class="search-container">
	<form class="search-form" class:focused={isFocused} onsubmit={handleSubmit}>
		<div class="input-wrapper">
			<input
				bind:this={inputElement}
				type="text"
				class="search-input"
				placeholder={dynamicPlaceholder}
				bind:value={inputValue}
				onfocus={handleFocus}
				onblur={handleBlur}
				onkeydown={handleKeydown}
				oninput={handleInput}
				aria-label="Search input"
				aria-controls="search-popover"
				aria-activedescendant={`option-${selectedIndex}`}
			/>
			{#if inputValue.trim()}
				<button type="submit" class="submit-button" aria-label="Submit search">
					<Icon name="arrow-right" size={20} />
				</button>
			{/if}
		</div>
	</form>

	<div
		bind:this={popoverElement}
		id="search-popover"
		class="popover"
		class:hidden={showTagPopover}
		role="listbox"
		aria-label="Search options"
	>
		{#each popoverOptions as option, index (index)}
			<SearchResultOption
				type={option.type}
				entry={option.data}
				{inputValue}
				preview={option.data ? getEntryPreview(option.data) : ''}
				isSelected={index === selectedIndex}
				onclick={() => handleOptionClick(index)}
			/>
		{/each}
	</div>
</div>

{#if showTagPopover}
	<div style="position: fixed; z-index: 10000; pointer-events: auto;">
		<TagSelectorPopover
			bind:this={tagSelectorRef}
			searchTerm={tagSearchTerm}
			position={tagPopoverPosition}
			onSelect={handleTagSelect}
			onClose={handleTagPopoverClose}
			allowCreate={false}
		/>
	</div>
{/if}

<style>
	.search-container {
		width: 100%;
		max-width: 800px;
		margin: 0 auto;
		position: relative;
	}

	.search-form {
		width: 100%;
		background: var(--color-surface);
		border: 2px solid var(--color-border);
		border-radius: var(--radius-xl);
		padding: var(--spacing-sm);
		transition: all var(--transition-normal);
		box-shadow: var(--shadow-sm);
	}

	.search-form:hover {
		border-color: var(--color-border-hover);
		box-shadow: var(--shadow-md);
	}

	.search-form.focused {
		border-color: var(--color-primary);
		box-shadow: var(--shadow-lg);
	}

	.input-wrapper {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
	}

	.search-input {
		flex: 1;
		border: none;
		outline: none;
		background: transparent;
		font-size: var(--font-size-lg);
		color: var(--color-text);
		padding: var(--spacing-md);
		font-weight: var(--font-weight-normal);
	}

	.search-input::placeholder {
		color: var(--color-text-tertiary);
	}

	.submit-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border: none;
		background: var(--color-primary);
		color: var(--color-text-inverted);
		border-radius: var(--radius-lg);
		cursor: pointer;
		transition: all var(--transition-fast);
		flex-shrink: 0;
	}

	.submit-button:hover {
		background: var(--color-primary-hover);
		transform: translateX(2px);
	}

	.submit-button:active {
		transform: scale(0.95);
	}

	/* Popover styles */
	.popover {
		position: absolute;
		top: calc(100% + var(--spacing-sm));
		left: 0;
		right: 0;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl);
		box-shadow: var(--shadow-lg);
		overflow: hidden;
		z-index: var(--z-dropdown);
		max-height: 400px;
		overflow-y: auto;
	}

	.popover.hidden {
		display: none;
	}

	/* Mobile optimization */
	@media (max-width: 768px) {
		.search-form {
			padding: var(--spacing-xs);
		}

		.search-input {
			font-size: var(--font-size-md);
			padding: var(--spacing-sm);
		}

		.submit-button {
			width: 36px;
			height: 36px;
		}

		.popover {
			max-height: 300px;
		}
	}
</style>
