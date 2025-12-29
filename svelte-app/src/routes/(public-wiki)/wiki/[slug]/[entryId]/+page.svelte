<script lang="ts">
	import PublicWikiEntry from '$lib/components/wiki/PublicWikiEntry.svelte';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.entry.title} - {data.wiki.name}</title>
</svelte:head>

<PublicWikiEntry wiki={data.wiki} entry={data.entry} />
