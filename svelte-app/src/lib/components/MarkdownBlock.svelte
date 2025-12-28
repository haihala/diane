<script lang="ts">
	interface Props {
		content: string;
		renderedHtml: string;
		isEditing: boolean;
		disabled?: boolean;
		oninput?: (e: Event) => void;
		onblur?: () => void;
		onkeydown?: (e: KeyboardEvent) => void;
		onclick?: (e?: MouseEvent) => void;
		onfocus?: () => void;
		textareaRef?: (node: HTMLTextAreaElement) => void;
	}

	const {
		content,
		renderedHtml,
		isEditing,
		disabled = false,
		oninput,
		onblur,
		onkeydown,
		onclick,
		onfocus,
		textareaRef
	}: Props = $props();

	let textareaElement: HTMLTextAreaElement | undefined = $state();

	// Auto-resize textarea to fit content
	function autoResizeTextarea(textarea: HTMLTextAreaElement): void {
		textarea.style.height = 'auto';
		textarea.style.height = `${textarea.scrollHeight}px`;
	}

	// Store textarea reference and auto-resize on mount
	function handleTextareaMount(node: HTMLTextAreaElement): { destroy: () => void } {
		textareaElement = node;
		textareaRef?.(node);
		autoResizeTextarea(node);

		return {
			destroy() {
				textareaElement = undefined;
			}
		};
	}

	// Auto-resize when content changes
	$effect(() => {
		if (textareaElement && isEditing) {
			autoResizeTextarea(textareaElement);
		}
	});

	function handleTextareaInput(e: Event): void {
		const target = e.target as HTMLTextAreaElement;
		autoResizeTextarea(target);
		oninput?.(e);
	}
</script>

<div class="block-container">
	{#if isEditing}
		<!-- Editing mode: show textarea -->
		<textarea
			use:handleTextareaMount
			class="block-textarea"
			value={content}
			oninput={handleTextareaInput}
			{onblur}
			{onkeydown}
			{disabled}
		></textarea>
	{:else}
		<!-- View mode: show rendered HTML -->
		<div
			class="block-rendered"
			{onclick}
			{onfocus}
			onkeydown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					onclick?.();
				}
			}}
			role="button"
			tabindex="0"
		>
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html renderedHtml || ''}
		</div>
	{/if}
</div>

<style>
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
