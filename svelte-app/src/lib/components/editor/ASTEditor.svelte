<script lang="ts">
	import { onMount } from 'svelte';
	import { MarkdownTokenizer } from '$lib/services/markdown';
	import {
		tokensToAST,
		astToText,
		renderASTWithCursor,
		type ASTNode,
		type EntryTitleMap
	} from '$lib/services/ast';
	import {
		insertTextAtCursor,
		deleteAtCursor,
		handleEnterKey,
		moveCursorUp,
		moveCursorDown,
		handleTabKey
	} from '$lib/services/cursor';
	import {
		extractEntryIdsFromContent,
		loadEntryTitles,
		createEntry,
		updateEntry,
		getEntryById
	} from '$lib/services/entries';
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

	// Editor state
	let cursorPos = $state(0);
	let entryTitles = $state<EntryTitleMap>(new Map());

	// Editor DOM reference
	let editorRef: HTMLDivElement | undefined = $state();
	let isComposing = $state(false);
	let isFocused = $state(false);

	// Wiki link popover state
	let showLinkPopover = $state(false);
	let linkPopoverPosition = $state({ x: 0, y: 0 });
	let linkSearchTerm = $state('');
	let linkStartPos = $state(0);
	let linkSelectorRef: { handleExternalKeydown: (e: KeyboardEvent) => void } | undefined = $state();

	// Track when we're updating AST internally to avoid circular updates
	let isInternalUpdate = $state(false);

	// Notify parent of AST changes
	$effect(() => {
		if (!isInternalUpdate && onchange) {
			onchange(ast);
		}
	});

	// Load entry titles when content changes
	$effect(() => {
		const text = astToText(ast);
		const entryIds = extractEntryIdsFromContent(text);
		if (entryIds.length > 0) {
			void loadEntryTitles(entryIds)
				.then((titleMap) => {
					entryTitles = titleMap;
				})
				.catch((err) => {
					console.error('Failed to load entry titles:', err);
				});
		} else {
			entryTitles = new Map();
		}
	});

	// Rendered HTML with cursor
	const renderedHTML = $derived(() => {
		// Only show cursor if focused
		if (isFocused) {
			return renderASTWithCursor(ast, cursorPos, entryTitles);
		} else {
			// Render without cursor when not focused
			return renderASTWithCursor(ast, -1, entryTitles); // -1 means don't show cursor
		}
	});

	// Handle keyboard input
	function handleKeyDown(e: KeyboardEvent): void {
		// Ignore events during IME composition
		if (isComposing) return;

		// If link popover is open, let it handle certain keys
		if (showLinkPopover && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter')) {
			e.preventDefault();
			if (linkSelectorRef?.handleExternalKeydown) {
				linkSelectorRef.handleExternalKeydown(e);
			}
			return;
		}

		// Handle special keys
		if (e.key === 'Escape') {
			e.preventDefault();
			if (showLinkPopover) {
				showLinkPopover = false;
			} else {
				onescape?.();
			}
			return;
		}

		if (e.key === 'Enter' && e.ctrlKey) {
			e.preventDefault();
			onctrlenter?.();
			return;
		}

		if (e.key === 'ArrowUp' && cursorPos === 0) {
			e.preventDefault();
			onnavigateup?.();
			return;
		}

		// Handle arrow keys for cursor navigation
		if (e.key === 'ArrowLeft') {
			e.preventDefault();
			cursorPos = Math.max(0, cursorPos - 1);
			return;
		}

		if (e.key === 'ArrowRight') {
			e.preventDefault();
			const maxPos = astToText(ast).length;
			cursorPos = Math.min(maxPos, cursorPos + 1);
			return;
		}

		if (e.key === 'ArrowUp') {
			e.preventDefault();
			cursorPos = moveCursorUp(ast, cursorPos);
			return;
		}

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			cursorPos = moveCursorDown(ast, cursorPos);
			return;
		}

		// Handle text input
		if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
			e.preventDefault();
			isInternalUpdate = true;
			const { ast: newAST, newPos } = insertTextAtCursor(ast, cursorPos, e.key);
			ast = newAST;
			cursorPos = newPos;
			isInternalUpdate = false;

			// Check for [[ trigger after insertion
			checkForLinkTrigger();
			return;
		}

		// Handle Backspace
		if (e.key === 'Backspace') {
			e.preventDefault();
			isInternalUpdate = true;
			const { ast: newAST, newPos } = deleteAtCursor(ast, cursorPos, false);
			ast = newAST;
			cursorPos = newPos;
			isInternalUpdate = false;

			// Check for [[ trigger after deletion
			checkForLinkTrigger();
			return;
		}

		// Handle Delete
		if (e.key === 'Delete') {
			e.preventDefault();
			isInternalUpdate = true;
			const { ast: newAST, newPos } = deleteAtCursor(ast, cursorPos, true);
			ast = newAST;
			cursorPos = newPos;
			isInternalUpdate = false;

			// Check for [[ trigger after deletion
			checkForLinkTrigger();
			return;
		}

		// Handle Enter
		if (e.key === 'Enter') {
			e.preventDefault();
			isInternalUpdate = true;
			const { ast: newAST, newPos } = handleEnterKey(ast, cursorPos);
			ast = newAST;
			cursorPos = newPos;
			isInternalUpdate = false;
			return;
		}

		// Handle Tab (indent/de-indent in lists)
		if (e.key === 'Tab') {
			e.preventDefault();
			isInternalUpdate = true;
			const { ast: newAST, newPos } = handleTabKey(ast, cursorPos, e.shiftKey);
			ast = newAST;
			cursorPos = newPos;
			isInternalUpdate = false;
			return;
		}
	}

	// Check for [[ trigger to show link selector
	function checkForLinkTrigger(): void {
		const text = astToText(ast);
		const textBeforeCursor = text.substring(0, cursorPos);
		const lastDoubleBracket = textBeforeCursor.lastIndexOf('[[');

		// Check if we have [[ without closing ]]
		if (lastDoubleBracket !== -1) {
			const textAfterBracket = textBeforeCursor.substring(lastDoubleBracket);
			const hasClosing = textAfterBracket.includes(']]');

			if (!hasClosing) {
				// Extract search term (text after [[)
				linkSearchTerm = textAfterBracket.substring(2);
				linkStartPos = lastDoubleBracket;

				// Calculate popover position (approximate - at editor position)
				if (editorRef) {
					const rect = editorRef.getBoundingClientRect();
					linkPopoverPosition = {
						x: rect.left,
						y: rect.bottom + 5
					};
				}

				showLinkPopover = true;
				return;
			}
		}

		// Hide popover if no valid [[ trigger found
		showLinkPopover = false;
	}

	// Handle link selection from popover
	function handleLinkSelect(entry: Entry): void {
		const currentText = astToText(ast);

		// Replace [[ and search term with wiki link
		const beforeLink = currentText.substring(0, linkStartPos);
		let afterCursor = currentText.substring(cursorPos);

		// Check if ]] already exists right after cursor and skip it if present
		if (afterCursor.startsWith(']]')) {
			afterCursor = afterCursor.substring(2);
		}

		const wikiLink = `[[${entry.id}]]`;
		const newText = beforeLink + wikiLink + afterCursor;

		// Re-parse to get new AST
		const tokenizer = new MarkdownTokenizer(newText);
		const tokens = tokenizer.tokenize();
		isInternalUpdate = true;
		ast = tokensToAST(tokens);

		// Position cursor after the inserted link
		cursorPos = linkStartPos + wikiLink.length;

		showLinkPopover = false;
		isInternalUpdate = false;
	}

	// Close link popover
	function handleLinkPopoverClose(): void {
		showLinkPopover = false;
	}

	// Handle creating a new entry from the link picker
	async function handleCreateNewEntry(title: string): Promise<void> {
		try {
			// Always create the new entry immediately with the title and empty AST
			const emptyAST: ASTNode = { type: 'document', start: 0, end: 0, children: [] };
			const newEntry = await createEntry({ title, contentAST: emptyAST });

			// Insert the link in the current content
			const currentText = astToText(ast);
			const beforeLink = currentText.substring(0, linkStartPos);
			let afterCursor = currentText.substring(cursorPos);

			// Check if ]] already exists right after cursor and skip it if present
			if (afterCursor.startsWith(']]')) {
				afterCursor = afterCursor.substring(2);
			}

			const wikiLink = `[[${newEntry.id}]]`;
			const newText = beforeLink + wikiLink + afterCursor;

			// Re-parse to get new AST
			const tokenizer = new MarkdownTokenizer(newText);
			const tokens = tokenizer.tokenize();
			isInternalUpdate = true;
			ast = tokensToAST(tokens);

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
		isComposing = true;
	}

	function handleCompositionEnd(e: CompositionEvent): void {
		isComposing = false;
		if (e.data) {
			isInternalUpdate = true;
			const { ast: newAST, newPos } = insertTextAtCursor(ast, cursorPos, e.data);
			ast = newAST;
			cursorPos = newPos;
			isInternalUpdate = false;
		}
	}

	// Focus management
	export function focus(): void {
		editorRef?.focus();
	}

	function handleFocus(): void {
		isFocused = true;
	}

	function handleBlur(): void {
		isFocused = false;
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
		{@html renderedHTML()}
	</div>
</div>

{#if showLinkPopover}
	<LinkSelectorPopover
		bind:this={linkSelectorRef}
		searchTerm={linkSearchTerm}
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
