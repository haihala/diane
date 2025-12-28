<script lang="ts">
	import MarkdownEditor from './MarkdownEditor.svelte';
	import ModalHeader from './ModalHeader.svelte';
	import ModalFooter from './ModalFooter.svelte';
	import BacklinksList from './BacklinksList.svelte';
	import TagInput from './TagInput.svelte';
	import { createEntry, updateEntry, getBacklinks } from '$lib/services/entries';
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
	let tagInputElement: TagInput | undefined = $state();
	let markdownEditorElement: MarkdownEditor | undefined = $state();
	let isSaving = $state(false);
	let error = $state<string | null>(null);
	let hasUnsavedChanges = $state(false);
	let backlinks = $state<Entry[]>([]);
	let isLoadingBacklinks = $state(false);
	let lastLoadedEntryId = $state<string | undefined>(undefined);

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
				// Focus the tag input after modal opens
				setTimeout(() => {
					if (tagInputElement && 'focus' in tagInputElement) {
						(tagInputElement as { focus: () => void }).focus();
					}
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
			// Save and close the modal
			void handleClose();
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
		// Focus the tag input when navigating up from the editor
		if (tagInputElement && 'focus' in tagInputElement) {
			(tagInputElement as { focus: () => void }).focus();
		}
	}

	function handleCtrlEnterFromEditor(): void {
		// Save the entry when Ctrl+Enter is pressed in the editor
		void handleSave();
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
		<ModalHeader title={entry ? 'Edit Entry' : 'New Entry'} onClose={() => void handleClose()} />

		<div class="modal-body">
			{#if error}
				<div class="error-message">{error}</div>
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

		<ModalFooter
			mode={entry ? 'edit' : 'create'}
			{isSaving}
			onCancel={() => void handleClose()}
			onSave={handleSave}
		/>
	</div>
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

	.modal-body {
		flex: 1;
		padding: var(--spacing-lg);
		overflow-y: auto;
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

	/* Mobile optimization */
	@media (max-width: 768px) {
		.entry-modal {
			width: 95vw;
			max-height: 90vh;
		}

		.modal-body {
			padding: var(--spacing-md);
		}
	}
</style>
