<script lang="ts">
	import { impersonatedUser } from '$lib/services/auth';

	interface Props {
		title: string;
		subtitle?: string;
	}

	const { title, subtitle }: Props = $props();
</script>

{#if $impersonatedUser}
	<div class="impersonation-banner">
		<span class="banner-icon">⚠️</span>
		<span class="banner-text"
			>Viewing as <strong
				>{$impersonatedUser.userData.displayName ?? $impersonatedUser.userData.email}</strong
			></span
		>
	</div>
{/if}

<div class="page-header">
	<h1 class="page-title">{title}</h1>
	{#if subtitle}
		<p class="page-subtitle">{subtitle}</p>
	{/if}
</div>

<style>
	.impersonation-banner {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		padding: var(--spacing-md);
		background: rgba(255, 152, 0, 0.1);
		border: 2px solid #ff9800;
		border-radius: var(--radius-md);
		margin-bottom: var(--spacing-lg);
	}

	.banner-icon {
		font-size: var(--font-size-lg);
	}

	.banner-text {
		font-size: var(--font-size-sm);
		color: var(--color-text);
	}

	.banner-text strong {
		font-weight: var(--font-weight-bold);
		color: #ff9800;
	}

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
