<script lang="ts">
	import { user, signOut } from '$lib/services/auth';
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';

	interface Props {
		children: Snippet;
	}

	const { children }: Props = $props();

	async function handleSignOut(): Promise<void> {
		try {
			await signOut();
		} catch (error) {
			console.error('Error signing out:', error);
		}
	}

	function isActive(path: string): boolean {
		return $page.url.pathname === path;
	}
</script>

<div class="admin-layout">
	<!-- Top Header -->
	<header class="admin-header">
		<div class="header-left">
			<a href={resolve('/')} class="site-title">Diane</a>
			<span class="header-divider">|</span>
			<a href={resolve('/management')} class="page-name" class:active={isActive('/management')}>
				Management
			</a>
		</div>
		<div class="header-right">
			{#if $user}
				<div class="user-section">
					<span class="user-email">{$user.email}</span>
					<button class="sign-out-button" onclick={handleSignOut}>Sign Out</button>
				</div>
			{/if}
		</div>
	</header>

	<div class="admin-body">
		<!-- Left Sidebar -->
		<nav class="admin-sidebar">
			<div class="sidebar-section">
				<a
					href={resolve('/management/entries')}
					class="nav-item"
					class:active={isActive('/management/entries')}
				>
					Entries
				</a>
				<a
					href={resolve('/management/statistics')}
					class="nav-item"
					class:active={isActive('/management/statistics')}
				>
					Statistics
				</a>
			</div>
		</nav>

		<!-- Main Content -->
		<main class="admin-content">
			{@render children()}
		</main>
	</div>
</div>

<style>
	.admin-layout {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background: var(--color-bg);
	}

	.admin-header {
		background: var(--color-surface);
		border-bottom: 2px solid var(--color-border);
		padding: var(--spacing-md) var(--spacing-xl);
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: var(--spacing-md);
	}

	.site-title {
		font-size: var(--font-size-xl);
		font-weight: var(--font-weight-bold);
		background: linear-gradient(135deg, var(--color-primary) 0%, #c4b5fd 100%);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
		margin: 0;
		text-decoration: none;
		cursor: pointer;
		transition: opacity 0.2s ease;
	}

	.site-title:hover {
		opacity: 0.8;
	}

	.header-divider {
		color: var(--color-text-secondary);
		font-size: var(--font-size-lg);
	}

	.page-name {
		font-size: var(--font-size-lg);
		color: var(--color-text);
		font-weight: var(--font-weight-medium);
		text-decoration: none;
		transition: all 0.2s ease;
	}

	.page-name:hover {
		opacity: 0.7;
	}

	.page-name.active {
		color: var(--color-primary);
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: var(--spacing-md);
	}

	.user-section {
		display: flex;
		align-items: center;
		gap: var(--spacing-md);
		padding: var(--spacing-sm) var(--spacing-md);
		background: var(--color-bg);
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border);
	}

	.user-email {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}

	.sign-out-button {
		padding: var(--spacing-xs) var(--spacing-md);
		background: transparent;
		color: var(--color-text-secondary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		font-size: var(--font-size-sm);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.sign-out-button:hover {
		background: var(--color-bg-secondary);
		color: var(--color-text);
		border-color: var(--color-primary);
	}

	.admin-body {
		display: flex;
		flex: 1;
	}

	.admin-sidebar {
		width: 240px;
		background: var(--color-surface);
		border-right: 1px solid var(--color-border);
		padding: var(--spacing-lg) 0;
	}

	.sidebar-section {
		display: flex;
		flex-direction: column;
	}

	.nav-item {
		padding: var(--spacing-md) var(--spacing-xl);
		color: var(--color-text);
		text-decoration: none;
		font-size: var(--font-size-sm);
		transition: all 0.2s ease;
		border-left: 3px solid transparent;
	}

	.nav-item:hover {
		background: var(--color-bg-secondary);
		color: var(--color-primary);
	}

	.nav-item.active {
		background: var(--color-bg-secondary);
		color: var(--color-primary);
		border-left-color: var(--color-primary);
		font-weight: var(--font-weight-semibold);
	}

	.admin-content {
		flex: 1;
		padding: var(--spacing-2xl);
		overflow-y: auto;
	}

	/* Mobile responsiveness */
	@media (max-width: 768px) {
		.admin-header {
			flex-direction: column;
			gap: var(--spacing-md);
			align-items: flex-start;
		}

		.header-right {
			width: 100%;
			justify-content: space-between;
		}

		.admin-sidebar {
			width: 100%;
			border-right: none;
			border-bottom: 1px solid var(--color-border);
		}

		.admin-body {
			flex-direction: column;
		}

		.user-email {
			display: none;
		}
	}
</style>
