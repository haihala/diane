<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { SvelteMap } from 'svelte/reactivity';
	import Button from '$lib/components/Button.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
	import EntrySearchModal from '$lib/components/EntrySearchModal.svelte';
	import { getAllWikis, createWiki, deleteWiki, getWikiDisplayName } from '$lib/services/wikis';
	import type { Entry } from '$lib/types/Entry';
	import type { Wiki } from '$lib/types/Wiki';

	let wikis = $state<Wiki[]>([]);
	const wikiDisplayNames = new SvelteMap<string, string>();
	let loading = $state(true);
	let error = $state<string | null>(null);
	let isSearchOpen = $state(false);
	let creatingWiki = $state(false);
	let deletingWikiId = $state<string | null>(null);

	async function loadWikis(): Promise<void> {
		try {
			loading = true;
			error = null;
			wikis = await getAllWikis();
			// Load display names for all wikis
			wikiDisplayNames.clear();
			for (const wiki of wikis) {
				const displayName = await getWikiDisplayName(wiki);
				wikiDisplayNames.set(wiki.id, displayName);
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load wikis';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		void loadWikis();
	});

	function handleAddWikiClick(): void {
		isSearchOpen = true;
		error = null;
	}

	function handleSearchClose(): void {
		isSearchOpen = false;
		error = null;
	}

	async function handleEntrySelect(entry: Entry): Promise<void> {
		try {
			creatingWiki = true;
			error = null;
			await createWiki({ rootPageId: entry.id });
			await loadWikis(); // Reload the wikis list
			handleSearchClose();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create wiki';
		} finally {
			creatingWiki = false;
		}
	}

	async function handleRemoveWiki(wikiId: string): Promise<void> {
		try {
			deletingWikiId = wikiId;
			error = null;
			await deleteWiki(wikiId);
			await loadWikis(); // Reload the wikis list
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to delete wiki';
		} finally {
			deletingWikiId = null;
		}
	}

	function handleWikiClick(wikiId: string): void {
		void goto(resolve('/management/wikis/[wikiId]', { wikiId }));
	}
</script>

<div class="page-header">
	<div class="header-content">
		<div>
			<h1 class="page-title">Wikis</h1>
			<p class="page-subtitle">Manage shared wiki pages</p>
		</div>
		<div class="header-actions">
			<Button variant="primary" onclick={handleAddWikiClick}>Add Wiki</Button>
		</div>
	</div>
</div>

{#if error}
	<div class="error-banner">
		<p class="error-message">{error}</p>
		<Button variant="secondary" size="sm" onclick={loadWikis}>Retry</Button>
	</div>
{/if}

{#if loading}
	<LoadingSpinner message="Loading wikis..." />
{:else if wikis.length === 0}
	<EmptyState icon="file" message="No wikis yet. Add an entry to get started!">
		{#snippet action()}
			<Button variant="primary" onclick={handleAddWikiClick}>Add Your First Wiki</Button>
		{/snippet}
	</EmptyState>
{:else}
	<div class="wikis-list">
		{#each wikis as wiki (wiki.id)}
			<div class="wiki-item">
				<button class="wiki-content" onclick={() => handleWikiClick(wiki.id)}>
					<h3 class="wiki-title">{wikiDisplayNames.get(wiki.id) ?? wiki.rootPageId}</h3>
				</button>
				<Button
					variant="secondary"
					size="sm"
					onclick={() => handleRemoveWiki(wiki.id)}
					disabled={deletingWikiId === wiki.id}
				>
					{deletingWikiId === wiki.id ? 'Removing...' : 'Remove'}
				</Button>
			</div>
		{/each}
	</div>
{/if}

<EntrySearchModal
	isOpen={isSearchOpen}
	title="Search Your Entries"
	subtitle="Find an entry to add as a wiki"
	excludeEntryIds={wikis.map((w) => w.rootPageId)}
	loading={creatingWiki}
	{error}
	onClose={handleSearchClose}
	onSelect={handleEntrySelect}
/>

<style>
	.page-header {
		margin-bottom: var(--spacing-2xl);
	}

	.header-content {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--spacing-lg);
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

	.header-actions {
		display: flex;
		gap: var(--spacing-md);
		align-items: center;
	}

	/* Error Banner */
	.error-banner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--spacing-md);
		padding: var(--spacing-md) var(--spacing-lg);
		margin-bottom: var(--spacing-lg);
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: var(--radius-md);
	}

	.error-message {
		color: #ef4444;
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		margin: 0;
	}

	/* Wikis List */
	.wikis-list {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}

	.wiki-item {
		display: flex;
		align-items: center;
		gap: var(--spacing-md);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: var(--spacing-md);
		transition: all 0.2s ease;
	}

	.wiki-item:hover {
		background: var(--color-bg-secondary);
		border-color: var(--color-primary);
		transform: translateY(-1px);
	}

	.wiki-content {
		flex: 1;
		text-align: left;
		background: transparent;
		border: none;
		padding: 0;
		cursor: pointer;
		color: var(--color-text);
		min-width: 0;
	}

	.wiki-title {
		font-size: var(--font-size-md);
		font-weight: var(--font-weight-medium);
		color: var(--color-text);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		margin: 0;
	}

	/* Mobile responsiveness */
	@media (max-width: 768px) {
		.header-content {
			flex-direction: column;
			align-items: stretch;
		}

		.wiki-item {
			flex-direction: column;
			align-items: stretch;
		}

		.error-banner {
			flex-direction: column;
			align-items: flex-start;
		}
	}
</style>
