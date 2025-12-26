<script lang="ts">
	import SearchBar from '$lib/components/SearchBar.svelte';

	function handleSearch(value: string): void {
		// Search functionality is now handled internally by SearchBar
		// eslint-disable-next-line no-console
		console.log('Search:', value);
	}

	function handleNewEntry(): void {
		// Entry was successfully saved to Firestore
		// eslint-disable-next-line no-console
		console.log('New entry saved');
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
				<SearchBar onSubmit={handleSearch} onNewEntry={handleNewEntry} autoFocus />
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
