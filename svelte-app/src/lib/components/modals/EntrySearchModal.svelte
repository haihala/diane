<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import DOMPurify from 'dompurify';
	import Button from '$lib/components/common/Button.svelte';
	import EmptyState from '$lib/components/common/EmptyState.svelte';
	import PopoverOption from '$lib/components/common/PopoverOption.svelte';
	import Tag from '$lib/components/common/Tag.svelte';
	import LoadingSpinner from '$lib/components/common/LoadingSpinner.svelte';
	import {
		searchEntries,
		extractEntryIdsFromContent,
		loadEntryTitles
	} from '$lib/services/entries';
	import { parseMarkdown } from '$lib/services/markdown';
	import { toast } from '$lib/services/toast';
	import type { Entry } from '$lib/types/Entry';
	import { focusTrap } from '$lib/utils/focusTrap';

	interface Props {
		isOpen: boolean;
		title?: string;
		subtitle?: string;
		excludeEntryIds?: string[];
		loading?: boolean;
		error?: string | null;
		onClose: () => void;
		onSelect: (entry: Entry) => void;
	}

	const {
		isOpen,
		title = 'Search Your Entries',
		subtitle = 'Find an entry',
		excludeEntryIds = [],
		loading = false,
		error = null,
		onClose,
		onSelect
	}: Props = $props();

	let searchTerm = $state('');
	let searchResults = $state<Entry[]>([]);
	let selectedIndex = $state(0);
	let entryTitles = $state<Map<string, string>>(new Map());
	let searchInputElement: HTMLInputElement | undefined = $state();

	// Search entries when searchTerm changes
	$effect(() => {
		const term = searchTerm.trim();
		if (term && isOpen) {
			void searchEntries(term)
				.then((results) => {
					// Filter out excluded entries
					const excludeSet = new Set(excludeEntryIds);
					searchResults = results.filter((entry) => !excludeSet.has(entry.id));
					selectedIndex = 0;
					void loadTitlesForResults(searchResults);
				})
				.catch((err) => {
					console.error('Search failed:', err);
					toast.error('Search failed');
					searchResults = [];
				});
		} else {
			searchResults = [];
			entryTitles = new Map();
		}
	});

	// Focus input when modal opens
	$effect(() => {
		if (isOpen) {
			setTimeout(() => {
				searchInputElement?.focus();
			}, 0);
		}
	});

	async function loadTitlesForResults(results: Entry[]): Promise<void> {
		try {
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
		}
	}

	function getEntryPreview(entry: Entry): string {
		if (!entry.content) return '';

		const parsed = parseMarkdown(entry.content, -1, entryTitles);

		// Sanitize HTML to prevent XSS before setting innerHTML
		const sanitizedHtml = DOMPurify.sanitize(parsed.html);

		const div = document.createElement('div');
		div.innerHTML = sanitizedHtml;
		const textContent = div.textContent || div.innerText || '';

		return textContent.trim().substring(0, 100);
	}

	function handleSearchKeydown(e: KeyboardEvent): void {
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				if (searchResults.length > 0) {
					selectedIndex = (selectedIndex + 1) % searchResults.length;
				}
				break;
			case 'ArrowUp':
				e.preventDefault();
				if (searchResults.length > 0) {
					selectedIndex = selectedIndex === 0 ? searchResults.length - 1 : selectedIndex - 1;
				}
				break;
			case 'Enter':
				e.preventDefault();
				if (searchResults[selectedIndex]) {
					onSelect(searchResults[selectedIndex]);
				}
				break;
			case 'Escape':
				e.preventDefault();
				handleClose();
				break;
		}
	}

	function handleClose(): void {
		searchTerm = '';
		searchResults = [];
		onClose();
	}
</script>

{#if isOpen}
	<div class="search-modal" role="dialog" aria-modal="true" aria-labelledby="search-title">
		<button
			class="search-modal-backdrop"
			onclick={handleClose}
			aria-label="Close search"
			type="button"
		></button>
		<div class="search-modal-content" use:focusTrap>
			<div class="search-header">
				<h2 id="search-title" class="search-title">{title}</h2>
				<p class="search-subtitle">{subtitle}</p>
			</div>

			{#if error}
				<div class="modal-error">
					<p class="error-message">{error}</p>
				</div>
			{/if}

			<div class="search-input-container">
				<input
					bind:this={searchInputElement}
					type="text"
					class="search-input"
					placeholder="Search entries..."
					bind:value={searchTerm}
					onkeydown={handleSearchKeydown}
					aria-label="Search entries"
					disabled={loading}
				/>
			</div>

			<div class="search-results">
				{#if loading}
					<LoadingSpinner message="Loading..." />
				{:else if searchTerm.trim() === ''}
					<EmptyState icon="search" message="Start typing to search your entries" />
				{:else if searchResults.length === 0}
					<EmptyState icon="search" message="No entries found" />
				{:else}
					{#each searchResults as entry, index (entry.id)}
						<PopoverOption
							icon="file"
							title={entry.title}
							subtitle={entry.content ? getEntryPreview(entry) : undefined}
							variant="result"
							isSelected={index === selectedIndex}
							onclick={() => onSelect(entry)}
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

			<div class="search-footer">
				<Button variant="secondary" onclick={handleClose}>Cancel</Button>
			</div>
		</div>
	</div>
{/if}

<style>
	.search-modal {
		position: fixed;
		inset: 0;
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--spacing-xl);
	}

	.search-modal-backdrop {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(4px);
		border: none;
		padding: 0;
		cursor: pointer;
	}

	.search-modal-content {
		position: relative;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl);
		box-shadow: var(--shadow-lg);
		width: 100%;
		max-width: 600px;
		max-height: 80vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.search-header {
		padding: var(--spacing-xl);
		border-bottom: 1px solid var(--color-border);
	}

	.search-title {
		font-size: var(--font-size-xl);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
		margin-bottom: var(--spacing-xs);
	}

	.search-subtitle {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}

	.modal-error {
		padding: var(--spacing-md) var(--spacing-lg);
		background: rgba(239, 68, 68, 0.1);
		border-bottom: 1px solid rgba(239, 68, 68, 0.3);
	}

	.error-message {
		color: #ef4444;
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		margin: 0;
	}

	.search-input-container {
		padding: var(--spacing-lg);
		border-bottom: 1px solid var(--color-border);
	}

	.search-input {
		width: 100%;
		padding: var(--spacing-md);
		font-size: var(--font-size-md);
		color: var(--color-text);
		background: var(--color-bg);
		border: 2px solid var(--color-border);
		border-radius: var(--radius-lg);
		outline: none;
		transition: border-color 0.2s ease;
	}

	.search-input:focus {
		border-color: var(--color-primary);
	}

	.search-input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.search-input::placeholder {
		color: var(--color-text-tertiary);
	}

	.search-results {
		flex: 1;
		overflow-y: auto;
		min-height: 200px;
	}

	.option-tags {
		display: flex;
		gap: var(--spacing-xs);
		flex-wrap: nowrap;
		flex-shrink: 0;
		overflow: hidden;
	}

	.search-footer {
		padding: var(--spacing-lg);
		border-top: 1px solid var(--color-border);
		display: flex;
		justify-content: flex-end;
		gap: var(--spacing-md);
	}

	/* Mobile responsiveness */
	@media (max-width: 768px) {
		.search-modal {
			padding: var(--spacing-md);
		}

		.search-modal-content {
			max-height: 90vh;
		}

		.search-header,
		.search-input-container,
		.search-footer {
			padding: var(--spacing-md);
		}
	}
</style>
