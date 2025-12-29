<script lang="ts">
	import { goto, beforeNavigate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import MarkdownEditor from '../editor/MarkdownEditor.svelte';
	import Button from '../common/Button.svelte';
	import BacklinksList from '../entries/BacklinksList.svelte';
	import TagInput from '../editor/TagInput.svelte';
	import PageLayout from '../layouts/PageLayout.svelte';
	import { createEntry, updateEntry, deleteEntry, getBacklinks } from '$lib/services/entries';
	import type { Entry } from '$lib/types/Entry';
	import { toast } from '$lib/services/toast';
	import { getWikiById } from '$lib/services/wikis';
	import type { Wiki } from '$lib/types/Wiki';

	interface Props {
		initialTitle?: string;
		entry?: Entry;
	}

	const { initialTitle = '', entry }: Props = $props();

	let title = $state('');
	let content = $state('');
	let tagInputElement: TagInput | undefined = $state();
	let markdownEditorElement: MarkdownEditor | undefined = $state();
	let isSaving = $state(false);
	let isDeleting = $state(false);
	let error = $state<string | null>(null);
	let hasUnsavedChanges = $state(false);
	let backlinks = $state<Entry[]>([]);
	let isLoadingBacklinks = $state(false);
	let lastLoadedEntryId = $state<string | undefined>(undefined);
	let isSavingBeforeNavigation = $state(false);
	let isExplicitNavigation = $state(false); // Flag to skip beforeNavigate when user explicitly cancels
	let wikis = $state<Wiki[]>([]);
	let isLoadingWikis = $state(false);

	// Check if entry is public (belongs to any wiki)
	const isPublic = $derived(entry?.wikiIds && entry.wikiIds.length > 0);

	// Auto-save or prompt before navigating away
	beforeNavigate((navigation) => {
		// Skip if we're already saving or if this is an explicit navigation (user clicked Cancel/Close)
		if (isSavingBeforeNavigation || isExplicitNavigation) {
			isExplicitNavigation = false; // Reset flag
			return;
		}

		// Check if there's any content that could be lost
		const hasContent = title.trim() || content.trim();

		if (entry) {
			// Editing existing entry: auto-save if there are unsaved changes
			if (hasUnsavedChanges && title.trim()) {
				navigation.cancel();
				isSavingBeforeNavigation = true;

				void saveIfNeeded()
					.catch((error) => {
						console.error('Failed to save entry before navigation:', error);
					})
					.finally(() => {
						isSavingBeforeNavigation = false;
						if (navigation.to?.url) {
							// Use the full pathname since it's already resolved
							// eslint-disable-next-line svelte/no-navigation-without-resolve
							void goto(navigation.to.url.pathname);
						}
					});
			}
		} else {
			// Creating new entry: prompt if there's content
			if (hasContent) {
				const shouldLeave = confirm('You have unsaved changes. Leave without saving?');

				if (!shouldLeave) {
					// User wants to stay on the page - cancel navigation
					navigation.cancel();
				}
				// If user confirms leaving, let the navigation proceed normally
			}
		}
	});

	// Helper function to reconstruct title with tags
	function getTitleWithTags(entry: Entry): string {
		const tags = entry.tags ?? [];
		const tagsString = tags.length > 0 ? ` ${tags.map((t) => `#${t}`).join(' ')}` : '';
		return entry.title + tagsString;
	}

	// Initialize values on mount
	$effect(() => {
		if (entry) {
			// Reconstruct title with tags
			title = getTitleWithTags(entry);
			content = entry.content;
			lastLoadedEntryId = entry.id;
		} else {
			title = initialTitle;
			content = '';
			lastLoadedEntryId = undefined;
		}
		// Reset unsaved changes flag
		hasUnsavedChanges = false;
		// Focus the tag input after component mounts
		setTimeout(() => {
			if (tagInputElement && 'focus' in tagInputElement) {
				(tagInputElement as { focus: () => void }).focus();
			}
		}, 0);
	});

	// Watch for entry changes and update content
	$effect(() => {
		if (entry) {
			// Only reload if the entry ID changed (navigating to a different entry)
			// Don't reload if it's the same entry (just a data refresh after save)
			if (entry.id !== lastLoadedEntryId) {
				title = getTitleWithTags(entry);
				content = entry.content;
				lastLoadedEntryId = entry.id;
				hasUnsavedChanges = false;
			}

			// Always load backlinks for the current entry
			isLoadingBacklinks = true;
			void getBacklinks(entry.id)
				.then((links) => {
					backlinks = links;
				})
				.catch((err) => {
					console.error('Failed to load backlinks:', err);
					backlinks = [];
				})
				.finally(() => {
					isLoadingBacklinks = false;
				});

			// Load wiki information if entry belongs to wikis
			if (entry.wikiIds && entry.wikiIds.length > 0) {
				isLoadingWikis = true;
				void Promise.all(entry.wikiIds.map((wikiId) => getWikiById(wikiId)))
					.then((wikiResults) => {
						wikis = wikiResults.filter((wiki): wiki is Wiki => wiki !== null);
					})
					.catch((err) => {
						console.error('Failed to load wikis:', err);
						wikis = [];
					})
					.finally(() => {
						isLoadingWikis = false;
					});
			} else {
				wikis = [];
			}
		}
	});

	function handleInput(): void {
		// Mark that we have unsaved changes when editing an existing entry
		if (entry) {
			hasUnsavedChanges = true;
		}
	}

	async function handleCancel(): Promise<void> {
		const hasContent = title.trim() || content.trim();

		if (entry) {
			// Editing existing entry: auto-save if there are unsaved changes
			if (hasUnsavedChanges && title.trim()) {
				isSaving = true;
				error = null;

				try {
					await updateEntry(entry.id, {
						title: title.trim(),
						content: content.trim()
					});
					hasUnsavedChanges = false;
					toast.success('Entry saved successfully');
				} catch (err) {
					console.error('Failed to save entry:', err);
					error = err instanceof Error ? err.message : 'Failed to save entry';
					toast.error('Failed to save entry');
					isSaving = false;
					// Don't navigate if save failed
					return;
				}
			}
		} else {
			// Creating new entry: prompt if there's content
			if (hasContent) {
				const shouldLeave = confirm('You have unsaved changes. Leave without saving?');

				if (!shouldLeave) {
					// User wants to stay on the page
					return;
				}
			}
		}

		// Navigate back to home
		isExplicitNavigation = true;
		await goto(resolve('/'));
	}

	async function handleSave(): Promise<void> {
		if (!title.trim()) {
			error = 'Title is required';
			return;
		}

		isSaving = true;
		error = null;

		try {
			if (entry) {
				// Update existing entry
				await updateEntry(entry.id, {
					title: title.trim(),
					content: content.trim()
				});
				toast.success('Entry saved successfully');
			} else {
				// Create new entry
				await createEntry({
					title: title.trim(),
					content: content.trim()
				});
				toast.success('Entry created successfully');
			}
			// Navigate back to home after save
			isExplicitNavigation = true;
			await goto(resolve('/'));
		} catch (err) {
			console.error('Failed to save entry:', err);
			error = err instanceof Error ? err.message : 'Failed to save entry';
			toast.error('Failed to save entry');
			isSaving = false;
		}
	}

	async function handleDelete(): Promise<void> {
		if (!entry) {
			return;
		}

		const confirmed = confirm(
			'Are you sure you want to delete this entry? This action cannot be undone.'
		);

		if (!confirmed) {
			return;
		}

		isDeleting = true;
		error = null;

		try {
			await deleteEntry(entry.id);
			toast.success('Entry deleted successfully');
			// Navigate back to home after delete
			isExplicitNavigation = true;
			await goto(resolve('/'));
		} catch (err) {
			console.error('Failed to delete entry:', err);
			error = err instanceof Error ? err.message : 'Failed to delete entry';
			toast.error('Failed to delete entry');
			isDeleting = false;
		}
	}

	function handleGlobalKeydown(event: KeyboardEvent): void {
		// Delete: Ctrl+Shift+D or Cmd+Shift+D (only when editing)
		if (entry && (event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'D') {
			event.preventDefault();
			void handleDelete();
		}
	}

	function handleNavigateUpFromEditor(): void {
		// Focus the tag input when navigating up from the editor
		if (tagInputElement && 'focus' in tagInputElement) {
			(tagInputElement as { focus: () => void }).focus();
		}
	}

	function handleCtrlEnterFromEditor(): void {
		// Save the entry when Ctrl+Enter is pressed in the editor
		void handleSave();
	}

	function handleEscapeFromEditor(): void {
		// Save and close when Escape is pressed in the editor
		void handleCancel();
	}

	function handleTitleKeydown(event: KeyboardEvent): void {
		if (event.key === 'Enter' && event.ctrlKey) {
			event.preventDefault();
			void handleSave();
		} else if (event.key === 'Enter') {
			event.preventDefault();
			// Focus the markdown editor when Enter is pressed
			if (markdownEditorElement && 'focus' in markdownEditorElement) {
				(markdownEditorElement as { focus: () => void }).focus();
			}
		} else if (event.key === 'Escape') {
			event.preventDefault();
			void handleCancel();
		}
	}

	function handleTitleInput(newTitle: string): void {
		title = newTitle;
		handleInput();
	}

	async function handleBacklinkClick(backlinkEntry: Entry): Promise<void> {
		// Save current entry if needed before navigating
		await saveIfNeeded();
		// Navigate to the backlink entry
		void goto(resolve('/entries/[entryId]', { entryId: backlinkEntry.id }));
	}

	// Save if there are unsaved changes
	async function saveIfNeeded(): Promise<void> {
		if (entry && hasUnsavedChanges && title.trim()) {
			isSaving = true;
			error = null;

			try {
				await updateEntry(entry.id, {
					title: title.trim(),
					content: content.trim()
				});
				hasUnsavedChanges = false;
				toast.success('Entry saved successfully');
			} catch (err) {
				console.error('Failed to save entry:', err);
				error = err instanceof Error ? err.message : 'Failed to save entry';
				toast.error('Failed to save entry');
				throw err; // Re-throw to let caller know save failed
			} finally {
				isSaving = false;
			}
		}
	}
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

<PageLayout>
	<div class="entry-edit-container">
		<div class="entry-content">
			{#if error}
				<div class="error-message">{error}</div>
			{/if}

			{#if isPublic}
				<div class="public-indicator">
					<div class="public-indicator-text">
						{#if isLoadingWikis}
							<span>Loading wiki information...</span>
						{:else if wikis.length === 1}
							<span
								><strong>Warning:</strong> This entry belongs to the
								<strong>{wikis[0].name}</strong> wiki, so it is publicly visible.</span
							>
						{:else if wikis.length > 1}
							<span
								><strong>Warning:</strong> This entry belongs to
								<strong>{wikis.length} wikis</strong>
								({wikis.map((w) => w.name).join(', ')}), so it is publicly visible.</span
							>
						{:else}
							<span><strong>Warning:</strong> This entry is publicly visible.</span>
						{/if}
					</div>
				</div>
			{/if}

			<div class="entry-fields">
				<TagInput
					bind:this={tagInputElement}
					bind:value={title}
					oninput={handleTitleInput}
					onkeydown={handleTitleKeydown}
					disabled={isSaving}
				/>

				<MarkdownEditor
					bind:this={markdownEditorElement}
					bind:value={content}
					oninput={handleInput}
					placeholder="What's on your mind?"
					disabled={isSaving}
					onnavigateup={handleNavigateUpFromEditor}
					onctrlenter={handleCtrlEnterFromEditor}
					onescape={handleEscapeFromEditor}
					currentEntryId={entry?.id}
				/>
			</div>

			{#if entry}
				<BacklinksList
					{backlinks}
					isLoading={isLoadingBacklinks}
					onBacklinkClick={handleBacklinkClick}
				/>
			{/if}
		</div>
	</div>

	<div class="footer-actions">
		<div class="footer-content">
			{#if entry}
				<!-- Editing: Close and Delete buttons -->
				<div class="footer-left">
					<Button
						variant="danger"
						onclick={() => void handleDelete()}
						disabled={isSaving || isDeleting}
						title="Delete entry (Ctrl+Shift+D)"
					>
						{#if isDeleting}
							Deleting...
						{:else}
							Delete
						{/if}
					</Button>
				</div>
				<div class="footer-right">
					<Button
						variant="primary"
						onclick={() => void handleCancel()}
						disabled={isSaving || isDeleting}
						title="Close and auto-save (Esc)"
					>
						{#if isSaving}
							Saving...
						{:else}
							Close
						{/if}
					</Button>
				</div>
			{:else}
				<!-- Creating: Cancel and Create buttons -->
				<Button
					variant="secondary"
					onclick={() => void handleCancel()}
					disabled={isSaving}
					title="Cancel (Esc)"
				>
					Cancel
				</Button>
				<Button
					variant="primary"
					onclick={handleSave}
					disabled={isSaving}
					title="Save and close (Ctrl+Enter)"
				>
					{#if isSaving}
						Saving...
					{:else}
						Save & Close
					{/if}
				</Button>
			{/if}
		</div>
	</div>
</PageLayout>

<style>
	.entry-edit-container {
		max-width: 800px;
		margin: 0 auto;
		padding-bottom: 80px; /* Space for sticky footer */
	}

	.entry-content {
		padding: var(--spacing-lg) 0;
	}

	.entry-fields {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-lg);
		margin-bottom: var(--spacing-lg);
	}

	.error-message {
		padding: var(--spacing-md);
		background: #fee;
		border: 1px solid #fcc;
		border-radius: var(--radius-md);
		color: #c33;
		margin-bottom: var(--spacing-md);
		font-size: var(--font-size-sm);
	}

	.public-indicator {
		display: flex;
		align-items: flex-start;
		padding: var(--spacing-md);
		background: color-mix(in srgb, #f59e0b 10%, transparent);
		border: 1px solid color-mix(in srgb, #f59e0b 30%, transparent);
		border-radius: var(--radius-md);
		color: #f59e0b;
		font-size: var(--font-size-sm);
		margin-bottom: var(--spacing-md);
		width: 100%;
	}

	.public-indicator-text {
		flex: 1;
		line-height: 1.5;
	}

	.public-indicator-text strong {
		font-weight: var(--font-weight-semibold);
	}

	.footer-actions {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		background: rgba(30, 41, 59, 0.85); /* --color-surface with opacity */
		backdrop-filter: blur(8px);
		border-top: 1px solid rgba(51, 65, 85, 0.5); /* --color-border with opacity */
		padding: var(--spacing-md) var(--spacing-xl);
		z-index: var(--z-sticky);
		box-shadow: 0 -1px 4px rgba(0, 0, 0, 0.2);
	}

	.footer-content {
		max-width: 800px;
		margin: 0 auto;
		display: flex;
		gap: var(--spacing-md);
		justify-content: space-between;
		align-items: center;
	}

	.footer-left {
		display: flex;
		gap: var(--spacing-md);
	}

	.footer-right {
		display: flex;
		gap: var(--spacing-md);
	}

	/* Mobile optimization */
	@media (max-width: 768px) {
		.entry-edit-container {
			padding-bottom: 70px; /* Adjust for mobile */
		}

		.entry-content {
			padding: var(--spacing-md) 0;
		}

		.footer-actions {
			padding: var(--spacing-sm) var(--spacing-md);
		}
	}
</style>
