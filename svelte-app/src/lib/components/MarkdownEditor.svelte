<script lang="ts">
	import { SvelteMap } from 'svelte/reactivity';
	import { parseMarkdown } from '$lib/services/markdown';
	import { extractEntryIdsFromContent, loadEntryTitles } from '$lib/services/entries';
	import { TAB_INDENT_SPACES } from '$lib/constants';
	import LinkSelectorPopover from './LinkSelectorPopover.svelte';
	import type { Entry } from '$lib/types/Entry';

	interface Props {
		value?: string;
		oninput?: (e: Event) => void;
		disabled?: boolean;
		placeholder?: string;
		onnavigateup?: () => void;
		onctrlenter?: () => void;
		currentEntryId?: string; // ID of the current entry (to exclude from link options)
	}

	// eslint-disable-next-line prefer-const
	let { value = $bindable(''), ...props }: Props = $props();
	const { oninput, disabled, placeholder, onnavigateup, onctrlenter, currentEntryId } = props;
	const disabledValue = $derived(disabled ?? false);
	const placeholderValue = $derived(placeholder ?? '');

	let editingBlockIndex: number | null = $state(null);
	let cursorPosition: number = $state(0);
	const textareaElements = new SvelteMap<number, HTMLTextAreaElement>();

	// Internal block array - this is the source of truth for editing
	let blocks = $state<string[]>(['']);

	// Track if we're currently in an editing session to prevent automatic block splitting
	let isInternalEdit = $state(false);

	// Wiki link popover state
	let showLinkPopover = $state(false);
	let linkPopoverPosition = $state({ x: 0, y: 0 });
	let linkSearchTerm = $state('');
	let linkStartPos = $state(0);
	let linkSelectorRef: { handleExternalKeydown: (e: KeyboardEvent) => void } | undefined = $state();

	// Store for loaded entry titles
	let entryTitles = $state<Map<string, string>>(new Map());

	// Sync blocks from value prop when it changes externally (not during editing)
	$effect(() => {
		if (!isInternalEdit) {
			const newBlocks = value ? value.split(/\n\n/) : [''];
			blocks = newBlocks.length === 0 ? [''] : newBlocks;
		}
	});

	// Sync value prop from blocks when blocks change
	function syncValueFromBlocks(): void {
		const newValue = blocks.join('\n\n');
		if (newValue !== value) {
			value = newValue;
		}
	}

	// Load entry titles when content changes
	$effect(() => {
		// Extract entry IDs from the current content
		const entryIds = extractEntryIdsFromContent(value);

		if (entryIds.length > 0) {
			// Load titles asynchronously with error handling
			void loadEntryTitles(entryIds)
				.then((titleMap) => {
					entryTitles = titleMap;
				})
				.catch((err) => {
					console.error('Failed to load entry titles:', err);
					// Keep existing titles on error
				});
		} else {
			entryTitles = new Map();
		}
	});

	// Create rendered blocks as a derived value that depends on content and loaded titles
	const renderedBlocks = $derived(
		blocks.map((block) => {
			// This will automatically track entryTitles dependency
			return getRenderedBlockInternal(block);
		})
	);

	// Get rendered HTML for a block (internal helper)
	function getRenderedBlockInternal(blockContent: string): string {
		if (!blockContent.trim()) {
			return '<p class="empty-block">&nbsp;</p>';
		}
		try {
			const result = parseMarkdown(blockContent, -1, entryTitles); // -1 means no cursor, pass title map
			return result.html || '<p>&nbsp;</p>';
		} catch (err) {
			console.error('Failed to parse markdown:', err);
			return `<p>${blockContent}</p>`;
		}
	}

	// Check if text contains list items
	function isListBlock(text: string): boolean {
		const lines = text.split('\n');
		return lines.some((line) => /^(?:[-*+]|\d+\.)\s/.test(line.trim()));
	}

	// Get the list prefix from current line (e.g., "- " or "1. "), preserving indentation
	function getListPrefix(line: string): string {
		const match = line.match(/^(\s*)(?:[-*+]|\d+\.)\s/);
		if (match) {
			const indent = match[1];
			const bullet = line.match(/^(\s*)([-*+]|\d+\.)\s/)?.[2] ?? '-';
			return `${indent}${bullet} `;
		}
		return '- ';
	}

	// Handle input in textarea
	function handleBlockInput(blockIndex: number, event: Event): void {
		const target = event.target as HTMLTextAreaElement;
		const newText = target.value;

		blocks[blockIndex] = newText;
		syncValueFromBlocks();

		// Save cursor position
		cursorPosition = target.selectionStart || 0;

		// Check for [[ trigger to show link selector
		checkForLinkTrigger(target);

		// Auto-resize textarea
		autoResizeTextarea(target);

		// Trigger parent's oninput
		oninput?.(event);
	}

	// Handle clicking on a rendered block to edit it
	function handleBlockClick(blockIndex: number, event?: MouseEvent): void {
		if (disabledValue) return;

		// If clicking on a link, don't enter edit mode
		if (event?.target && (event.target as HTMLElement).tagName === 'A') {
			return;
		}

		isInternalEdit = true;
		editingBlockIndex = blockIndex;
		cursorPosition = 0;
	}

	// Check if [[ was just typed to trigger link selector
	function checkForLinkTrigger(textarea: HTMLTextAreaElement): void {
		const text = textarea.value;
		const cursorPos = textarea.selectionStart || 0;

		// Look backwards from cursor to find [[
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

				// Calculate popover position
				const rect = textarea.getBoundingClientRect();
				linkPopoverPosition = {
					x: rect.left,
					y: rect.bottom + 5
				};

				showLinkPopover = true;
				return;
			}
		}

		// Hide popover if no valid [[ trigger found
		showLinkPopover = false;
	}

	// Handle link selection from popover
	function handleLinkSelect(entry: Entry): void {
		if (editingBlockIndex === null) return;

		const currentBlock = blocks[editingBlockIndex];
		const textarea = textareaElements.get(editingBlockIndex);

		if (!textarea) return;

		// Replace [[ and search term with wiki link (store only ID, no display name)
		const beforeLink = currentBlock.substring(0, linkStartPos);
		const cursorPos = textarea.selectionStart || 0;
		let afterCursor = currentBlock.substring(cursorPos);

		// Check if ]] already exists right after cursor and skip it if present
		if (afterCursor.startsWith(']]')) {
			afterCursor = afterCursor.substring(2);
		}

		const wikiLink = `[[${entry.id}]]`;

		const newBlock = beforeLink + wikiLink + afterCursor;
		blocks[editingBlockIndex] = newBlock;
		syncValueFromBlocks();

		// Move cursor after the inserted link
		cursorPosition = linkStartPos + wikiLink.length;

		// Update textarea
		setTimeout(() => {
			if (textarea && editingBlockIndex !== null) {
				textarea.value = blocks[editingBlockIndex];
				textarea.focus();
				textarea.selectionStart = textarea.selectionEnd = cursorPosition;
				autoResizeTextarea(textarea);
			}
		}, 0);

		showLinkPopover = false;
		oninput?.(new Event('input'));
	}

	// Close link popover
	function handleLinkPopoverClose(): void {
		showLinkPopover = false;
	}

	// Expose focus method to parent to focus the first block
	export function focus(): void {
		handleBlockClick(0);
	}

	// Handle blur on textarea
	function handleBlockBlur(): void {
		// Clean up empty blocks when leaving
		const cleanedBlocks = blocks.filter((block: string) => block.trim() !== '');

		// Ensure at least one block exists
		if (cleanedBlocks.length === 0) {
			cleanedBlocks.push('');
		}

		if (cleanedBlocks.length !== blocks.length) {
			blocks = cleanedBlocks;
			syncValueFromBlocks();
		}

		// Close link popover if open
		showLinkPopover = false;

		editingBlockIndex = null;
		isInternalEdit = false;
	}

	// Handle keyboard navigation in textarea
	function handleKeyDown(blockIndex: number, event: KeyboardEvent): void {
		const target = event.target as HTMLTextAreaElement;
		const cursorPos = target.selectionStart || 0;
		const cursorEnd = target.selectionEnd || 0;
		const text = target.value;
		const hasSelection = cursorPos !== cursorEnd;

		// If link popover is open, let it handle arrow keys and Enter
		if (
			showLinkPopover &&
			(event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter')
		) {
			event.preventDefault();
			if (linkSelectorRef?.handleExternalKeydown) {
				linkSelectorRef.handleExternalKeydown(event);
			}
			return;
		}

		// Handle Escape to close link popover
		if (event.key === 'Escape' && showLinkPopover) {
			event.preventDefault();
			showLinkPopover = false;
			return;
		}

		// Handle Ctrl+Enter for save
		if (event.key === 'Enter' && event.ctrlKey) {
			event.preventDefault();
			onctrlenter?.();
			return;
		}

		// Handle Delete/Backspace when all text is selected
		const isEntireBlockSelected = hasSelection && cursorPos === 0 && cursorEnd === text.length;

		// Delete block when all content is selected (Ctrl+A then Delete/Backspace)
		if (
			(event.key === 'Backspace' || event.key === 'Delete') &&
			isEntireBlockSelected &&
			blocks.length > 1
		) {
			event.preventDefault();

			// Remove this block and move to previous block
			if (blockIndex > 0) {
				const prevBlockLength = blocks[blockIndex - 1].length;
				blocks.splice(blockIndex, 1);
				syncValueFromBlocks();
				editingBlockIndex = blockIndex - 1;
				cursorPosition = prevBlockLength;
			} else {
				// If first block, move to next block instead
				blocks.splice(blockIndex, 1);
				syncValueFromBlocks();
				editingBlockIndex = 0;
				cursorPosition = 0;
			}
			oninput?.(event);
			return;
		}

		// Handle Tab key for indentation
		if (event.key === 'Tab') {
			event.preventDefault();

			// Get current line
			const lines = text.split('\n');
			const lineBeforeCursor = text.substring(0, cursorPos).split('\n');
			const currentLineIndex = lineBeforeCursor.length - 1;
			const currentLine = lines[currentLineIndex] || '';

			// Calculate position of start of current line in full text
			let lineStartPos = 0;
			for (let i = 0; i < currentLineIndex; i++) {
				lineStartPos += lines[i].length + 1; // +1 for newline
			}

			if (event.shiftKey) {
				// Shift+Tab: Reduce indentation (remove up to TAB_INDENT_SPACES from start of line)
				const match = currentLine.match(new RegExp(`^(\\s{1,${TAB_INDENT_SPACES}})(.*)`));
				if (match) {
					const removedSpaces = match[1].length;
					const newLine = match[2];
					lines[currentLineIndex] = newLine;
					const newValue = lines.join('\n');
					blocks[blockIndex] = newValue;
					syncValueFromBlocks();

					// Adjust cursor position
					const newCursorPos = Math.max(lineStartPos, cursorPos - removedSpaces);
					setTimeout(() => {
						target.selectionStart = target.selectionEnd = newCursorPos;
					}, 0);
				}
			} else {
				// Tab: Add TAB_INDENT_SPACES to start of line
				const indent = ' '.repeat(TAB_INDENT_SPACES);
				const newLine = `${indent}${currentLine}`;
				lines[currentLineIndex] = newLine;
				const newValue = lines.join('\n');
				blocks[blockIndex] = newValue;
				syncValueFromBlocks();

				// Adjust cursor position
				setTimeout(() => {
					target.selectionStart = target.selectionEnd = cursorPos + TAB_INDENT_SPACES;
				}, 0);
			}
			return;
		}

		// Handle Enter key - different behavior for list blocks
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();

			// Check if current block is a list
			if (isListBlock(text)) {
				// Get the current line to detect the list prefix
				const lines = text.split('\n');
				const lineBeforeCursor = text.substring(0, cursorPos).split('\n');
				const currentLineIndex = lineBeforeCursor.length - 1;
				const currentLine = lines[currentLineIndex] || '';

				// Check if current line is an empty list item (e.g., "- " with nothing after)
				const isEmptyListItem = /^(?:[-*+]|\d+\.)\s*$/.test(currentLine.trim());

				if (isEmptyListItem) {
					// Empty list item - exit the list by creating a new paragraph block
					const beforeList = lines.slice(0, currentLineIndex).join('\n');
					const afterCursor = text.substring(cursorPos);

					blocks[blockIndex] = beforeList;
					blocks.splice(blockIndex + 1, 0, afterCursor);
					syncValueFromBlocks();
					editingBlockIndex = blockIndex + 1;
					cursorPosition = 0;
					oninput?.(event);
				} else {
					// Inside a list block - add newline with list prefix
					const prefix = getListPrefix(currentLine);
					const beforeCursor = text.substring(0, cursorPos);
					const afterCursor = text.substring(cursorPos);
					const newText = `${beforeCursor}\n${prefix}${afterCursor}`;

					blocks[blockIndex] = newText;
					syncValueFromBlocks();
					cursorPosition = cursorPos + 1 + prefix.length;

					// Manually update the textarea since we need to trigger the effect
					setTimeout(() => {
						const textarea = textareaElements.get(blockIndex);
						if (textarea) {
							textarea.value = newText;
							textarea.selectionStart = textarea.selectionEnd = cursorPosition;
							autoResizeTextarea(textarea);
						}
					}, 0);

					oninput?.(event);
				}
				return;
			} else {
				// Not a list - split into new block (paragraph)
				const beforeCursor = text.substring(0, cursorPos);
				const afterCursor = text.substring(cursorPos);

				blocks[blockIndex] = beforeCursor;
				blocks.splice(blockIndex + 1, 0, afterCursor);
				syncValueFromBlocks();
				editingBlockIndex = blockIndex + 1;
				cursorPosition = 0;
				oninput?.(event);
				return;
			}
		}

		// Handle Backspace at very start of block - merge with previous
		if (event.key === 'Backspace' && cursorPos === 0 && !hasSelection && blockIndex > 0) {
			event.preventDefault();
			const prevBlock = blocks[blockIndex - 1];
			const currentBlock = blocks[blockIndex];
			const mergedPosition = prevBlock.length;

			blocks[blockIndex - 1] = `${prevBlock}\n\n${currentBlock}`;
			blocks.splice(blockIndex, 1);
			syncValueFromBlocks();

			// Switch to the merged block immediately
			editingBlockIndex = blockIndex - 1;
			cursorPosition = mergedPosition;

			oninput?.(event);
			return;
		}

		// Handle ArrowUp at start of block - move to previous block or navigate up
		if (event.key === 'ArrowUp' && cursorPos === 0) {
			if (blockIndex > 0) {
				event.preventDefault();
				editingBlockIndex = blockIndex - 1;
				cursorPosition = blocks[blockIndex - 1].length;
				return;
			} else if (blockIndex === 0) {
				// At the first block, notify parent to handle navigation
				event.preventDefault();
				onnavigateup?.();
				return;
			}
		}

		// Handle ArrowDown at end of block - move to next block
		if (event.key === 'ArrowDown' && cursorPos === text.length && blockIndex < blocks.length - 1) {
			event.preventDefault();
			editingBlockIndex = blockIndex + 1;
			cursorPosition = 0;
			return;
		}
	}

	// Auto-resize textarea to fit content
	function autoResizeTextarea(textarea: HTMLTextAreaElement): void {
		textarea.style.height = 'auto';
		textarea.style.height = `${textarea.scrollHeight}px`;
	}

	// Store textarea reference action
	function storeTextareaRef(node: HTMLTextAreaElement, index: number): { destroy: () => void } {
		textareaElements.set(index, node);
		return {
			destroy() {
				textareaElements.delete(index);
			}
		};
	}

	// Focus and set cursor position when editing a block
	$effect(() => {
		if (editingBlockIndex !== null) {
			const textarea = textareaElements.get(editingBlockIndex);
			if (textarea) {
				setTimeout(() => {
					textarea.focus();
					textarea.selectionStart = textarea.selectionEnd = cursorPosition;
					autoResizeTextarea(textarea);
				}, 0);
			}
		}
	});
