<script lang="ts">
	import Icon from './Icon.svelte';
	import { createEntry } from '$lib/services/entries';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
		onSave?: () => void;
		initialTitle?: string;
	}

	const { isOpen = false, onClose, onSave, initialTitle = '' }: Props = $props();

	let title = $state('');
	let content = $state('');
	let dialogElement: HTMLDialogElement | undefined = $state();
	let isSaving = $state(false);
	let error = $state<string | null>(null);

	// Handle opening/closing the dialog and set initial title
	$effect(() => {
		if (dialogElement) {
			if (isOpen && !dialogElement.open) {
				dialogElement.showModal();
				title = initialTitle;
			} else if (!isOpen && dialogElement.open) {
				dialogElement.close();
			}
		}
	});

	function handleClose(): void {
		title = '';
		content = '';
		onClose();
	}

	async function handleSave(): Promise<void> {
		if (!title.trim() && !content.trim()) {
			return;
		}

		isSaving = true;
		error = null;

		try {
			await createEntry({
				title: title.trim(),
				content: content.trim()
			});
			onSave?.();
			handleClose();
		} catch (err) {
			console.error('Failed to save entry:', err);
			error = err instanceof Error ? err.message : 'Failed to save entry';
			isSaving = false;
		}
	}

	function handleKeydown(e: KeyboardEvent): void {
		if (e.key === 'Escape') {
			e.preventDefault();
			handleClose();
		}
	}

	function handleBackdropClick(e: MouseEvent): void {
		// Only close if clicking directly on the dialog element (the backdrop)
		if (e.target === e.currentTarget) {
			handleClose();
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
			<h2 id="modal-title" class="modal-title">New Entry</h2>
			<button type="button" class="close-button" onclick={handleClose} aria-label="Close dialog">
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
					id="entry-title"
					type="text"
					class="form-input"
					placeholder="Entry title..."
					bind:value={title}
					disabled={isSaving}
				/>
			</div>

			<div class="form-group">
				<label for="entry-content" class="form-label">Content</label>
				<textarea
					id="entry-content"
					class="form-textarea"
					placeholder="What's on your mind?"
					bind:value={content}
					rows="10"
					disabled={isSaving}
				></textarea>
			</div>
		</div>

		<footer class="modal-footer">
			<button
				type="button"
				class="button button-secondary"
				onclick={handleClose}
				disabled={isSaving}
			>
				Cancel
			</button>
			<button type="button" class="button button-primary" onclick={handleSave} disabled={isSaving}>
				{isSaving ? 'Saving...' : 'Save Entry'}
			</button>
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

	.form-input,
	.form-textarea {
		width: 100%;
		padding: var(--spacing-md);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-bg);
		color: var(--color-text);
		font-size: var(--font-size-md);
		transition: all var(--transition-fast);
	}

	.form-input:focus,
	.form-textarea:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px rgba(167, 139, 250, 0.1);
	}

	.form-textarea {
		resize: vertical;
		min-height: 120px;
		font-family: inherit;
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: var(--spacing-md);
		padding: var(--spacing-lg);
		border-top: 1px solid var(--color-border);
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
