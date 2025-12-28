<script lang="ts">
	import { getAllTags, renameTag, deleteTag } from '$lib/services/entries';
	import { onMount } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';

	let tags = $state<Map<string, number>>(new Map());
	let loading = $state(true);
	let editingTag = $state<string | null>(null);
	let newTagName = $state('');
	let error = $state<string | null>(null);
	let processingTag = $state<string | null>(null);

	async function loadData(): Promise<void> {
		try {
			loading = true;
			error = null;
			tags = await getAllTags();
		} catch (err) {
			console.error('Error loading tags:', err);
			error = 'Failed to load tags. Please try again.';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		void loadData();
	});

	function startEditing(tag: string): void {
		editingTag = tag;
		newTagName = tag;
		error = null;
	}

	function cancelEditing(): void {
		editingTag = null;
		newTagName = '';
		error = null;
	}

	async function handleRename(oldTag: string): Promise<void> {
		const trimmedNewName = newTagName.trim();

		if (!trimmedNewName) {
			error = 'Tag name cannot be empty';
			return;
		}

		if (trimmedNewName === oldTag) {
			cancelEditing();
			return;
		}

		if (tags.has(trimmedNewName)) {
			error = `Tag "${trimmedNewName}" already exists`;
			return;
		}

		try {
			processingTag = oldTag;
			error = null;
			await renameTag(oldTag, trimmedNewName);
			await loadData();
			cancelEditing();
		} catch (err) {
			console.error('Error renaming tag:', err);
			error = 'Failed to rename tag. Please try again.';
		} finally {
			processingTag = null;
		}
	}

	async function handleDelete(tag: string): Promise<void> {
		const count = tags.get(tag) ?? 0;
		const confirmed = confirm(
			`Are you sure you want to delete the tag "${tag}"?\n\nThis will remove it from ${count} ${count === 1 ? 'entry' : 'entries'}.`
		);

		if (!confirmed) {
			return;
		}

		try {
			processingTag = tag;
			error = null;
			await deleteTag(tag);
			await loadData();
		} catch (err) {
			console.error('Error deleting tag:', err);
			error = 'Failed to delete tag. Please try again.';
		} finally {
			processingTag = null;
		}
	}

	function handleKeydown(event: KeyboardEvent, tag: string): void {
		if (event.key === 'Enter') {
			void handleRename(tag);
		} else if (event.key === 'Escape') {
			cancelEditing();
		}
	}

	// Convert tags Map to sorted array for display
	const sortedTags = $derived(Array.from(tags.entries()).sort((a, b) => a[0].localeCompare(b[0])));
</script>

<div class="page-header">
	<h1 class="page-title">Tags</h1>
	<p class="page-subtitle">Manage your tags and their associations</p>
</div>

