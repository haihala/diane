<script lang="ts">
	/*
  TODO: This is good enough for now, but I should probably hand-code it. Seems
  to be hard to vibe it correctly.
	 */
	import { marked } from 'marked';

	interface Props {
		value?: string;
		oninput?: (e: Event) => void;
		disabled?: boolean;
		placeholder?: string;
	}

	let { value = $bindable(''), oninput, disabled = false, placeholder = '' }: Props = $props();

	let editorElement: HTMLDivElement | undefined = $state();
	let editableDiv: HTMLDivElement | undefined = $state();
	let renderedContent: HTMLDivElement | undefined = $state();
	let currentLineIndex = $state(0);
	let overlayTop = $state(0);

	// Configure marked options
	marked.setOptions({
		breaks: true,
		gfm: true
	});

	// Split content into lines
	function getLines(): string[] {
		return value.split('\n');
	}

	// Get content with current line replaced by empty line with marker
	function getContentWithEmptyLine(): string {
		const lines = getLines();
		const modifiedLines = [...lines];
		modifiedLines[currentLineIndex] = '<span data-current-line></span>'; // Marker for current line
		return modifiedLines.join('\n');
	}

	// Get current line content
	function getCurrentLine(): string {
		const lines = getLines();
		return lines[currentLineIndex] || '';
	}

	// Parse markdown
	function parseMarkdown(text: string): string {
		if (!text.trim()) return '';
		try {
			return marked.parse(text) as string;
		} catch (err) {
			console.error('Failed to parse markdown:', err);
			return text;
		}
	}

	// Update overlay position by measuring the marker element
	function updateOverlayPosition(): void {
		if (!renderedContent) return;

		const marker = renderedContent.querySelector('[data-current-line]');
		if (marker) {
			const markerRect = marker.getBoundingClientRect();
			const contentRect = renderedContent.getBoundingClientRect();
			// Add offset to align properly with proper line spacing
			overlayTop = markerRect.top - contentRect.top + 16;
		}
	}

	// Handle input on editable div
	function handleInput(e: Event): void {
		const target = e.target as HTMLElement;
		const newText = target.textContent || '';

		// Update the current line in value
		const lines = getLines();
		lines[currentLineIndex] = newText;
		value = lines.join('\n');

		// Trigger parent's oninput
		oninput?.(e);
	}

	// Handle keyboard navigation
	function handleKeyDown(e: KeyboardEvent): void {
		const target = e.target as HTMLElement;
		const selection = window.getSelection();
		const cursorPos = selection?.anchorOffset || 0;
		const text = target.textContent || '';

		// Handle Tab key - insert four spaces at cursor position
		if (e.key === 'Tab') {
			e.preventDefault();
			const sel = window.getSelection();
			if (sel && sel.rangeCount > 0) {
				const range = sel.getRangeAt(0);
				range.deleteContents();
				range.insertNode(document.createTextNode('    '));
				range.collapse(false);
				sel.removeAllRanges();
				sel.addRange(range);
			}
			return;
		}

		// Handle Enter key - create new line
		if (e.key === 'Enter') {
			e.preventDefault();
			const lines = getLines();
			const currentText = lines[currentLineIndex] || '';
			const beforeCursor = currentText.substring(0, cursorPos);
			const afterCursor = currentText.substring(cursorPos);

			// Split the current line at cursor
			lines[currentLineIndex] = beforeCursor;
			lines.splice(currentLineIndex + 1, 0, afterCursor);
			value = lines.join('\n');

			// Move to next line
			currentLineIndex = currentLineIndex + 1;

			oninput?.(e);
			return;
		}

		// Handle Backspace at start of line - merge with previous line
		if (e.key === 'Backspace' && cursorPos === 0 && currentLineIndex > 0) {
			e.preventDefault();
			const lines = getLines();
			const prevLine = lines[currentLineIndex - 1] || '';
			const currentLine = lines[currentLineIndex] || '';
			const mergedPosition = prevLine.length;

			lines[currentLineIndex - 1] = prevLine + currentLine;
			lines.splice(currentLineIndex, 1);
			value = lines.join('\n');
			currentLineIndex = currentLineIndex - 1;

			// Place cursor at merge point
			setTimeout(() => {
				if (editableDiv) {
					const range = document.createRange();
					const sel = window.getSelection();
					if (editableDiv.firstChild) {
						range.setStart(editableDiv.firstChild, mergedPosition);
						range.collapse(true);
						sel?.removeAllRanges();
						sel?.addRange(range);
					}
				}
			}, 0);

			oninput?.(e);
			return;
		}

		// Handle Delete at end of line - merge with next line
		if (
			e.key === 'Delete' &&
			cursorPos === text.length &&
			currentLineIndex < getLines().length - 1
		) {
			e.preventDefault();
			const lines = getLines();
			const currentLine = lines[currentLineIndex] || '';
			const nextLine = lines[currentLineIndex + 1] || '';

			lines[currentLineIndex] = currentLine + nextLine;
			lines.splice(currentLineIndex + 1, 1);
			value = lines.join('\n');

			oninput?.(e);
			return;
		}

		// Handle ArrowUp - move to previous line
		if (e.key === 'ArrowUp' && currentLineIndex > 0) {
			e.preventDefault();
			currentLineIndex = currentLineIndex - 1;

			// Focus and try to maintain cursor position
			setTimeout(() => {
				if (editableDiv) {
					editableDiv.focus();
					if (editableDiv.firstChild) {
						const range = document.createRange();
						const sel = window.getSelection();
						const targetPos = Math.min(cursorPos, (editableDiv.textContent || '').length);
						range.setStart(editableDiv.firstChild, targetPos);
						range.collapse(true);
						sel?.removeAllRanges();
						sel?.addRange(range);
					}
				}
			}, 0);
			return;
		}

		// Handle ArrowDown - move to next line
		if (e.key === 'ArrowDown' && currentLineIndex < getLines().length - 1) {
			e.preventDefault();
			currentLineIndex = currentLineIndex + 1;

			// Focus and try to maintain cursor position
			setTimeout(() => {
				if (editableDiv) {
					editableDiv.focus();
					if (editableDiv.firstChild) {
						const range = document.createRange();
						const sel = window.getSelection();
						const targetPos = Math.min(cursorPos, (editableDiv.textContent || '').length);
						range.setStart(editableDiv.firstChild, targetPos);
						range.collapse(true);
						sel?.removeAllRanges();
						sel?.addRange(range);
					}
				}
			}, 0);
			return;
		}
	}

	// Handle clicks on rendered content to switch lines
	function handleContentClick(e: MouseEvent): void {
		if (disabled) return;

		const contentElement = editorElement?.querySelector('.rendered-content');

		if (!contentElement) return;

		// Get click position relative to content
		const rect = contentElement.getBoundingClientRect();
		const relativeY = e.clientY - rect.top;

		// Estimate which line was clicked (accounting for padding)
		const lineHeight = 26;
		const padding = 16;
		const clickedLine = Math.floor((relativeY - padding) / lineHeight);

		const lines = getLines();
		const targetLine = Math.max(0, Math.min(clickedLine, lines.length - 1));

		if (targetLine !== currentLineIndex) {
			currentLineIndex = targetLine;
		}

		// Focus the editable div
		setTimeout(() => {
			editableDiv?.focus();
		}, 0);
	}

	// Update editable div content and position when line changes
	$effect(() => {
		if (editableDiv) {
			const currentText = getCurrentLine();
			if (editableDiv.textContent !== currentText) {
				editableDiv.textContent = currentText;
			}
		}

		// Update overlay position after content renders
		setTimeout(() => {
			updateOverlayPosition();
		}, 0);
	});

	// Initialize focus
	$effect(() => {
		if (editorElement && editableDiv && !disabled) {
			if (!editorElement.contains(document.activeElement)) {
				editableDiv.focus();
			}
		}
	});
