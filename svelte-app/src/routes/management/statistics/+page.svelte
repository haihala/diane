<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
	import StatCard from '$lib/components/StatCard.svelte';
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

<PageHeader title="Statistics" subtitle="Overview of your knowledge base" />

{#if loading}
	<LoadingSpinner message="Loading data..." />
{:else}
	<div class="stats-grid">
		<StatCard icon="file" value={stats.totalEntries} label="Total Entries" />
		<StatCard icon="grid" value={stats.uniqueTags.size} label="Unique Tags" />
		<StatCard icon="grid" value={stats.totalTags} label="Tags Applied" />
	</div>
{/if}

<style>
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--spacing-lg);
	}

	@media (max-width: 768px) {
		.stats-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