{#if error}
	<div class="error-banner">
		<span>{error}</span>
		<button class="close-error" onclick={() => (error = null)}>
			<Icon name="x" />
		</button>
	</div>
{/if}

{#if loading}
	<div class="loading-state">
		<div class="spinner"></div>
		<p>Loading tags...</p>
	</div>
{:else if sortedTags.length === 0}
	<div class="empty-state">
		<Icon name="grid" />
		<p>No tags found</p>
		<span class="empty-hint">Tags will appear here once you add them to your entries</span>
	</div>
{:else}
	<div class="tags-list">
		{#each sortedTags as [tag, count] (tag)}
			<div class="tag-item">
				{#if editingTag === tag}
					<div class="tag-edit-form">
						<input
							type="text"
							class="tag-input"
							bind:value={newTagName}
							onkeydown={(e) => handleKeydown(e, tag)}
						/>
						<div class="tag-actions">
							<button
								class="action-button save-button"
								onclick={() => handleRename(tag)}
								disabled={processingTag === tag}
							>
								Save
							</button>
							<button
								class="action-button cancel-button"
								onclick={cancelEditing}
								disabled={processingTag === tag}
							>
								Cancel
							</button>
						</div>
					</div>
				{:else}
					<div class="tag-info">
						<span class="tag-name">#{tag}</span>
						<span class="tag-count">{count} {count === 1 ? 'entry' : 'entries'}</span>
					</div>
					<div class="tag-actions">
						<button
							class="action-button rename-button"
							onclick={() => startEditing(tag)}
							disabled={processingTag === tag}
							title="Rename tag"
						>
							Rename
						</button>
						<button
							class="action-button delete-button"
							onclick={() => handleDelete(tag)}
							disabled={processingTag === tag}
							title="Delete tag"
						>
							{#if processingTag === tag}
								<span class="mini-spinner"></span>
							{:else}
								<Icon name="x" />
							{/if}
						</button>
					</div>
				{/if}
			</div>
		{/each}
	</div>
{/if}

<style>
	.page-header {
		margin-bottom: var(--spacing-2xl);
	}

	.page-title {
		font-size: var(--font-size-3xl);
		font-weight: var(--font-weight-bold);
		color: var(--color-text);
		margin-bottom: var(--spacing-sm);
	}

	.page-subtitle {
		font-size: var(--font-size-md);
		color: var(--color-text-secondary);
	}

	.error-banner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--spacing-md);
		margin-bottom: var(--spacing-lg);
		background: #fee;
		border: 1px solid #fcc;
		border-radius: var(--radius-md);
		color: #c33;
		font-size: var(--font-size-sm);
	}

	.close-error {
		background: transparent;
		border: none;
		cursor: pointer;
		padding: var(--spacing-xs);
		color: #c33;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.close-error:hover {
		opacity: 0.7;
	}

	.loading-state,
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--spacing-md);
		padding: var(--spacing-3xl);
		color: var(--color-text-secondary);
	}

	.empty-state {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
	}

	.empty-hint {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}

	.spinner {
		width: 32px;
		height: 32px;
		border: 3px solid var(--color-border);
		border-top-color: var(--color-primary);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	.mini-spinner {
		display: inline-block;
		width: 16px;
		height: 16px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.tags-list {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}

	.tag-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--spacing-md);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		transition: all 0.2s ease;
	}

	.tag-item:hover {
		border-color: var(--color-primary);
	}

	.tag-info {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
		flex: 1;
	}

	.tag-name {
		font-size: var(--font-size-md);
		font-weight: var(--font-weight-medium);
		color: var(--color-text);
	}

	.tag-count {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}

	.tag-edit-form {
		display: flex;
		gap: var(--spacing-md);
		align-items: center;
		flex: 1;
	}

	.tag-input {
		flex: 1;
		padding: var(--spacing-sm) var(--spacing-md);
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text);
		font-size: var(--font-size-md);
	}

	.tag-input:focus {
		outline: none;
		border-color: var(--color-primary);
	}

	.tag-actions {
		display: flex;
		gap: var(--spacing-sm);
		align-items: center;
	}

	.action-button {
		padding: var(--spacing-sm) var(--spacing-md);
		border-radius: var(--radius-md);
		font-size: var(--font-size-sm);
		cursor: pointer;
		transition: all 0.2s ease;
		border: 1px solid var(--color-border);
		background: transparent;
		color: var(--color-text);
	}

	.action-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.action-button:not(:disabled):hover {
		opacity: 0.8;
	}

	.rename-button:hover {
		background: var(--color-primary);
		color: white;
		border-color: var(--color-primary);
	}

	.delete-button {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--spacing-sm);
	}

	.delete-button:hover {
		background: #ef4444;
		color: white;
		border-color: #ef4444;
	}

	.save-button {
		background: var(--color-primary);
		color: white;
		border-color: var(--color-primary);
	}

	.save-button:hover {
		opacity: 0.9;
	}

	.cancel-button:hover {
		background: var(--color-bg-secondary);
	}

	@media (max-width: 768px) {
		.tag-item {
			flex-direction: column;
			align-items: flex-start;
			gap: var(--spacing-md);
		}

		.tag-edit-form {
			flex-direction: column;
			width: 100%;
		}

		.tag-actions {
			width: 100%;
			justify-content: flex-end;
		}
	}
</style>
