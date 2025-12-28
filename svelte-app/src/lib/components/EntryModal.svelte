<script lang="ts">
	import Icon from './Icon.svelte';
	import MarkdownEditor from './MarkdownEditor.svelte';
	import { createEntry, updateEntry } from '$lib/services/entries';
	import type { Entry } from '$lib/types/Entry';

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

	// Handle opening/closing the dialog and set initial title
	$effect(() => {
		if (dialogElement) {
			if (isOpen && !dialogElement.open) {
				dialogElement.showModal();
				// Set initial values based on whether we're editing or creating
				if (entry) {
					title = entry.title;
					content = entry.content;
				} else {
					title = initialTitle;
					content = '';
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
			title = entry.title;
			content = entry.content;
			hasUnsavedChanges = false;
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
				onSave?.();
			} catch (err) {
				console.error('Failed to save entry:', err);
				error = err instanceof Error ? err.message : 'Failed to save entry';
				isSaving = false;
				// Don't close if save failed
				return;
			}
		}

		title = '';
		content = '';
		isSaving = false;
		error = null;
		hasUnsavedChanges = false;

		onClose();
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
			void handleClose();
		}
	}

	function handleBackdropClick(event: MouseEvent): void {
		// Only close if clicking directly on the dialog element (the backdrop)
		if (event.target === event.currentTarget) {
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
					oninput={handleInput}
					onkeydown={handleTitleKeydown}
					disabled={isSaving}
				/>
			</div>

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