</script>

<div class="markdown-editor" bind:this={editorElement}>
	<div class="editor-wrapper">
		<!-- Rendered content with marker at cursor position -->
		<div
			bind:this={renderedContent}
			class="rendered-content"
			onclick={handleContentClick}
			onkeydown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					handleContentClick(e as any);
				}
			}}
			role="button"
			tabindex="-1"
		>
			{#if getContentWithEmptyLine().trim()}
				{@html parseMarkdown(getContentWithEmptyLine())}
			{:else}
				<p class="empty-placeholder">{placeholder}</p>
			{/if}
		</div>

		<!-- Editable line overlay -->
		<div
			bind:this={editableDiv}
			class="editable-overlay"
			style="top: {overlayTop}px;"
			contenteditable={!disabled}
			oninput={handleInput}
			onkeydown={handleKeyDown}
			role="textbox"
			aria-multiline="false"
			tabindex="0"
		></div>
	</div>
</div>

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

	.rendered-content {
		color: var(--color-text);
		font-size: var(--font-size-md);
		line-height: 1.6;
		cursor: text;
		min-height: 1.6em;
	}

	.empty-placeholder {
		color: var(--color-text-secondary);
		font-style: italic;
		margin: 0;
	}

	.editable-overlay {
		position: absolute;
		left: var(--spacing-md);
		right: var(--spacing-md);
		min-height: 1.6em;
		line-height: 1.6;
		outline: none;
		background: transparent;
		color: var(--color-text);
		font-size: var(--font-size-md);
		white-space: pre-wrap;
		word-wrap: break-word;
		pointer-events: auto;
		caret-color: var(--color-text);
	}

	/* Markdown styling */
	.rendered-content :global(h1) {
		font-size: var(--font-size-2xl);
		font-weight: var(--font-weight-bold);
		margin-top: var(--spacing-lg);
		margin-bottom: var(--spacing-md);
		color: var(--color-text);
	}

	.rendered-content :global(h1:first-child) {
		margin-top: 0;
	}

	.rendered-content :global(h2) {
		font-size: var(--font-size-xl);
		font-weight: var(--font-weight-bold);
		margin-top: var(--spacing-lg);
		margin-bottom: var(--spacing-md);
		color: var(--color-text);
	}

	.rendered-content :global(h2:first-child) {
		margin-top: 0;
	}

	.rendered-content :global(h3) {
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-semibold);
		margin-top: var(--spacing-md);
		margin-bottom: var(--spacing-sm);
		color: var(--color-text);
	}

	.rendered-content :global(h3:first-child) {
		margin-top: 0;
	}

	.rendered-content :global(h4),
	.rendered-content :global(h5),
	.rendered-content :global(h6) {
		font-size: var(--font-size-md);
		font-weight: var(--font-weight-semibold);
		margin-top: var(--spacing-md);
		margin-bottom: var(--spacing-sm);
		color: var(--color-text);
	}

	.rendered-content :global(h4:first-child),
	.rendered-content :global(h5:first-child),
	.rendered-content :global(h6:first-child) {
		margin-top: 0;
	}

	.rendered-content :global(p) {
		margin-bottom: var(--spacing-md);
		margin-top: 0;
		line-height: 1.6;
		min-height: 1.6em;
	}

	.rendered-content :global(p:last-child) {
		margin-bottom: 0;
	}

	.rendered-content :global(p:empty) {
		min-height: 1.6em;
	}

	.rendered-content :global(ul),
	.rendered-content :global(ol) {
		margin-bottom: var(--spacing-md);
		margin-top: 0;
		padding-left: var(--spacing-xl);
	}

	.rendered-content :global(li) {
		margin-bottom: var(--spacing-xs);
	}

	.rendered-content :global(blockquote) {
		margin: var(--spacing-md) 0;
		padding-left: var(--spacing-md);
		border-left: 3px solid var(--color-primary);
		color: var(--color-text-secondary);
		font-style: italic;
	}

	.rendered-content :global(code) {
		padding: 2px 6px;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		font-family: 'Courier New', monospace;
		font-size: 0.9em;
	}

	.rendered-content :global(pre) {
		margin: var(--spacing-md) 0;
		padding: var(--spacing-md);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		overflow-x: auto;
	}

	.rendered-content :global(pre code) {
		padding: 0;
		background: transparent;
		border: none;
		font-size: var(--font-size-sm);
	}

	.rendered-content :global(a) {
		color: var(--color-primary);
		text-decoration: none;
	}

	.rendered-content :global(a:hover) {
		text-decoration: underline;
	}

	.rendered-content :global(img) {
		max-width: 100%;
		height: auto;
		border-radius: var(--radius-md);
		margin: var(--spacing-md) 0;
	}

	.rendered-content :global(hr) {
		border: none;
		border-top: 1px solid var(--color-border);
		margin: var(--spacing-lg) 0;
	}

	.rendered-content :global(table) {
		width: 100%;
		border-collapse: collapse;
		margin: var(--spacing-md) 0;
	}

	.rendered-content :global(th),
	.rendered-content :global(td) {
		padding: var(--spacing-sm);
		border: 1px solid var(--color-border);
		text-align: left;
	}

	.rendered-content :global(th) {
		background: var(--color-surface);
		font-weight: var(--font-weight-semibold);
	}

	.rendered-content :global(strong) {
		font-weight: var(--font-weight-bold);
	}

	.rendered-content :global(em) {
		font-style: italic;
	}

	.rendered-content :global(del) {
		text-decoration: line-through;
	}

	.rendered-content :global([data-current-line]) {
		display: inline-block;
		min-width: 1px;
		min-height: 1.6em;
	}
</style>
