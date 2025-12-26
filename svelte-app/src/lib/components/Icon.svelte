<script lang="ts">
	type IconName = 'arrow-right' | 'plus' | 'file' | 'x' | 'search' | 'grid';

	interface Props {
		name: IconName;
		size?: number;
		class?: string;
	}

	const { name, size = 24, class: className = '' }: Props = $props();

	const iconPath = $derived(`/icons/${name}.svg`);
</script>

<img src={iconPath} alt="" width={size} height={size} class={className} />

<style>
	img {
		display: block;
		flex-shrink: 0;
	}
</style>
