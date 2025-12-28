<script lang="ts">
	import Icon from './Icon.svelte';
	import MarkdownEditor from './MarkdownEditor.svelte';
	import Tag from './Tag.svelte';
	import TagSelectorPopover from './TagSelectorPopover.svelte';
	import { createEntry, updateEntry, getBacklinks } from '$lib/services/entries';
	import { extractTagsFromTitle } from '$lib/services/markdown';
	import type { Entry } from '$lib/types/Entry';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
		onSave?: () => void;
		initialTitle?: string;
		entry?: Entry;
	}

	const { isOpen = false, onClose, onSave, initialTitle = '', entry }: Props = $props();

	let title = $state('');
	let content = $state('');
	let dialogElement: HTMLDialogElement | undefined = $state();
	let titleInputElement: HTMLInputElement | undefined = $state();
	let markdownEditorElement: MarkdownEditor | undefined = $state();
	let isSaving = $state(false);
	let error = $state<string | null>(null);
	let hasUnsavedChanges = $state(false);
	let backlinks = $state<Entry[]>([]);
	let isLoadingBacklinks = $state(false);
	let lastLoadedEntryId = $state<string | undefined>(undefined);

	// Tag selector popover state
	let showTagPopover = $state(false);
	let tagPopoverPosition = $state({ x: 0, y: 0 });
	let tagSearchTerm = $state('');
	let tagStartPos = $state(0);
	let tagSelectorRef:
		| { handleExternalKeydown: (e: KeyboardEvent) => void; hasAvailableTags: () => boolean }
		| undefined = $state();

	// Derive tags from the current title
	const currentTags = $derived(extractTagsFromTitle(title).tags);

	// Helper function to reconstruct title with tags
	function getTitleWithTags(entry: Entry): string {
		const tags = entry.tags ?? [];
		const tagsString = tags.length > 0 ? ` ${tags.map((t) => `#${t}`).join(' ')}` : '';
		return entry.title + tagsString;
	}

	// Handle opening/closing the dialog and set initial title
	$effect(() => {
		if (dialogElement) {
			if (isOpen && !dialogElement.open) {
				dialogElement.showModal();
				// Set initial values based on whether we're editing or creating
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
				// Focus the title input after modal opens
				setTimeout(() => {
					titleInputElement?.focus();
				}, 0);
			} else if (!isOpen && dialogElement.open) {
				dialogElement.close();
			}
		}
	});

	// Watch for entry changes and update the modal content
	$effect(() => {
		if (entry && isOpen) {
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
		}
	});

	function handleInput(): void {
		// Mark that we have unsaved changes when editing an existing entry
		if (entry) {
			hasUnsavedChanges = true;
		}
	}

	async function handleClose(): Promise<void> {
		// If editing and there are unsaved changes, save them before closing
		if (entry && hasUnsavedChanges && title.trim()) {
			isSaving = true;
			error = null;

			try {
				await updateEntry(entry.id, {
					title: title.trim(),
					content: content.trim()
				});
				hasUnsavedChanges = false;
				onSave?.();
			} catch (err) {
				console.error('Failed to save entry:', err);
				error = err instanceof Error ? err.message : 'Failed to save entry';
				isSaving = false;
				// Don't close if save failed
				return;
			} finally {
				// Keep isSaving true until after onClose to avoid flicker
			}
		}

		// Call onClose first (which triggers navigation)
		onClose();

		// Reset state after a small delay to avoid visual glitch during close animation
		setTimeout(() => {
			isSaving = false;
			error = null;
			hasUnsavedChanges = false;
			if (!isOpen) {
				title = '';
				content = '';
			}
		}, 100);
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
			} else {
				// Create new entry
				await createEntry({
					title: title.trim(),
					content: content.trim()
				});
			}
			onSave?.();
			await handleClose();
		} catch (err) {
			console.error('Failed to save entry:', err);
			error = err instanceof Error ? err.message : 'Failed to save entry';
			isSaving = false;
		}
	}

	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape') {
			event.preventDefault();
			// In edit mode, blur the active element instead of closing
			if (entry) {
				if (document.activeElement instanceof HTMLElement) {
					document.activeElement.blur();
				}
			} else {
				// In create mode, close the modal
				void handleClose();
			}
		}
	}

	function handleBackdropClick(event: MouseEvent): void {
		// Only close if clicking directly on the dialog element (the backdrop)
		if (event.target === event.currentTarget) {
			// In edit mode, backdrop click should save and close
			void handleClose();
		}
	}

	function handleNavigateUpFromEditor(): void {
		// Focus the title input when navigating up from the editor
		titleInputElement?.focus();
	}

	function handleCtrlEnterFromEditor(): void {
		// Save the entry when Ctrl+Enter is pressed in the editor
		void handleSave();
	}

	function handleTitleKeydown(event: KeyboardEvent): void {
		// If tag popover is open, handle Enter specially
		if (showTagPopover && event.key === 'Enter') {
			event.preventDefault();
			// If there are available tags, let the popover handle selection
			const hasMatches = tagSelectorRef?.hasAvailableTags?.() ?? false;
			if (hasMatches) {
				// Let the tag selector handle the Enter key
				if (tagSelectorRef?.handleExternalKeydown) {
					tagSelectorRef.handleExternalKeydown(event);
				}
			} else {
				// No matches, create a new tag with the search term
				if (tagSearchTerm.trim()) {
					handleTagSelect(tagSearchTerm.trim());
				}
			}
			return;
		}

		// If tag popover is open, let it handle arrow keys
		if (showTagPopover && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
			event.preventDefault();
			if (tagSelectorRef?.handleExternalKeydown) {
				tagSelectorRef.handleExternalKeydown(event);
			}
			return;
		}

		// Handle Escape to close tag popover
		if (event.key === 'Escape' && showTagPopover) {
			event.preventDefault();
			showTagPopover = false;
			return;
		}

		if (event.key === 'Enter' && event.ctrlKey) {
			event.preventDefault();
			void handleSave();
		} else if (event.key === 'Enter') {
			event.preventDefault();
			// Focus the markdown editor when Enter is pressed
			if (markdownEditorElement && 'focus' in markdownEditorElement) {
				(markdownEditorElement as { focus: () => void }).focus();
			}
		}
	}

	function handleTitleInput(event: Event): void {
		const target = event.target as HTMLInputElement;
		checkForTagTrigger(target);
		handleInput();
	}

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
		if (!titleInputElement) return;

		// Replace # and search term with the selected tag
		const beforeTag = title.substring(0, tagStartPos);
		const cursorPos = titleInputElement.selectionStart ?? 0;
		const afterCursor = title.substring(cursorPos);

		const tagText = `#${tag}`;

		title = beforeTag + tagText + afterCursor;

		// Move cursor after the inserted tag
		const newCursorPos = tagStartPos + tagText.length;

		// Update input
		setTimeout(() => {
			if (titleInputElement) {
				titleInputElement.focus();
				titleInputElement.selectionStart = titleInputElement.selectionEnd = newCursorPos;
			}
		}, 0);

		showTagPopover = false;
		handleInput();
	}

	// Close tag popover
	function handleTagPopoverClose(): void {
		showTagPopover = false;
	}

	async function handleBacklinkClick(backlinkEntry: Entry): Promise<void> {
		// Save current entry if needed before navigating
		await saveIfNeeded();
		// Navigate to the backlink entry
		void goto(resolve(`/entries/${backlinkEntry.id}`));
	}

	// Public method to save if there are unsaved changes
	// This is called by the parent component before navigating away
	export async function saveIfNeeded(): Promise<void> {
		if (entry && hasUnsavedChanges && title.trim()) {
			isSaving = true;
			error = null;

			try {
				await updateEntry(entry.id, {
					title: title.trim(),
					content: content.trim()
				});
				hasUnsavedChanges = false;
				onSave?.();
			} catch (err) {
				console.error('Failed to save entry:', err);
				error = err instanceof Error ? err.message : 'Failed to save entry';
				throw err; // Re-throw to let caller know save failed
			} finally {
				isSaving = false;
			}
		}
	}
