<script lang="ts">
	import { onMount } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import EntryModal from './EntryModal.svelte';
	import Icon from './Icon.svelte';
	import {
		searchEntries,
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
	let isModalOpen = $state(false);
	let selectedIndex = $state(0);
	let inputElement: HTMLInputElement | undefined = $state();
	let popoverElement: HTMLDivElement | undefined = $state();
	let searchResults = $state<Entry[]>([]);
	let entryTitles = $state<Map<string, string>>(new Map());

	// Auto-focus on mount if requested
	onMount(() => {
		if (autoFocus && inputElement) {
			inputElement.focus();
		}
	});

	// Search entries when input changes
	$effect(() => {
		const searchTerm = inputValue.trim();
		if (searchTerm) {
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

	function handleBlur(e: FocusEvent): void {
		// Delay blur to allow clicks on popover items
		const relatedTarget = e.relatedTarget as HTMLElement;
		if (popoverElement?.contains(relatedTarget)) {
			return;
		}
		setTimeout(() => {
			isFocused = false;
		}, 150);
	}

	function handleKeydown(e: KeyboardEvent): void {
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
			isModalOpen = true;
			isFocused = false;
		} else if (option.type === 'result' && option.data) {
			// Navigate to the entry page (which will open the modal)
			void goto(resolve(`/entries/${option.data.id}`));
		}
	}

	function handleOptionClick(index: number): void {
		selectOption(index);
	}

	function handleModalClose(): void {
		isModalOpen = false;
		inputElement?.focus();
	}

	function handleModalSave(): void {
		onNewEntry?.();
		inputValue = '';
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
		role="listbox"
		aria-label="Search options"
	>
		{#each popoverOptions as option, index (index)}
			<button
				type="button"
				id="option-{index}"
				class="popover-option"
				class:selected={index === selectedIndex}
				role="option"
				aria-selected={index === selectedIndex}
				onclick={() => handleOptionClick(index)}
				tabindex="-1"
			>
				{#if option.type === 'new'}
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
				{:else if option.data}
					<div class="option-icon option-icon-result">
						<Icon name="file" size={20} />
					</div>
					<div class="option-content">
						<div class="option-title">{option.data.title}</div>
						<div class="option-subtitle">{getEntryPreview(option.data)}</div>
					</div>
				{/if}
			</button>
		{/each}
	</div>
</div>

<EntryModal
	isOpen={isModalOpen}
	onClose={handleModalClose}
	onSave={handleModalSave}
	initialTitle={inputValue.trim()}
/>

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
	}

	.option-title {
		font-size: var(--font-size-md);
		font-weight: var(--font-weight-medium);
		color: var(--color-text);
		margin-bottom: var(--spacing-xs);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
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

		.popover-option {
			padding: var(--spacing-sm) var(--spacing-md);
		}

		.option-icon {
			width: 36px;
			height: 36px;
		}
	}
</style>
