<script lang="ts">
	import { user, userData, impersonatedUser } from '$lib/services/auth';
	import UserInfo from '$lib/components/auth/UserInfo.svelte';
	import Icon from '$lib/components/common/Icon.svelte';
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

	let mobileMenuOpen = $state(false);

	function isActive(path: string): boolean {
		return page.url.pathname === path;
	}

	function toggleMobileMenu(): void {
		mobileMenuOpen = !mobileMenuOpen;
	}

	function closeMobileMenu(): void {
		mobileMenuOpen = false;
	}
</script>

<div class="admin-layout">
	<!-- Top Header -->
	<header class="admin-header">
		<div class="header-left">
			<button class="mobile-menu-toggle" onclick={toggleMobileMenu} aria-label="Toggle menu">
				<Icon name={mobileMenuOpen ? 'x' : 'menu'} size={20} />
			</button>
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
		<nav class="admin-sidebar" class:mobile-open={mobileMenuOpen}>
			{#if isAdmin}
				<div class="sidebar-section">
					<h3 class="section-header">Admin</h3>
					<a
						href={resolve('/management/users')}
						class="nav-item"
						class:active={isActive('/management/users')}
						onclick={closeMobileMenu}
					>
						Users
					</a>
					<a
						href={resolve('/management/admin-statistics')}
						class="nav-item"
						class:active={isActive('/management/admin-statistics')}
						onclick={closeMobileMenu}
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
					onclick={closeMobileMenu}
				>
					Entries
				</a>
				<a
					href={resolve('/management/tags')}
					class="nav-item"
					class:active={isActive('/management/tags')}
					onclick={closeMobileMenu}
				>
					Tags
				</a>
				<a
					href={resolve('/management/statistics')}
					class="nav-item"
					class:active={isActive('/management/statistics')}
					onclick={closeMobileMenu}
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
					onclick={closeMobileMenu}
				>
					Wikis
				</a>
			</div>
		</nav>

		<!-- Overlay for mobile menu -->
		{#if mobileMenuOpen}
			<button class="mobile-overlay" onclick={closeMobileMenu} aria-label="Close menu" type="button"
			></button>
		{/if}

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

	.mobile-menu-toggle {
		display: none;
		background: none;
		border: none;
		cursor: pointer;
		padding: var(--spacing-xs);
		transition: all 0.2s ease;
	}

	.mobile-menu-toggle :global(img) {
		filter: brightness(0) invert(1);
	}

	.mobile-menu-toggle:hover :global(img) {
		filter: brightness(0) saturate(100%) invert(48%) sepia(79%) saturate(2476%) hue-rotate(231deg)
			brightness(102%) contrast(102%);
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
		position: relative;
	}

	.admin-sidebar {
		width: 240px;
		background: var(--color-surface);
		border-right: 1px solid var(--color-border);
		padding: var(--spacing-lg) 0;
		overflow-y: auto;
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

	.mobile-overlay {
		display: none;
		border: none;
		padding: 0;
		background: none;
		cursor: pointer;
	}

	/* Mobile responsiveness */
	@media (max-width: 768px) {
		.admin-header {
			padding: var(--spacing-sm) var(--spacing-md);
		}

		.header-left {
			gap: var(--spacing-sm);
		}

		.mobile-menu-toggle {
			display: flex;
			align-items: center;
			justify-content: center;
		}

		.site-title {
			font-size: var(--font-size-lg);
		}

		.header-divider {
			font-size: var(--font-size-sm);
		}

		.page-name {
			font-size: var(--font-size-md);
		}

		.admin-body {
			position: relative;
		}

		.admin-sidebar {
			position: fixed;
			top: 0;
			left: 0;
			bottom: 0;
			width: 240px;
			z-index: 1000;
			transform: translateX(-100%);
			transition: transform 0.3s ease;
			padding: var(--spacing-md) 0;
		}

		.admin-sidebar.mobile-open {
			transform: translateX(0);
		}

		.mobile-overlay {
			display: block;
			position: fixed;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
			width: 100%;
			height: 100%;
			background: rgba(0, 0, 0, 0.5);
			z-index: 999;
			border: none;
			padding: 0;
			cursor: pointer;
		}

		.admin-content {
			padding: var(--spacing-md);
			width: 100%;
		}
	}

	@media (max-width: 480px) {
		.admin-header {
			padding: var(--spacing-xs) var(--spacing-sm);
		}

		.site-title {
			font-size: var(--font-size-md);
		}

		.admin-content {
			padding: var(--spacing-sm);
		}
	}
</style>
