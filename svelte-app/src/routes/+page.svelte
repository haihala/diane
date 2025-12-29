<script lang="ts">
	import SearchBar from '$lib/components/search/SearchBar.svelte';
	import PageLayout from '$lib/components/layouts/PageLayout.svelte';
</script>

<PageLayout>
	<div class="hero-section">
		<h2 class="hero-title">What would you like to capture today?</h2>
		<p class="hero-subtitle">Create notes, track ideas, or search through your knowledge base</p>
	</div>

	<div class="search-section">
		<SearchBar autoFocus />
	</div>
</PageLayout>

<style>
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
		.hero-title {
			font-size: var(--font-size-2xl);
		}

		.hero-subtitle {
			font-size: var(--font-size-md);
		}
	}

	@media (max-width: 480px) {
		.hero-title {
			font-size: var(--font-size-xl);
		}

		.hero-subtitle {
			font-size: var(--font-size-sm);
		}
	}
</style>