</script>

<dialog
	bind:this={dialogElement}
	class="entry-modal"
	onkeydown={handleKeydown}
	onclick={handleBackdropClick}
	aria-labelledby="modal-title"
>
	<div class="modal-content" role="document">
		<header class="modal-header">
			<h2 id="modal-title" class="modal-title">{entry ? 'Edit Entry' : 'New Entry'}</h2>
			<button
				type="button"
				class="close-button"
				onclick={() => void handleClose()}
				aria-label="Close dialog"
			>
				<Icon name="x" size={24} />
			</button>
		</header>

		<div class="modal-body">
			{#if error}
				<div class="error-message">{error}</div>
			{/if}

			<div class="form-group">
				<label for="entry-title" class="form-label">Title</label>
				<input
					bind:this={titleInputElement}
					id="entry-title"
					type="text"
					class="form-input"
					placeholder="Entry title..."
					bind:value={title}
					oninput={handleTitleInput}
					onkeydown={handleTitleKeydown}
					disabled={isSaving}
				/>
			</div>

			{#if currentTags.length > 0}
				<div class="tags-display">
					{#each currentTags as tag (tag)}
						<Tag {tag} />
					{/each}
				</div>
			{/if}

			<div class="form-group">
				<label for="entry-content" class="form-label">Content</label>
				<MarkdownEditor
					bind:this={markdownEditorElement}
					bind:value={content}
					oninput={handleInput}
					placeholder="What's on your mind?"
					disabled={isSaving}
					onnavigateup={handleNavigateUpFromEditor}
					onctrlenter={handleCtrlEnterFromEditor}
					currentEntryId={entry?.id}
				/>
			</div>

			{#if entry && (isLoadingBacklinks || backlinks.length > 0)}
				<div class="backlinks-section">
					<h3 class="backlinks-title">Backlinks</h3>
					{#if isLoadingBacklinks}
						<p class="backlinks-empty">Loading backlinks...</p>
					{:else}
						<ul class="backlinks-list">
							{#each backlinks as backlink (backlink.id)}
								<li class="backlink-item">
									<button
										type="button"
										class="backlink-button"
										onclick={() => void handleBacklinkClick(backlink)}
									>
										{backlink.title}
									</button>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			{/if}
		</div>

		<footer class="modal-footer" class:footer-edit-mode={entry}>
			{#if entry}
				<!-- Edit mode: show saving indicator if saving -->
				<div class="saving-indicator">
					{#if isSaving}
						<span class="saving-text">Saving...</span>
					{/if}
				</div>
			{:else}
				<!-- Create mode: show cancel and save buttons -->
				<button
					type="button"
					class="button button-secondary"
					onclick={() => void handleClose()}
					disabled={isSaving}
				>
					Cancel
				</button>
				<button
					type="button"
					class="button button-primary"
					onclick={handleSave}
					disabled={isSaving}
				>
					{isSaving ? 'Saving...' : 'Save Entry'}
				</button>
			{/if}
		</footer>
	</div>

	{#if showTagPopover}
		<div style="position: fixed; z-index: 10000; pointer-events: auto;">
			<TagSelectorPopover
				bind:this={tagSelectorRef}
				searchTerm={tagSearchTerm}
				position={tagPopoverPosition}
				onSelect={handleTagSelect}
				onClose={handleTagPopoverClose}
			/>
		</div>
	{/if}
</dialog>

<style>
	.entry-modal {
		border: none;
		border-radius: var(--radius-xl);
		padding: 0;
		max-width: 600px;
		width: 90vw;
		max-height: 80vh;
		overflow: hidden;
		background: var(--color-surface);
		color: var(--color-text);
		box-shadow: var(--shadow-xl);
	}

	.entry-modal[open] {
		display: flex;
		flex-direction: column;
		position: fixed;
		inset: 0;
		margin: auto;
	}

	.entry-modal::backdrop {
		background: rgba(0, 0, 0, 0.7);
		backdrop-filter: blur(4px);
	}

	.modal-content {
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--spacing-lg);
		border-bottom: 1px solid var(--color-border);
	}

	.modal-title {
		font-size: var(--font-size-2xl);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
		margin: 0;
	}

	.close-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border: none;
		background: transparent;
		color: var(--color-text-secondary);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.close-button:hover {
		background: var(--color-surface-hover);
		color: var(--color-text);
	}

	.modal-body {
		flex: 1;
		padding: var(--spacing-lg);
		overflow-y: auto;
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

	.form-group {
		margin-bottom: var(--spacing-lg);
	}

	.form-group:last-child {
		margin-bottom: 0;
	}

	.form-label {
		display: block;
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		color: var(--color-text-secondary);
		margin-bottom: var(--spacing-sm);
	}

	.form-input {
		width: 100%;
		padding: var(--spacing-md);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-bg);
		color: var(--color-text);
		font-size: var(--font-size-md);
		transition: all var(--transition-fast);
	}

	.form-input:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px rgba(167, 139, 250, 0.1);
	}

	.tags-display {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-sm);
		margin-bottom: var(--spacing-lg);
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		gap: var(--spacing-md);
		padding: var(--spacing-lg);
		border-top: 1px solid var(--color-border);
	}

	.modal-footer.footer-edit-mode {
		border-top: none;
		padding-top: 0;
	}

	.saving-indicator {
		flex: 1;
		display: flex;
		align-items: center;
		min-height: 1.5em;
	}

	.saving-text {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		font-style: italic;
	}

	.button {
		padding: var(--spacing-sm) var(--spacing-lg);
		border: none;
		border-radius: var(--radius-md);
		font-size: var(--font-size-md);
		font-weight: var(--font-weight-medium);
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.button-secondary {
		background: transparent;
		color: var(--color-text-secondary);
		border: 1px solid var(--color-border);
	}

	.button-secondary:hover {
		background: var(--color-surface-hover);
		border-color: var(--color-border-hover);
		color: var(--color-text);
	}

	.button-primary {
		background: var(--color-primary);
		color: var(--color-text-inverted);
	}

	.button-primary:hover {
		background: var(--color-primary-hover);
	}

	.button-primary:active,
	.button-secondary:active {
		transform: scale(0.98);
	}

	.button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.backlinks-section {
		margin-top: var(--spacing-xl);
		padding-top: var(--spacing-lg);
		border-top: 1px solid var(--color-border);
	}

	.backlinks-title {
		font-size: var(--font-size-md);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
		margin: 0 0 var(--spacing-md) 0;
	}

	.backlinks-empty {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		font-style: italic;
		margin: 0;
	}

	.backlinks-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}

	.backlink-item {
		margin: 0;
	}

	.backlink-button {
		display: block;
		width: 100%;
		text-align: left;
		padding: var(--spacing-sm) var(--spacing-md);
		border: none;
		background: var(--color-bg);
		color: var(--color-primary);
		font-size: var(--font-size-sm);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all var(--transition-fast);
		text-decoration: none;
	}

	.backlink-button:hover {
		background: var(--color-surface-hover);
		text-decoration: underline;
	}

	.backlink-button:active {
		transform: scale(0.98);
	}

	/* Mobile optimization */
	@media (max-width: 768px) {
		.entry-modal {
			width: 95vw;
			max-height: 90vh;
		}

		.modal-header,
		.modal-body,
		.modal-footer {
			padding: var(--spacing-md);
		}

		.modal-title {
			font-size: var(--font-size-xl);
		}
	}
</style>
