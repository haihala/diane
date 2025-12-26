<script lang="ts">
	import SearchBar from '$lib/components/SearchBar.svelte';

	function handleSearch(value: string): void {
		// Search functionality will be implemented later
		// For now, just log the value
		// eslint-disable-next-line no-console
		console.log('Search:', value);
	}
</script>

<div class="page-container">
	<div class="content-wrapper">
		<header class="header">
			<div class="logo">
				<h1 class="logo-text">Diane</h1>
				<p class="tagline">Your personal knowledge companion</p>
			</div>
		</header>

		<main class="main-content">
			<div class="hero-section">
				<h2 class="hero-title">What would you like to capture today?</h2>
				<p class="hero-subtitle">
					Create notes, track ideas, or search through your knowledge base
				</p>
			</div>

			<div class="search-section">
				<SearchBar onSubmit={handleSearch} />
			</div>

			<div class="quick-actions">
				<div class="action-card">
					<div class="action-icon">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
							<polyline points="14 2 14 8 20 8" />
						</svg>
					</div>
					<h3 class="action-title">Create Entry</h3>
					<p class="action-description">Start a new note or document</p>
				</div>

				<div class="action-card">
					<div class="action-icon">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<circle cx="11" cy="11" r="8" />
							<path d="m21 21-4.35-4.35" />
						</svg>
					</div>
					<h3 class="action-title">Search</h3>
					<p class="action-description">Find existing entries</p>
				</div>

				<div class="action-card">
					<div class="action-icon">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<rect width="7" height="7" x="3" y="3" rx="1" />
							<rect width="7" height="7" x="14" y="3" rx="1" />
							<rect width="7" height="7" x="14" y="14" rx="1" />
							<rect width="7" height="7" x="3" y="14" rx="1" />
						</svg>
					</div>
					<h3 class="action-title">Organize</h3>
					<p class="action-description">Manage your spaces</p>
				</div>
			</div>
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
	}

	.content-wrapper {
		max-width: var(--container-lg);
		margin: 0 auto;
	}

	.header {
		margin-bottom: var(--spacing-3xl);
		text-align: center;
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

	.hero-section {
		text-align: center;
		margin-bottom: var(--spacing-lg);
	}

	.hero-title {
		font-size: var(--font-size-3xl);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
		margin-bottom: var(--spacing-md);
	}

	.hero-subtitle {
		font-size: var(--font-size-lg);
		color: var(--color-text-secondary);
		max-width: 600px;
		margin: 0 auto;
	}

	.search-section {
		margin-bottom: var(--spacing-xl);
	}

	.quick-actions {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: var(--spacing-lg);
		margin-top: var(--spacing-2xl);
	}

	.action-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: var(--spacing-xl);
		text-align: center;
		transition: all var(--transition-normal);
		cursor: pointer;
	}

	.action-card:hover {
		border-color: var(--color-primary);
		box-shadow: var(--shadow-lg);
		transform: translateY(-4px);
	}

	.action-icon {
		width: 56px;
		height: 56px;
		margin: 0 auto var(--spacing-md);
		background: linear-gradient(135deg, var(--color-primary) 0%, #c4b5fd 100%);
		border-radius: var(--radius-lg);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-text-inverted);
	}

	.action-title {
		font-size: var(--font-size-xl);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
		margin-bottom: var(--spacing-sm);
	}

	.action-description {
		font-size: var(--font-size-md);
		color: var(--color-text-secondary);
		margin: 0;
	}

	/* Mobile responsiveness */
	@media (max-width: 768px) {
		.page-container {
			padding: var(--spacing-md);
		}

		.header {
			margin-bottom: var(--spacing-xl);
		}

		.logo-text {
			font-size: var(--font-size-3xl);
		}

		.hero-title {
			font-size: var(--font-size-2xl);
		}

		.hero-subtitle {
			font-size: var(--font-size-md);
		}

		.quick-actions {
			grid-template-columns: 1fr;
			gap: var(--spacing-md);
		}

		.action-card {
			padding: var(--spacing-lg);
		}
	}

	@media (max-width: 480px) {
		.logo-text {
			font-size: var(--font-size-2xl);
		}

		.tagline {
			font-size: var(--font-size-sm);
		}

		.hero-title {
			font-size: var(--font-size-xl);
		}

		.hero-subtitle {
			font-size: var(--font-size-sm);
		}
	}
</style>
