<script lang="ts">
	import { user, signOut } from '$lib/services/auth';
	import Icon from './Icon.svelte';

	async function handleSignOut(): Promise<void> {
		try {
			await signOut();
		} catch (error) {
			console.error('Error signing out:', error);
		}
	}

	function goToManagement(): void {
		window.location.href = '/management';
	}
</script>

<div class="page-container">
	<div class="top-bar">
		{#if $user}
			<div class="user-section">
				<span class="user-email">{$user.email}</span>
				<button class="sign-out-button" onclick={handleSignOut}> Sign Out </button>
			</div>
			<button class="settings-button" onclick={goToManagement} title="Management">
				<Icon name="settings" size={20} />
			</button>
		{/if}
	</div>

	<div class="content-wrapper">
		<header class="header">
			<div class="logo">
				<h1 class="logo-text">Diane</h1>
				<p class="tagline">Your personal knowledge companion</p>
			</div>
		</header>

		<main class="main-content">
			<slot />
		</main>
	</div>
</div>

<style>
	.page-container {
		min-height: 100vh;
		background: linear-gradient(
			135deg,
			var(--color-bg) 0%,
			var(--color-bg-secondary) 50%,
			var(--color-bg-tertiary) 100%
		);
		padding: var(--spacing-xl);
		display: flex;
		flex-direction: column;
	}

	.top-bar {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		gap: var(--spacing-md);
		margin-bottom: var(--spacing-xl);
		width: 100%;
	}

	.content-wrapper {
		max-width: var(--container-lg);
		margin: 0 auto;
		position: relative;
		width: 100%;
	}

	.settings-button {
		padding: var(--spacing-sm);
		background: var(--color-surface);
		color: white;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.settings-button :global(img) {
		filter: brightness(0) invert(1);
	}

	.settings-button:hover {
		background: var(--color-bg-secondary);
		border-color: var(--color-primary);
	}

	.settings-button:hover :global(img) {
		filter: brightness(0) saturate(100%) invert(48%) sepia(79%) saturate(2476%) hue-rotate(231deg)
			brightness(102%) contrast(102%);
	}

	.header {
		margin-bottom: var(--spacing-3xl);
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.user-section {
		display: flex;
		align-items: center;
		gap: var(--spacing-md);
		padding: var(--spacing-sm) var(--spacing-md);
		background: var(--color-surface);
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

	.logo {
		display: inline-block;
	}

	.logo-text {
		font-size: var(--font-size-4xl);
		font-weight: var(--font-weight-bold);
		background: linear-gradient(135deg, var(--color-primary) 0%, #c4b5fd 100%);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
		margin-bottom: var(--spacing-xs);
	}

	.tagline {
		font-size: var(--font-size-md);
		color: var(--color-text-secondary);
		font-weight: var(--font-weight-medium);
	}

	.main-content {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-2xl);
	}

	/* Mobile responsiveness */
	@media (max-width: 768px) {
		.page-container {
			padding: var(--spacing-md);
		}

		.top-bar {
			margin-bottom: var(--spacing-md);
		}

		.header {
			margin-bottom: var(--spacing-xl);
		}

		.logo-text {
			font-size: var(--font-size-3xl);
		}

		.user-section {
			padding: var(--spacing-xs) var(--spacing-sm);
		}

		.user-email {
			display: none;
		}
	}

	@media (max-width: 480px) {
		.logo-text {
			font-size: var(--font-size-2xl);
		}

		.tagline {
			font-size: var(--font-size-sm);
		}
	}
</style>
