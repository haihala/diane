<script lang="ts">
	import EntryEditPage from '$lib/components/entries/EntryEditPage.svelte';
	import type { PageData } from './$types';

	// eslint-disable-next-line prefer-const
	let { data }: { data: PageData } = $props();
</script>

<EntryEditPage entry={data.entry} />
