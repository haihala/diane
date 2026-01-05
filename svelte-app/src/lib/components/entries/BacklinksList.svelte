<script lang="ts">
	import type { Entry } from '$lib/types/Entry';

	interface Props {
		backlinks: Entry[];
		isLoading: boolean;
		onBacklinkClick: (entry: Entry) => void;
	}

	const { backlinks, isLoading, onBacklinkClick }: Props = $props();
</script>

{#if isLoading || backlinks.length > 0}
	<div class="backlinks-section" data-testid="backlinks-section">
		<h3 class="backlinks-title">Backlinks</h3>
		{#if isLoading}
			<p class="backlinks-empty">Loading backlinks...</p>
		{:else}
			<ul class="backlinks-list" data-testid="backlinks-list">
				{#each backlinks as backlink (backlink.id)}
					<li class="backlink-item">
						<button type="button" class="backlink-button" onclick={() => onBacklinkClick(backlink)}>
							{backlink.title}
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
{/if}

<style>
	.backlinks-section {
		margin-top: var(--spacing-xl);
		padding-top: var(--spacing-lg);
		border-top: 1px solid var(--color-border);
	}

	.backlinks-title {
		font-size: var(--font-size-md);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
		margin: 0 0 var(--spacing-md) 0;
	}

	.backlinks-empty {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		font-style: italic;
		margin: 0;
	}

	.backlinks-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}

	.backlink-item {
		margin: 0;
	}

	.backlink-button {
		display: block;
		width: 100%;
		text-align: left;
		padding: var(--spacing-sm) var(--spacing-md);
		border: none;
		background: var(--color-bg);
		color: var(--color-primary);
		font-size: var(--font-size-sm);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all var(--transition-fast);
		text-decoration: none;
	}

	.backlink-button:hover {
		background: var(--color-surface-hover);
		text-decoration: underline;
	}

	.backlink-button:active {
		transform: scale(0.98);
	}
</style>
