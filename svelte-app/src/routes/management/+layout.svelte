<script lang="ts">
	import { user, userData, impersonatedUser } from '$lib/services/auth';
	import UserInfo from '$lib/components/auth/UserInfo.svelte';
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	interface Props {
		children: Snippet;
	}

	const { children }: Props = $props();

	// Use impersonated user's admin status if impersonating, otherwise use actual user's status
	const isAdmin = $derived(
		$impersonatedUser ? $impersonatedUser.userData.isAdmin : ($userData?.isAdmin ?? false)
	);

	function isActive(path: string): boolean {
		return page.url.pathname === path;
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
				<UserInfo />
			{/if}
		</div>
	</header>

	<div class="admin-body">
		<!-- Left Sidebar -->
		<nav class="admin-sidebar">
		{#if isAdmin}
			<div class="sidebar-section">
				<h3 class="section-header">Admin</h3>
				<a
					href={resolve('/management/users')}
					class="nav-item"
					class:active={isActive('/management/users')}
				>
					Users
				</a>
				<a
					href={resolve('/management/admin-statistics')}
					class="nav-item"
					class:active={isActive('/management/admin-statistics')}
				>
					Statistics
				</a>
			</div>
		{/if}

		<div class="sidebar-section">
			<h3 class="section-header">Personal</h3>
			<a
				href={resolve('/management/entries')}
				class="nav-item"
				class:active={isActive('/management/entries')}
			>
				Entries
			</a>
			<a
				href={resolve('/management/tags')}
				class="nav-item"
				class:active={isActive('/management/tags')}
			>
				Tags
			</a>
			<a
				href={resolve('/management/statistics')}
				class="nav-item"
				class:active={isActive('/management/statistics')}
			>
				Statistics
			</a>
		</div>

			<div class="sidebar-section">
				<h3 class="section-header">Shared</h3>
				<a
					href={resolve('/management/wikis')}
					class="nav-item"
					class:active={isActive('/management/wikis')}
				>
					Wikis
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

	.sidebar-section + .sidebar-section {
		margin-top: var(--spacing-xl);
		padding-top: var(--spacing-lg);
		border-top: 1px solid var(--color-border);
	}

	.section-header {
		padding: var(--spacing-sm) var(--spacing-xl);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0 0 var(--spacing-xs) 0;
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
	}
</style>
