<script lang="ts">
	import Icon from '../common/Icon.svelte';

	type IconName =
		| 'arrow-right'
		| 'plus'
		| 'file'
		| 'x'
		| 'search'
		| 'grid'
		| 'settings'
		| 'tag'
		| 'person';

	interface Props {
		icon: IconName;
		value: string | number;
		label: string;
	}

	const { icon, value, label }: Props = $props();
</script>

<div class="stat-card">
	<div class="stat-icon">
		<Icon name={icon} />
	</div>
	<div class="stat-content">
		<div class="stat-value">{value}</div>
		<div class="stat-label">{label}</div>
	</div>
</div>

<style>
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

	.stat-icon :global(img) {
		filter: brightness(0) invert(1);
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
</style>
