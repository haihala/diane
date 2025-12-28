<script lang="ts">
	interface Props {
		title: string;
		subtitle?: string;
	}

	const { title, subtitle }: Props = $props();
</script>

<div class="page-header">
	<h1 class="page-title">{title}</h1>
	{#if subtitle}
		<p class="page-subtitle">{subtitle}</p>
	{/if}
</div>

<style>
	.page-header {
		margin-bottom: var(--spacing-2xl);
	}

	.page-title {
		font-size: var(--font-size-3xl);
		font-weight: var(--font-weight-bold);
		color: var(--color-text);
		margin-bottom: var(--spacing-sm);
		margin: 0;
	}

	.page-subtitle {
		font-size: var(--font-size-md);
		color: var(--color-text-secondary);
		margin: var(--spacing-sm) 0 0 0;
	}
</style>
