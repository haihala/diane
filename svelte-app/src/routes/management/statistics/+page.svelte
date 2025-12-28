<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { getAllEntries } from '$lib/services/entries';
	import { onMount } from 'svelte';
	import type { Entry } from '$lib/types/Entry';
	import { SvelteSet } from 'svelte/reactivity';

	let entries: Entry[] = $state([]);
	let loading = $state(true);
	const stats = $state({
		totalEntries: 0,
		totalTags: 0,
		uniqueTags: new SvelteSet<string>()
	});

	async function loadData(): Promise<void> {
		try {
			loading = true;
			entries = await getAllEntries();

			// Calculate statistics
			stats.totalEntries = entries.length;
			const allTags = new SvelteSet<string>();
			let tagCount = 0;

			entries.forEach((entry) => {
				if (entry.tags && entry.tags.length > 0) {
					tagCount += entry.tags.length;
					entry.tags.forEach((tag) => allTags.add(tag));
				}
			});

			stats.totalTags = tagCount;
			stats.uniqueTags = allTags;
		} catch (error) {
			console.error('Error loading management data:', error);
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		void loadData();
	});
</script>

<div class="page-header">
	<h1 class="page-title">Statistics</h1>
	<p class="page-subtitle">Overview of your knowledge base</p>
</div>

{#if loading}
	<div class="loading-state">
		<div class="spinner"></div>
		<p>Loading data...</p>
	</div>
{:else}
	<div class="stats-grid">
		<div class="stat-card">
			<div class="stat-icon">
				<Icon name="file" />
			</div>
			<div class="stat-content">
				<div class="stat-value">{stats.totalEntries}</div>
				<div class="stat-label">Total Entries</div>
			</div>
		</div>
		<div class="stat-card">
			<div class="stat-icon">
				<Icon name="grid" />
			</div>
			<div class="stat-content">
				<div class="stat-value">{stats.uniqueTags.size}</div>
				<div class="stat-label">Unique Tags</div>
			</div>
		</div>
		<div class="stat-card">
			<div class="stat-icon">
				<Icon name="grid" />
			</div>
			<div class="stat-content">
				<div class="stat-value">{stats.totalTags}</div>
				<div class="stat-label">Tags Applied</div>
			</div>
		</div>
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

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--spacing-lg);
	}

	.stat-card {
		display: flex;
		align-items: center;
		gap: var(--spacing-md);
		padding: var(--spacing-lg);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
	}

	.stat-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		background: var(--color-primary);
		border-radius: var(--radius-md);
		color: white;
	}

	.stat-content {
		flex: 1;
	}

	.stat-value {
		font-size: var(--font-size-2xl);
		font-weight: var(--font-weight-bold);
		color: var(--color-text);
		line-height: 1;
		margin-bottom: var(--spacing-xs);
	}

	.stat-label {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}

	@media (max-width: 768px) {
		.stats-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
