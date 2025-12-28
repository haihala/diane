<script lang="ts">
	import Tag from './Tag.svelte';
	import TagSelectorPopover from './TagSelectorPopover.svelte';
	import { extractTagsFromTitle } from '$lib/services/markdown';

	interface Props {
		value?: string;
		disabled?: boolean;
		oninput?: (value: string) => void;
		onkeydown?: (e: KeyboardEvent) => void;
		placeholder?: string;
	}

	// eslint-disable-next-line prefer-const
	let { value = $bindable(''), ...restProps }: Props = $props();
	const { disabled = false, oninput, onkeydown, placeholder = 'Entry title...' } = restProps;

	let titleInputElement: HTMLInputElement | undefined = $state();

	// Tag selector popover state
	let showTagPopover = $state(false);
	let tagPopoverPosition = $state({ x: 0, y: 0 });
	let tagSearchTerm = $state('');
	let tagStartPos = $state(0);
	let tagSelectorRef:
		| { handleExternalKeydown: (e: KeyboardEvent) => void; hasAvailableTags: () => boolean }
		| undefined = $state();

	// Derive tags from the current value
	const currentTags = $derived(extractTagsFromTitle(value).tags);

	// Check if # was just typed to trigger tag selector
	function checkForTagTrigger(input: HTMLInputElement): void {
		const text = input.value;
		const cursorPos = input.selectionStart ?? 0;

		// Look backwards from cursor to find #
		const textBeforeCursor = text.substring(0, cursorPos);

		// Find the last # that's either at the start or preceded by whitespace
		let lastHashPos = -1;
		for (let i = textBeforeCursor.length - 1; i >= 0; i--) {
			if (textBeforeCursor[i] === '#') {
				// Check if it's at the start or preceded by whitespace
				if (i === 0 || /\s/.test(textBeforeCursor[i - 1])) {
					lastHashPos = i;
					break;
				}
			} else if (/\s/.test(textBeforeCursor[i])) {
				// Stop at whitespace if we haven't found a # yet
				break;
			}
		}

		// Check if we have a valid # trigger
		if (lastHashPos !== -1) {
			const textAfterHash = textBeforeCursor.substring(lastHashPos + 1);

			// Only show popover if we have # followed by word characters (no spaces)
			if (!textAfterHash.includes(' ') && /^\w*$/.test(textAfterHash)) {
				tagSearchTerm = textAfterHash;
				tagStartPos = lastHashPos;

				// Calculate popover position
				const rect = input.getBoundingClientRect();
				tagPopoverPosition = {
					x: rect.left,
					y: rect.bottom + 5
				};

				showTagPopover = true;
				return;
			}
		}

		// Hide popover if no valid # trigger found
		showTagPopover = false;
	}

	// Handle tag selection from popover
	function handleTagSelect(tag: string): void {
		if (!titleInputElement) return;

		// Replace # and search term with the selected tag
		const beforeTag = value.substring(0, tagStartPos);
		const cursorPos = titleInputElement.selectionStart ?? 0;
		const afterCursor = value.substring(cursorPos);

		const tagText = `#${tag}`;

		value = beforeTag + tagText + afterCursor;

		// Move cursor after the inserted tag
		const newCursorPos = tagStartPos + tagText.length;

		// Update input
		setTimeout(() => {
			if (titleInputElement) {
				titleInputElement.focus();
				titleInputElement.selectionStart = titleInputElement.selectionEnd = newCursorPos;
			}
		}, 0);

		showTagPopover = false;
		oninput?.(value);
	}

	// Close tag popover
	function handleTagPopoverClose(): void {
		showTagPopover = false;
	}

	function handleInput(event: Event): void {
		const target = event.target as HTMLInputElement;
		value = target.value;
		checkForTagTrigger(target);
		oninput?.(value);
	}

	function handleKeydown(event: KeyboardEvent): void {
		// If tag popover is open, handle Enter specially
		if (showTagPopover && event.key === 'Enter') {
			event.preventDefault();
			// If there are available tags, let the popover handle selection
			const hasMatches = tagSelectorRef?.hasAvailableTags?.() ?? false;
			if (hasMatches) {
				// Let the tag selector handle the Enter key
				if (tagSelectorRef?.handleExternalKeydown) {
					tagSelectorRef.handleExternalKeydown(event);
				}
			} else {
				// No matches, create a new tag with the search term
				if (tagSearchTerm.trim()) {
					handleTagSelect(tagSearchTerm.trim());
				}
			}
			return;
		}

		// If tag popover is open, let it handle arrow keys
		if (showTagPopover && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
			event.preventDefault();
			if (tagSelectorRef?.handleExternalKeydown) {
				tagSelectorRef.handleExternalKeydown(event);
			}
			return;
		}

		// Handle Escape to close tag popover
		if (event.key === 'Escape' && showTagPopover) {
			event.preventDefault();
			showTagPopover = false;
			return;
		}

		// Call parent keydown handler
		onkeydown?.(event);
	}

	// Export focus method so parent can focus the input
	export function focus(): void {
		titleInputElement?.focus();
	}
</script>

<div class="tag-input-container">
	<div class="form-group">
		<label for="entry-title" class="form-label">Title</label>
		<input
			bind:this={titleInputElement}
			id="entry-title"
			type="text"
			class="form-input"
			{placeholder}
			{value}
			oninput={handleInput}
			onkeydown={handleKeydown}
			{disabled}
		/>
	</div>

	{#if currentTags.length > 0}
		<div class="tags-display">
			{#each currentTags as tag (tag)}
				<Tag {tag} />
			{/each}
		</div>
	{/if}

	{#if showTagPopover}
		<div style="position: fixed; z-index: 10000; pointer-events: auto;">
			<TagSelectorPopover
				bind:this={tagSelectorRef}
				searchTerm={tagSearchTerm}
				position={tagPopoverPosition}
				onSelect={handleTagSelect}
				onClose={handleTagPopoverClose}
			/>
		</div>
	{/if}
</div>

<style>
	.tag-input-container {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	.form-label {
		display: block;
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		color: var(--color-text-secondary);
	}

	.form-input {
		width: 100%;
		padding: var(--spacing-md);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-bg);
		color: var(--color-text);
		font-size: var(--font-size-md);
		transition: all var(--transition-fast);
	}

	.form-input:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px rgba(167, 139, 250, 0.1);
	}

	.tags-display {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-sm);
	}
</style>
