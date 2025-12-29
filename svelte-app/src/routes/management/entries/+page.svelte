<script lang="ts">
	import { getAllEntries } from '$lib/services/entries';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { Entry } from '$lib/types/Entry';
	import EmptyState from '$lib/components/common/EmptyState.svelte';
	import Button from '$lib/components/common/Button.svelte';

	let entries: Entry[] = $state([]);
	let loading = $state(true);

	async function loadData(): Promise<void> {
		try {
			loading = true;
			entries = await getAllEntries();
		} catch (error) {
			console.error('Error loading entries:', error);
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		void loadData();
	});

	function formatDate(date: Date): string {
		return new Intl.DateTimeFormat('en-US', {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(date);
	}

	function handleEntryClick(entryId: string): void {
		void goto(resolve('/entries/[entryId]', { entryId }));
	}

	function handleCreateEntry(): void {
		void goto(resolve('/'));
	}
</script>

<div class="page-header">
	<h1 class="page-title">All Entries</h1>
	<p class="page-subtitle">Manage your knowledge base entries</p>
</div>

{#if loading}
	<div class="loading-state">
		<div class="spinner"></div>
		<p>Loading entries...</p>
	</div>
{:else if entries.length === 0}
	<EmptyState icon="file" message="No entries yet. Start creating your knowledge base!">
		{#snippet action()}
			<Button variant="primary" onclick={handleCreateEntry}>Create your first entry</Button>
		{/snippet}
	</EmptyState>
{:else}
	<div class="entries-list">
		{#each entries as entry (entry.id)}
			<button class="entry-item" onclick={() => handleEntryClick(entry.id)}>
				<div class="entry-header">
					<h3 class="entry-title">{entry.title}</h3>
					<span class="entry-date">{formatDate(entry.updatedAt)}</span>
				</div>
				{#if entry.tags && entry.tags.length > 0}
					<div class="entry-tags">
						{#each entry.tags as tag (tag)}
							<span class="tag-badge">#{tag}</span>
						{/each}
					</div>
				{/if}
			</button>
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

	.loading-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--spacing-md);
		padding: var(--spacing-3xl);
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

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.entries-list {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}

	.entry-item {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
		padding: var(--spacing-md);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		text-align: left;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.entry-item:hover {
		background: var(--color-bg-secondary);
		border-color: var(--color-primary);
		transform: translateY(-1px);
	}

	.entry-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: var(--spacing-md);
	}

	.entry-title {
		font-size: var(--font-size-md);
		font-weight: var(--font-weight-medium);
		color: var(--color-text);
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.entry-date {
		font-size: var(--font-size-xs);
		color: var(--color-text-secondary);
		white-space: nowrap;
	}

	.entry-tags {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-xs);
	}

	.tag-badge {
		padding: var(--spacing-xs) var(--spacing-sm);
		background: var(--color-primary);
		color: white;
		border-radius: var(--radius-sm);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);
	}

	@media (max-width: 768px) {
		.entry-header {
			flex-direction: column;
			align-items: flex-start;
		}
	}
</style>
