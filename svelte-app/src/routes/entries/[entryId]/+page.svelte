<script lang="ts">
	import { goto, beforeNavigate, invalidate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import EntryModal from '$lib/components/EntryModal.svelte';
	import PageLayout from '$lib/components/PageLayout.svelte';
	import type { PageData } from './$types';

	// eslint-disable-next-line prefer-const
	let { data }: { data: PageData } = $props();

	let entryModalRef: { saveIfNeeded: () => Promise<void> } | undefined = $state();

	// Modal should be open whenever we have entry data
	const isModalOpen = $derived(!!data.entry);

	// Save entry before navigating away
	beforeNavigate((_navigation) => {
		// Only intercept navigation to other entries or home
		if (data.entry && entryModalRef) {
			void (async () => {
				try {
					// Get current values from the modal via a public method
					if (entryModalRef) {
						await entryModalRef.saveIfNeeded();
					}
				} catch (error) {
					console.error('Failed to save entry before navigation:', error);
					// Continue with navigation even if save fails
				}
			})();
		}
	});

	function handleModalClose(): void {
		// Navigate back to home when modal closes
		// This will cause data.entry to become undefined, closing the modal
		void goto(resolve('/'));
	}

	async function handleModalSave(): Promise<void> {
		// Reload the current entry to pick up any backlink updates
		await invalidate((url) => url.pathname.startsWith('/entries/'));
	}
</script>

<!-- Render the home page content in the background -->
<PageLayout>
	<div class="hero-section">
		<h2 class="hero-title">What would you like to capture today?</h2>
		<p class="hero-subtitle">Create notes, track ideas, or search through your knowledge base</p>
	</div>

	<div class="search-section">
		<SearchBar autoFocus={false} />
	</div>
</PageLayout>

<!-- Show the modal with the entry data -->
<EntryModal
	bind:this={entryModalRef}
	isOpen={isModalOpen}
	onClose={handleModalClose}
	onSave={handleModalSave}
	entry={data.entry}
/>

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
