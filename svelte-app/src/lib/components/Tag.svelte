<script lang="ts">
	interface Props {
		tag: string;
		size?: 'small' | 'medium';
	}

	const { tag, size = 'medium' }: Props = $props();

	// Generate a consistent color based on the tag string
	function getTagColor(tag: string): string {
		// Simple hash function to generate a consistent hue
		let hash = 0;
		for (let i = 0; i < tag.length; i++) {
			hash = tag.charCodeAt(i) + ((hash << 5) - hash);
		}
		// Use modulo to get a hue value between 0 and 360
		const hue = Math.abs(hash % 360);
		return `hsl(${hue}, 60%, 45%)`;
	}

	const tagColor = $derived(getTagColor(tag));
</script>

<span class="tag" class:tag-small={size === 'small'} style="--tag-color: {tagColor}">
	#{tag}
</span>

<style>
	.tag {
		display: inline-flex;
		align-items: center;
		padding: 4px 12px;
		border-radius: 12px;
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		background: color-mix(in srgb, var(--tag-color) 15%, transparent);
		color: var(--tag-color);
		border: 1px solid color-mix(in srgb, var(--tag-color) 30%, transparent);
		transition: all var(--transition-fast);
		white-space: nowrap;
	}

	.tag-small {
		padding: 2px 8px;
		font-size: var(--font-size-xs);
		border-radius: 8px;
	}

	.tag:hover {
		background: color-mix(in srgb, var(--tag-color) 25%, transparent);
		border-color: var(--tag-color);
	}
</style>
