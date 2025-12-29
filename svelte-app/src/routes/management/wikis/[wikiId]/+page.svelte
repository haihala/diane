<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import LoadingSpinner from '$lib/components/common/LoadingSpinner.svelte';
	import EmptyState from '$lib/components/common/EmptyState.svelte';
	import Tag from '$lib/components/common/Tag.svelte';
	import Button from '$lib/components/common/Button.svelte';
	import MarkdownContent from '$lib/components/editor/MarkdownContent.svelte';
	import { extractEntryIdsFromContent, loadEntryTitles } from '$lib/services/entries';
	import { astToText, renderASTWithCursor } from '$lib/services/ast';
	import { updateWikiNameAndSlug } from '$lib/services/wikis';
	import { toast } from '$lib/services/toast';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();

	let entryTitles = $state<Map<string, string>>(new Map());
	let loading = $state(true);
	let editing = $state(false);
	let editName = $state('');
	let editSlug = $state('');
	let saving = $state(false);
	let error = $state<string | null>(null);

	// Initialize edit values when wiki changes
	$effect(() => {
		if (data.wiki) {
			editName = data.wiki.name;
			editSlug = data.wiki.slug;
		}
	});

	// Load titles for all linked entries
	$effect(() => {
		if (data.pages && data.pages.length > 0) {
			void loadAllTitles();
		}
	});

	async function loadAllTitles(): Promise<void> {
		try {
			loading = true;
			const allEntryIds = new SvelteSet<string>();

			// Extract all entry IDs from all pages' content AST
			for (const page of data.pages) {
				const text = astToText(page.contentAST);
				const ids = extractEntryIdsFromContent(text);
				ids.forEach((id) => allEntryIds.add(id));
			}

			if (allEntryIds.size > 0) {
				const titleMap = await loadEntryTitles([...allEntryIds]);
				entryTitles = titleMap;
			}
		} catch (error) {
			console.error('Failed to load entry titles:', error);
		} finally {
			loading = false;
		}
	}

	function startEditing(): void {
		editing = true;
		error = null;
	}

	function cancelEditing(): void {
		editing = false;
		error = null;
		if (data.wiki) {
			editName = data.wiki.name;
			editSlug = data.wiki.slug;
		}
	}

	async function saveWikiInfo(): Promise<void> {
		if (!data.wiki) return;

		try {
			saving = true;
			error = null;

			await updateWikiNameAndSlug(data.wiki.id, editName, editSlug);

			// Update local data
			data.wiki.name = editName;
			data.wiki.slug = editSlug;

			editing = false;
			toast.success('Wiki updated successfully');
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to update wiki';
			toast.error('Failed to update wiki');
		} finally {
			saving = false;
		}
	}

	// Separate main page from other pages
	const linkedPages = $derived(
		data.pages.filter((p) => data.wiki && p.id !== data.wiki.rootPageId)
	);

	// Render markdown for any page
	function renderPageHtml(contentAST: import('$lib/services/ast').ASTNode): string {
		return renderASTWithCursor(contentAST, -1, entryTitles);
	}
</script>