</script>

<div class="markdown-editor">
	<div class="editor-wrapper">
		{#if !value.trim() && editingBlockIndex === null}
			<div
				class="empty-placeholder"
				onclick={() => handleBlockClick(0)}
				onfocus={() => handleBlockClick(0)}
				onkeydown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						handleBlockClick(0);
					}
				}}
				role="button"
				tabindex="0"
			>
				{placeholderValue}
			</div>
		{/if}

		{#if value.trim() || editingBlockIndex !== null}
			{#each blocks as block, i (i)}
				<div class="block-container">
					{#if editingBlockIndex === i}
						<!-- Editing mode: show textarea -->
						<textarea
							use:storeTextareaRef={i}
							class="block-textarea"
							value={block}
							oninput={(e) => handleBlockInput(i, e)}
							onblur={handleBlockBlur}
							onkeydown={(e) => handleKeyDown(i, e)}
							disabled={disabledValue}
						></textarea>
					{:else}
						<!-- View mode: show rendered HTML -->
						<div
							class="block-rendered"
							onclick={(e) => handleBlockClick(i, e)}
							onfocus={() => handleBlockClick(i)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									handleBlockClick(i);
								}
							}}
							role="button"
							tabindex="0"
						>
							<!-- eslint-disable-next-line svelte/no-at-html-tags -->
							{@html renderedBlocks[i] || ''}
						</div>
					{/if}
				</div>
			{/each}
		{/if}
	</div>
</div>

{#if showLinkPopover}
	<LinkSelectorPopover
		bind:this={linkSelectorRef}
		searchTerm={linkSearchTerm}
		position={linkPopoverPosition}
		onSelect={handleLinkSelect}
		onClose={handleLinkPopoverClose}
		{currentEntryId}
	/>
{/if}

<style>
	.markdown-editor {
		display: flex;
		flex-direction: column;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-bg);
		overflow: hidden;
	}

	.editor-wrapper {
		position: relative;
		flex: 1;
		min-height: 200px;
		max-height: 500px;
		overflow-y: auto;
		padding: var(--spacing-md);
	}

	.empty-placeholder {
		color: var(--color-text-secondary);
		font-style: italic;
		cursor: text;
		min-height: 1.6em;
		padding: var(--spacing-sm);
	}

	.block-container {
		margin-bottom: var(--spacing-md);
	}

	.block-container:last-child {
		margin-bottom: 0;
	}

	.block-textarea {
		width: 100%;
		min-height: 1.6em;
		padding: var(--spacing-sm);
		border: 2px solid var(--color-primary);
		border-radius: var(--radius-sm);
		background: var(--color-bg);
		color: var(--color-text);
		font-size: var(--font-size-md);
		font-family: inherit;
		line-height: 1.6;
		resize: none;
		overflow: hidden;
		outline: none;
	}

	.block-textarea:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.block-rendered {
		cursor: text;
		padding: var(--spacing-sm);
		border-radius: var(--radius-sm);
		min-height: 1.6em;
		transition: background-color 0.15s;
	}

	.block-rendered:hover {
		background: var(--color-surface, rgba(0, 0, 0, 0.02));
	}

	.block-rendered:focus {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}

	/* Markdown styling */
	.block-rendered :global(h1) {
		font-size: var(--font-size-2xl);
		font-weight: var(--font-weight-bold);
		margin: 0;
		color: var(--color-text);
	}

	.block-rendered :global(h2) {
		font-size: var(--font-size-xl);
		font-weight: var(--font-weight-bold);
		margin: 0;
		color: var(--color-text);
	}

	.block-rendered :global(h3) {
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-semibold);
		margin: 0;
		color: var(--color-text);
	}

	.block-rendered :global(h4),
	.block-rendered :global(h5),
	.block-rendered :global(h6) {
		font-size: var(--font-size-md);
		font-weight: var(--font-weight-semibold);
		margin: 0;
		color: var(--color-text);
	}

	.block-rendered :global(p) {
		margin: 0;
		line-height: 1.6;
		min-height: 1.6em;
	}

	.block-rendered :global(p.empty-block) {
		min-height: 1.6em;
	}

	.block-rendered :global(ul),
	.block-rendered :global(ol) {
		margin: 0;
		padding-left: var(--spacing-xl);
	}

	.block-rendered :global(li) {
		margin-bottom: var(--spacing-xs);
	}

	.block-rendered :global(li:last-child) {
		margin-bottom: 0;
	}

	.block-rendered :global(blockquote) {
		margin: 0;
		padding-left: var(--spacing-md);
		border-left: 3px solid var(--color-primary);
		color: var(--color-text-secondary);
		font-style: italic;
	}

	.block-rendered :global(code) {
		padding: 2px 6px;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		font-family: 'Courier New', monospace;
		font-size: 0.9em;
	}

	.block-rendered :global(pre) {
		margin: 0;
		padding: var(--spacing-md);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		overflow-x: auto;
	}

	.block-rendered :global(pre code) {
		padding: 0;
		background: transparent;
		border: none;
		font-size: var(--font-size-sm);
	}

	.block-rendered :global(a) {
		color: var(--color-primary);
		text-decoration: none;
	}

	.block-rendered :global(a:hover) {
		text-decoration: underline;
	}

	.block-rendered :global(a.wiki-link) {
		color: var(--color-primary);
		text-decoration: none;
		background: rgba(139, 92, 246, 0.1);
		padding: 2px 6px;
		border-radius: var(--radius-sm);
		transition: all var(--transition-fast);
	}

	.block-rendered :global(a.wiki-link:hover) {
		background: rgba(139, 92, 246, 0.2);
		text-decoration: none;
	}

	.block-rendered :global(.wiki-link-invalid) {
		color: var(--color-danger, #ef4444);
		background: rgba(239, 68, 68, 0.1);
		padding: 2px 6px;
		border-radius: var(--radius-sm);
		font-weight: var(--font-weight-medium);
	}

	.block-rendered :global(img) {
		max-width: 100%;
		height: auto;
		border-radius: var(--radius-md);
	}

	.block-rendered :global(hr) {
		border: none;
		border-top: 1px solid var(--color-border);
		margin: var(--spacing-md) 0;
	}

	.block-rendered :global(table) {
		width: 100%;
		border-collapse: collapse;
	}

	.block-rendered :global(th),
	.block-rendered :global(td) {
		padding: var(--spacing-sm);
		border: 1px solid var(--color-border);
		text-align: left;
	}

	.block-rendered :global(th) {
		background: var(--color-surface);
		font-weight: var(--font-weight-semibold);
	}

	.block-rendered :global(strong) {
		font-weight: var(--font-weight-bold);
	}

	.block-rendered :global(em) {
		font-style: italic;
	}

	.block-rendered :global(del) {
		text-decoration: line-through;
	}
</style>
