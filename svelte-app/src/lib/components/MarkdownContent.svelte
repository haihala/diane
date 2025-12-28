<script lang="ts">
	interface Props {
		html: string;
		variant?: 'default' | 'article';
	}

	const { html, variant = 'default' }: Props = $props();
</script>

<div class="markdown-content markdown-{variant}">
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html html}
</div>

<style>
	.markdown-content {
		line-height: 1.6;
		color: var(--color-text, #374151);
	}

	/* Article variant for public wiki pages */
	.markdown-article {
		font-size: 1.125rem;
		line-height: 1.75;
	}

	/* Headings */
	.markdown-content :global(h1) {
		font-size: 2rem;
		font-weight: 700;
		margin: 2rem 0 1rem;
		color: var(--color-text, #111827);
		line-height: 1.3;
	}

	.markdown-content :global(h2) {
		font-size: 1.75rem;
		font-weight: 600;
		margin: 1.75rem 0 1rem;
		color: var(--color-text, #111827);
		line-height: 1.3;
	}

	.markdown-content :global(h3) {
		font-size: 1.5rem;
		font-weight: 600;
		margin: 1.5rem 0 0.75rem;
		color: var(--color-text, #111827);
		line-height: 1.4;
	}

	.markdown-content :global(h4),
	.markdown-content :global(h5),
	.markdown-content :global(h6) {
		font-size: 1.25rem;
		font-weight: 600;
		margin: 1.25rem 0 0.75rem;
		color: var(--color-text, #111827);
		line-height: 1.4;
	}

	/* Paragraphs and text */
	.markdown-content :global(p) {
		margin: 1rem 0;
	}

	.markdown-content :global(strong) {
		font-weight: 700;
	}

	.markdown-content :global(em) {
		font-style: italic;
	}

	.markdown-content :global(del) {
		text-decoration: line-through;
	}

	/* Lists */
	.markdown-content :global(ul),
	.markdown-content :global(ol) {
		margin: 1rem 0;
		padding-left: 2rem;
	}

	.markdown-content :global(li) {
		margin-bottom: 0.5rem;
	}

	/* Blockquotes */
	.markdown-content :global(blockquote) {
		margin: 1.5rem 0;
		padding-left: 1.5rem;
		border-left: 4px solid var(--color-primary, #8b5cf6);
		color: var(--color-text-secondary, #6b7280);
		font-style: italic;
	}

	/* Code */
	.markdown-content :global(code) {
		padding: 0.125rem 0.375rem;
		background: var(--color-surface, #f3f4f6);
		border: 1px solid var(--color-border, #e5e7eb);
		border-radius: 0.25rem;
		font-family: 'Courier New', monospace;
		font-size: 0.9em;
	}

	.markdown-content :global(pre) {
		margin: 1.5rem 0;
		padding: 1.25rem;
		background: var(--color-surface, #f3f4f6);
		border: 1px solid var(--color-border, #e5e7eb);
		border-radius: 0.5rem;
		overflow-x: auto;
	}

	.markdown-content :global(pre code) {
		padding: 0;
		background: transparent;
		border: none;
		font-size: 0.875rem;
	}

	/* Links */
	.markdown-content :global(a) {
		color: var(--color-primary, #8b5cf6);
		text-decoration: none;
		transition: color 0.15s;
	}

	.markdown-content :global(a:hover) {
		text-decoration: underline;
	}

	.markdown-content :global(a.wiki-link) {
		color: var(--color-primary, #8b5cf6);
		text-decoration: none;
		background: rgba(139, 92, 246, 0.1);
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		transition: all 0.15s;
	}

	.markdown-content :global(a.wiki-link:hover) {
		background: rgba(139, 92, 246, 0.2);
		text-decoration: none;
	}

	.markdown-content :global(.wiki-link-invalid) {
		color: var(--color-danger, #ef4444);
		background: rgba(239, 68, 68, 0.1);
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		font-weight: 500;
	}

	/* Images */
	.markdown-content :global(img) {
		max-width: 100%;
		height: auto;
		border-radius: 0.5rem;
		margin: 1.5rem 0;
	}

	/* Horizontal rule */
	.markdown-content :global(hr) {
		border: none;
		border-top: 1px solid var(--color-border, #e5e7eb);
		margin: 2rem 0;
	}

	/* Tables */
	.markdown-content :global(table) {
		width: 100%;
		border-collapse: collapse;
		margin: 1.5rem 0;
	}

	.markdown-content :global(th),
	.markdown-content :global(td) {
		padding: 0.75rem;
		border: 1px solid var(--color-border, #e5e7eb);
		text-align: left;
	}

	.markdown-content :global(th) {
		background: var(--color-surface, #f3f4f6);
		font-weight: 600;
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.markdown-article {
			font-size: 1rem;
		}

		.markdown-content :global(h1) {
			font-size: 1.75rem;
		}

		.markdown-content :global(h2) {
			font-size: 1.5rem;
		}

		.markdown-content :global(h3) {
			font-size: 1.25rem;
		}
	}
</style>
