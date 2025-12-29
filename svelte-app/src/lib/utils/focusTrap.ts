/**
 * Focus trap utility for modals and dialogs
 * Traps focus within a container element for accessibility
 */

const FOCUSABLE_ELEMENTS = [
	'a[href]',
	'area[href]',
	'input:not([disabled])',
	'select:not([disabled])',
	'textarea:not([disabled])',
	'button:not([disabled])',
	'iframe',
	'object',
	'embed',
	'[tabindex]:not([tabindex="-1"])',
	'[contenteditable]'
].join(',');

export function trapFocus(element: HTMLElement): () => void {
	const focusableElements = element.querySelectorAll<HTMLElement>(FOCUSABLE_ELEMENTS);
	const firstFocusable = focusableElements[0];
	const lastFocusable = focusableElements[focusableElements.length - 1];

	// Store the previously focused element to restore later
	const previouslyFocused = document.activeElement as HTMLElement;

	// Focus the first element when trap is activated
	if (firstFocusable) {
		firstFocusable.focus();
	}

	function handleKeydown(event: KeyboardEvent): void {
		if (event.key !== 'Tab') {
			return;
		}

		// Shift + Tab (backwards)
		if (event.shiftKey) {
			if (document.activeElement === firstFocusable) {
				event.preventDefault();
				lastFocusable?.focus();
			}
		}
		// Tab (forwards)
		else {
			if (document.activeElement === lastFocusable) {
				event.preventDefault();
				firstFocusable?.focus();
			}
		}
	}

	element.addEventListener('keydown', handleKeydown);

	// Return cleanup function
	return () => {
		element.removeEventListener('keydown', handleKeydown);
		// Restore focus to previously focused element
		if (previouslyFocused?.focus) {
			previouslyFocused.focus();
		}
	};
}

/**
 * Svelte action for focus trapping
 * Usage: <dialog use:focusTrap>
 */
export function focusTrap(node: HTMLElement): { destroy: () => void } {
	const cleanup = trapFocus(node);

	return {
		destroy() {
			cleanup();
		}
	};
}