<div class="wiki-view">
	<div class="page-header">
		{#if editing}
			<div class="edit-form">
				<div class="form-group">
					<label for="wiki-name">Wiki Name</label>
					<input
						id="wiki-name"
						type="text"
						class="input"
						bind:value={editName}
						placeholder="Enter wiki name"
					/>
				</div>
				<div class="form-group">
					<label for="wiki-slug">URL Slug</label>
					<input
						id="wiki-slug"
						type="text"
						class="input"
						bind:value={editSlug}
						placeholder="enter-url-slug"
					/>
				</div>
				{#if error}
					<div class="error-message">{error}</div>
				{/if}
				<div class="form-actions">
					<Button variant="primary" onclick={saveWikiInfo} disabled={saving}>
						{saving ? 'Saving...' : 'Save'}
					</Button>
					<Button variant="secondary" onclick={cancelEditing} disabled={saving}>Cancel</Button>
				</div>
			</div>
		{:else}
			<div class="wiki-info">
				<div class="wiki-header-row">
					<h1 class="page-title">{data.wiki?.name ?? 'Wiki'}</h1>
					<Button variant="secondary" onclick={startEditing} size="sm">Edit</Button>
				</div>
				<div class="wiki-metadata">
					<p class="metadata-item">
						<span class="metadata-label">Slug:</span>
						<span class="metadata-value">{data.wiki?.slug ?? ''}</span>
					</p>
				</div>
			</div>
		{/if}
		<p class="page-subtitle">
			{linkedPages.length} linked {linkedPages.length === 1 ? 'page' : 'pages'}
		</p>
	</div>

	{#if loading}
		<LoadingSpinner message="Loading wiki pages..." />
	{:else if !data.mainPage}
		<EmptyState icon="file" message="Wiki entry not found" />
	{:else}
		<!-- Root Page -->
		<div class="pages-section">
			<h2 class="section-title">Root Page</h2>
			<div class="page-card">
				<h3 class="page-card-title">{data.mainPage.title}</h3>
				<MarkdownContent html={renderPageHtml(data.mainPage.contentAST)} />
				{#if data.mainPage.tags && data.mainPage.tags.length > 0}
					<div class="page-tags">
						{#each data.mainPage.tags as tag (tag)}
							<Tag {tag} size="small" />
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<!-- Linked Pages -->
		{#if linkedPages.length > 0}
			<div class="pages-section">
				<h2 class="section-title">Linked Pages</h2>
				<div class="pages-list">
					{#each linkedPages as page (page.id)}
						<div class="page-card">
							<h3 class="page-card-title">{page.title}</h3>
							<MarkdownContent html={renderPageHtml(page.contentAST)} />
							{#if page.tags && page.tags.length > 0}
								<div class="page-tags">
									{#each page.tags as tag (tag)}
										<Tag {tag} size="small" />
									{/each}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/if}
	{/if}
</div>

<style>
	.wiki-view {
		max-width: 900px;
		margin: 0 auto;
	}

	.page-header {
		margin-bottom: var(--spacing-2xl);
	}

	.wiki-header-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--spacing-md);
	}

	.wiki-info {
		margin-bottom: var(--spacing-lg);
	}

	.wiki-metadata {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
		margin-top: var(--spacing-sm);
	}

	.metadata-item {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		margin: 0;
	}

	.metadata-label {
		font-weight: var(--font-weight-semibold);
		margin-right: var(--spacing-xs);
	}

	.metadata-value {
		color: var(--color-text);
	}

	.edit-form {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: var(--spacing-xl);
		margin-bottom: var(--spacing-lg);
	}

	.form-group {
		margin-bottom: var(--spacing-lg);
	}

	.form-group label {
		display: block;
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
		margin-bottom: var(--spacing-xs);
	}

	.input {
		width: 100%;
		padding: var(--spacing-sm) var(--spacing-md);
		font-size: var(--font-size-md);
		color: var(--color-text);
		background: var(--color-background);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		transition: border-color 0.2s;
	}

	.input:focus {
		outline: none;
		border-color: var(--color-primary);
	}

	.error-message {
		padding: var(--spacing-sm) var(--spacing-md);
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: var(--radius-md);
		color: #ef4444;
		font-size: var(--font-size-sm);
		margin-bottom: var(--spacing-md);
	}

	.form-actions {
		display: flex;
		gap: var(--spacing-sm);
	}

	.page-title {
		font-size: var(--font-size-3xl);
		font-weight: var(--font-weight-bold);
		color: var(--color-text);
		margin: 0;
	}

	.page-subtitle {
		font-size: var(--font-size-md);
		color: var(--color-text-secondary);
	}

	.pages-section {
		margin-top: var(--spacing-2xl);
	}

	.pages-section:first-of-type {
		margin-top: 0;
	}

	.section-title {
		font-size: var(--font-size-xl);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
		margin-bottom: var(--spacing-lg);
	}

	.pages-list {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xl);
	}

	.page-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: var(--spacing-xl);
	}

	.page-card-title {
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
		margin: 0 0 var(--spacing-md) 0;
	}

	.page-tags {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-xs);
		padding-top: var(--spacing-md);
		border-top: 1px solid var(--color-border);
	}

	/* Mobile responsiveness */
	@media (max-width: 768px) {
		.page-title {
			font-size: var(--font-size-2xl);
		}

		.page-card {
			padding: var(--spacing-lg);
		}
	}
</style>
