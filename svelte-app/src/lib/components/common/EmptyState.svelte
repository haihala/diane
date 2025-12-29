<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from '../common/Icon.svelte';

	type IconName = 'arrow-right' | 'plus' | 'file' | 'x' | 'search' | 'grid' | 'settings';

	interface Props {
		icon?: IconName;
		message: string;
		action?: Snippet;
	}

	const { icon = 'search', message, action }: Props = $props();
</script>

<div class="empty-state">
	<div class="empty-icon">
		<Icon name={icon} size={24} />
	</div>
	<div class="empty-message">{message}</div>
	{#if action}
		<div class="empty-action">
			{@render action()}
		</div>
	{/if}
</div>

<style>
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: var(--spacing-xl);
		text-align: center;
		gap: var(--spacing-md);
	}

	.empty-icon {
		color: var(--color-text-secondary);
		opacity: 0.5;
	}

	.empty-message {
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
	}

	.empty-action {
		margin-top: var(--spacing-sm);
	}
</style>
