<script lang="ts">
	import { renderASTWithCursor, astToText, type ASTNode } from '$lib/services/ast';
	import { extractEntryIdsFromContent, loadEntryTitlesPublic } from '$lib/services/entries';
	import MarkdownContent from '$lib/components/editor/MarkdownContent.svelte';

	interface Props {
		wiki: {
			slug: string;
		};
		entry: {
			title: string;
			contentAST: ASTNode;
		};
	}

	const { wiki, entry }: Props = $props();

	// Extract all entry IDs from content and load their titles
	let entryTitleMap = $state(new Map<string, string>());

	$effect(() => {
		const text = astToText(entry.contentAST);
		const entryIds = extractEntryIdsFromContent(text);
		void loadEntryTitlesPublic(entryIds).then((map) => {
			entryTitleMap = map;
		});
	});

	// Render AST with cursor beyond content (so all markdown is rendered)
	const renderedHTML = $derived(
		renderASTWithCursor(entry.contentAST, -1, entryTitleMap, wiki.slug)
	);
</script>

<div class="public-wiki-container">
	<article class="wiki-article">
		<header class="article-header">
			<h1 class="article-title">{entry.title}</h1>
		</header>

		<MarkdownContent html={renderedHTML} variant="article" />
	</article>
</div>

<style>
	.public-wiki-container {
		min-height: 100vh;
		background: var(--color-bg, #ffffff);
		padding: var(--spacing-2xl, 2rem) var(--spacing-md, 1rem);
	}

	.wiki-article {
		max-width: 42rem;
		margin: 0 auto;
		padding: var(--spacing-2xl, 2rem);
	}

	.article-header {
		margin-bottom: var(--spacing-2xl, 2rem);
		padding-bottom: var(--spacing-lg, 1.5rem);
		border-bottom: 1px solid var(--color-border, #e5e7eb);
	}

	.article-title {
		font-size: 2.5rem;
		font-weight: 700;
		color: var(--color-text, #111827);
		line-height: 1.2;
		margin: 0;
	}

	@media (max-width: 768px) {
		.wiki-article {
			padding: var(--spacing-lg, 1.5rem) var(--spacing-md, 1rem);
		}

		.article-title {
			font-size: 2rem;
		}
	}
</style>
