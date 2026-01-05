<script lang="ts">
	import { onMount } from 'svelte';
	import type { LinkPopoverData } from '$lib/services/markdownEditor';
	import { MarkdownEditor } from '$lib/services/markdownEditor';
	import type { ASTNode } from '$lib/services/ast';
	import { astToText } from '$lib/services/ast';
	import { loadEntryTitles, createEntry, updateEntry, getEntryById } from '$lib/services/entries';
	import type { Entry } from '$lib/types/Entry';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import LinkSelectorPopover from '../popovers/LinkSelectorPopover.svelte';

	interface Props {
		ast?: ASTNode;
		onchange?: (ast: ASTNode) => void;
		disabled?: boolean;
		placeholder?: string;
		onnavigateup?: () => void;
		onctrlenter?: () => void;
		onescape?: () => void;
		currentEntryId?: string;
	}

	// eslint-disable-next-line prefer-const
	let { ast = $bindable({ type: 'document', start: 0, end: 0, children: [] }), ...props }: Props =
		$props();
	const { onchange, disabled, placeholder, onnavigateup, onctrlenter, onescape, currentEntryId } =
		props;
	const disabledValue = $derived(disabled ?? false);
	const placeholderValue = $derived(placeholder ?? '');

	// Editor DOM reference
	let editorRef: HTMLDivElement | undefined = $state();

	// Wiki link popover state
	let showLinkPopover = $state(false);
	let linkPopoverPosition = $state({ x: 0, y: 0 });
	let linkPopoverData = $state<LinkPopoverData | undefined>();
	let linkSelectorRef: { handleExternalKeydown: (e: KeyboardEvent) => void } | undefined = $state();

	// Track when we're updating AST internally to avoid circular updates
	let isInternalUpdate = false;

	// Rendered HTML state - updated explicitly rather than derived
	let renderedHTML = $state('');

	// Create the markdown editor instance
	const editor = new MarkdownEditor({
		ast,
		onchange: (newAST) => {
			if (!isInternalUpdate) {
				isInternalUpdate = true;
				ast = newAST;
				onchange?.(newAST);
				// Update render after AST change
				renderedHTML = editor.render();
				isInternalUpdate = false;
			}
		},
		onnavigateup,
		onctrlenter,
		onescape,
		onlinkpopovershow: (data) => {
			linkPopoverData = data;
			// Calculate popover position
			if (editorRef) {
				const rect = editorRef.getBoundingClientRect();
				linkPopoverPosition = {
					x: rect.left,
					y: rect.bottom + 5
				};
			}
			showLinkPopover = true;
		},
		onlinkpopoverhide: () => {
			showLinkPopover = false;
		},
		currentEntryId
	});

	// Sync AST changes from parent to editor
	$effect(() => {
		// Only update if the AST reference actually changed from outside
		if (!isInternalUpdate) {
			isInternalUpdate = true;
			editor.setAST(ast);

			// Load entry titles when AST changes
			const text = astToText(ast);
			const entryIds =
				text
					.match(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)
					?.map((link) => {
						const match = link.match(/\[\[([^\]|]+)/);
						return match ? match[1].trim() : '';
					})
					.filter((id) => id !== '') ?? [];

			if (entryIds.length > 0) {
				void loadEntryTitles(entryIds)
					.then((titleMap) => {
						editor.setEntryTitles(titleMap);
						// Re-render after titles load
						renderedHTML = editor.render();
					})
					.catch((err) => {
						console.error('Failed to load entry titles:', err);
					});
			} else {
				editor.setEntryTitles(new Map());
			}

			// Update render
			renderedHTML = editor.render();
			isInternalUpdate = false;
		}
	});

	// Handle keyboard input
	function handleKeyDown(e: KeyboardEvent): void {
		// If link popover is open, let it handle certain keys
		if (showLinkPopover && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter')) {
			e.preventDefault();
			if (linkSelectorRef?.handleExternalKeydown) {
				linkSelectorRef.handleExternalKeydown(e);
			}
			return;
		}

		isInternalUpdate = true;
		editor.handleKeyDown(e);
		ast = editor.getAST();
		renderedHTML = editor.render();
		isInternalUpdate = false;
	}

	// Handle link selection from popover
	function handleLinkSelect(entry: Entry): void {
		isInternalUpdate = true;
		editor.insertWikiLink(entry.id);
		ast = editor.getAST();
		renderedHTML = editor.render();
		showLinkPopover = false;
		isInternalUpdate = false;
	}

	// Close link popover
	function handleLinkPopoverClose(): void {
		editor.closeLinkPopover();
		showLinkPopover = false;
	}

	// Handle creating a new entry from the link picker
	async function handleCreateNewEntry(title: string): Promise<void> {
		try {
			// Always create the new entry immediately with the title and empty AST
			const emptyAST: ASTNode = { type: 'document', start: 0, end: 0, children: [] };
			const newEntry = await createEntry({ title, contentAST: emptyAST });

			// Insert the link using the editor
			isInternalUpdate = true;
			editor.insertWikiLink(newEntry.id);
			ast = editor.getAST();
			renderedHTML = editor.render();

			// If editing an existing entry, save the updated content with the link
			if (currentEntryId) {
				// Get the current entry to preserve the title
				const currentEntry = await getEntryById(currentEntryId);
				if (currentEntry) {
					// Save with the new content that includes the link
					await updateEntry(currentEntryId, {
						title: currentEntry.title,
						contentAST: ast
					});
				}
			}

			showLinkPopover = false;
			isInternalUpdate = false;

			// Navigate to edit the newly created entry
			const editUrl = resolve(`/entries/${newEntry.id}`);
			await goto(editUrl);
		} catch (err) {
			console.error('Failed to create linked entry:', err);
		}
	}

	// Handle IME composition
	function handleCompositionStart(): void {
		editor.handleCompositionStart();
	}

	function handleCompositionEnd(e: CompositionEvent): void {
		isInternalUpdate = true;
		editor.handleCompositionEnd(e);
		ast = editor.getAST();
		renderedHTML = editor.render();
		isInternalUpdate = false;
	}

	// Focus management
	export function focus(): void {
		editorRef?.focus();
	}

	function handleFocus(): void {
		editor.setFocused(true);
		renderedHTML = editor.render();
	}

	function handleBlur(): void {
		editor.setFocused(false);
		renderedHTML = editor.render();
	}

	onMount(() => {
		if (editorRef) {
			editorRef.focus();
		}
	});
</script>

<div
	bind:this={editorRef}
	class="ast-editor"
	class:disabled={disabledValue}
	data-testid="markdown-editor"
	tabindex="0"
	role="textbox"
	aria-multiline="true"
	onkeydown={handleKeyDown}
	oncompositionstart={handleCompositionStart}
	oncompositionend={handleCompositionEnd}
	onfocus={handleFocus}
	onblur={handleBlur}
>
	{#if astToText(ast).trim() === ''}
		<div class="placeholder">{placeholderValue}</div>
	{/if}
	<div class="content">
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html renderedHTML}
	</div>
</div>

{#if showLinkPopover && linkPopoverData}
	<LinkSelectorPopover
		bind:this={linkSelectorRef}
		searchTerm={linkPopoverData.searchTerm}
		position={linkPopoverPosition}
		onSelect={handleLinkSelect}
		onClose={handleLinkPopoverClose}
		onCreateNew={handleCreateNewEntry}
		{currentEntryId}
	/>
{/if}

<style>
	.ast-editor {
		position: relative;
		min-height: 200px;
		max-height: 500px;
		overflow-y: auto;
		padding: var(--spacing-md);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-bg);
		cursor: text;
		outline: none;
	}

	.ast-editor:focus {
		border-color: var(--color-primary);
		box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.1);
	}

	.ast-editor.disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.placeholder {
		position: absolute;
		top: var(--spacing-md);
		left: var(--spacing-md);
		color: var(--color-text-secondary);
		font-style: italic;
		pointer-events: none;
	}

	.content {
		position: relative;
	}

	.content :global(.cursor) {
		display: inline-block;
		width: 2px;
		height: 1.2em;
		background: var(--color-primary);
		animation: blink 1s step-end infinite;
		vertical-align: text-bottom;
		margin: 0 -1px;
	}

	@keyframes blink {
		0%,
		50% {
			opacity: 1;
		}
		50.01%,
		100% {
			opacity: 0;
		}
	}

	/* Markdown styling */
	.content :global(h1) {
		font-size: var(--font-size-2xl);
		font-weight: var(--font-weight-bold);
		margin: 0 0 var(--spacing-md) 0;
		color: var(--color-text);
	}

	.content :global(h2) {
		font-size: var(--font-size-xl);
		font-weight: var(--font-weight-bold);
		margin: 0 0 var(--spacing-md) 0;
		color: var(--color-text);
	}

	.content :global(h3) {
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-semibold);
		margin: 0 0 var(--spacing-sm) 0;
		color: var(--color-text);
	}

	.content :global(h4),
	.content :global(h5),
	.content :global(h6) {
		font-size: var(--font-size-md);
		font-weight: var(--font-weight-semibold);
		margin: 0 0 var(--spacing-sm) 0;
		color: var(--color-text);
	}

	.content :global(p) {
		margin: 0 0 var(--spacing-md) 0;
		line-height: 1.6;
	}

	.content :global(ul),
	.content :global(ol) {
		margin: 0 0 var(--spacing-md) 0;
		padding-left: var(--spacing-xl);
	}

	.content :global(li) {
		margin-bottom: var(--spacing-xs);
	}

	/* Hide bullet point for list items that only contain nested lists */
	.content :global(li:has(> ul)),
	.content :global(li:has(> ol)) {
		list-style-type: none;
	}

	.content :global(blockquote) {
		margin: 0 0 var(--spacing-md) 0;
		padding-left: var(--spacing-md);
		border-left: 3px solid var(--color-primary);
		color: var(--color-text-secondary);
		font-style: italic;
	}

	.content :global(code) {
		padding: 2px 6px;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		font-family: 'Courier New', monospace;
		font-size: 0.9em;
	}

	.content :global(pre) {
		margin: 0 0 var(--spacing-md) 0;
		padding: var(--spacing-md);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		overflow-x: auto;
	}

	.content :global(pre code) {
		padding: 0;
		background: transparent;
		border: none;
	}

	.content :global(a) {
		color: var(--color-primary);
		text-decoration: none;
	}

	.content :global(a:hover) {
		text-decoration: underline;
	}

	.content :global(a.wiki-link) {
		background: rgba(139, 92, 246, 0.1);
		padding: 2px 6px;
		border-radius: var(--radius-sm);
	}

	.content :global(.wiki-link-invalid) {
		color: var(--color-danger, #ef4444);
		background: rgba(239, 68, 68, 0.1);
		padding: 2px 6px;
		border-radius: var(--radius-sm);
	}

	.content :global(hr) {
		border: none;
		border-top: 1px solid var(--color-border);
		margin: var(--spacing-md) 0;
	}
</style>
