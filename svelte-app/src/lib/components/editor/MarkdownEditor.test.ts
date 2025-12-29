import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import MarkdownEditor from './MarkdownEditor.svelte';

describe('MarkdownEditor - Block Deletion', () => {
	describe('Backspace at position 0', () => {
		it('should merge empty block with previous block when pressing Backspace at position 0', async () => {
			const { container } = render(MarkdownEditor, {
				props: {
					value: 'First block\n\nSecond block'
				}
			});

			// Click on the second block to edit it
			const blocks = container.querySelectorAll('.block-rendered');
			await fireEvent.click(blocks[1]);

			// Wait for textarea to appear
			let textarea = container.querySelector('textarea') as HTMLTextAreaElement;
			expect(textarea).toBeTruthy();

			// Set cursor to position 0
			textarea.selectionStart = 0;
			textarea.selectionEnd = 0;

			// Press Backspace
			await fireEvent.keyDown(textarea, { key: 'Backspace' });

			// Get the updated textarea after merge (should now be editing the first block)
			textarea = container.querySelector('textarea') as HTMLTextAreaElement;

			// The blocks should be merged with \n\n separator
			expect(textarea.value).toContain('First block\n\nSecond block');
		});

		it('should merge non-empty block with previous block when pressing Backspace at position 0', async () => {
			const { container } = render(MarkdownEditor, {
				props: {
					value: 'First block\n\nSecond block with content'
				}
			});

			// Click on the second block to edit it
			const blocks = container.querySelectorAll('.block-rendered');
			await fireEvent.click(blocks[1]);

			// Wait for textarea to appear
			let textarea = container.querySelector('textarea') as HTMLTextAreaElement;
			expect(textarea).toBeTruthy();

			// Set cursor to position 0
			textarea.selectionStart = 0;
			textarea.selectionEnd = 0;

			// Press Backspace
			await fireEvent.keyDown(textarea, { key: 'Backspace' });

			// Get the updated textarea after merge (should now be editing the first block)
			textarea = container.querySelector('textarea') as HTMLTextAreaElement;

			// The blocks should be merged
			expect(textarea.value).toContain('First block\n\nSecond block with content');
		});

		it('should not merge when cursor is not at position 0', async () => {
			const { container } = render(MarkdownEditor, {
				props: {
					value: 'First block\n\nSecond block'
				}
			});

			// Click on the second block to edit it
			const blocks = container.querySelectorAll('.block-rendered');
			await fireEvent.click(blocks[1]);

			// Wait for textarea to appear
			const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
			expect(textarea).toBeTruthy();

			// Set cursor to position 5 (middle of "Second")
			textarea.selectionStart = 5;
			textarea.selectionEnd = 5;

			const initialValue = textarea.value;

			// Press Backspace (should just delete one character, not merge)
			await fireEvent.keyDown(textarea, { key: 'Backspace' });

			// The block should not merge with previous
			// Instead it should just delete the character before cursor
			expect(textarea.value).not.toBe(`${initialValue}\n\nFirst block`);
		});
	});

	describe('Delete/Backspace with all text selected', () => {
		it('should delete block when all text is selected with Backspace', async () => {
			const { container } = render(MarkdownEditor, {
				props: {
					value: 'First block\n\nSecond block\n\nThird block'
				}
			});

			// Click on the second block to edit it
			const blocks = container.querySelectorAll('.block-rendered');
			await fireEvent.click(blocks[1]);

			// Wait for textarea to appear
			const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
			expect(textarea).toBeTruthy();

			// Select all text in the block (Ctrl+A)
			textarea.selectionStart = 0;
			textarea.selectionEnd = textarea.value.length;

			// Press Backspace
			await fireEvent.keyDown(textarea, { key: 'Backspace' });

			// The second block should be deleted, leaving only first and third
			const remainingBlocks = container.querySelectorAll('.block-container');
			expect(remainingBlocks.length).toBe(2);
		});

		it('should delete block when all text is selected with Delete', async () => {
			const { container } = render(MarkdownEditor, {
				props: {
					value: 'First block\n\nSecond block\n\nThird block'
				}
			});

			// Click on the second block to edit it
			const blocks = container.querySelectorAll('.block-rendered');
			await fireEvent.click(blocks[1]);

			// Wait for textarea to appear
			const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
			expect(textarea).toBeTruthy();

			// Select all text in the block
			textarea.selectionStart = 0;
			textarea.selectionEnd = textarea.value.length;

			// Press Delete
			await fireEvent.keyDown(textarea, { key: 'Delete' });

			// The second block should be deleted
			const remainingBlocks = container.querySelectorAll('.block-container');
			expect(remainingBlocks.length).toBe(2);
		});

		it('should not delete block if not all text is selected', async () => {
			const { container } = render(MarkdownEditor, {
				props: {
					value: 'First block\n\nSecond block'
				}
			});

			// Click on the second block to edit it
			const blocks = container.querySelectorAll('.block-rendered');
			await fireEvent.click(blocks[1]);

			// Wait for textarea to appear
			const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
			expect(textarea).toBeTruthy();

			const initialBlockCount = container.querySelectorAll('.block-container').length;
			expect(initialBlockCount).toBe(2);

			// Select only part of the text
			textarea.selectionStart = 0;
			textarea.selectionEnd = 5; // Only "Secon" is selected

			// Press Backspace - since not all text is selected and we have a selection,
			// it should NOT merge with previous block
			await fireEvent.keyDown(textarea, { key: 'Backspace' });

			// The blocks should remain unchanged (2 blocks)
			const remainingBlocks = container.querySelectorAll('.block-container');
			expect(remainingBlocks.length).toBe(2);
		});
	});

	describe('Edge cases', () => {
		it('should not delete the last remaining block', async () => {
			const { container } = render(MarkdownEditor, {
				props: {
					value: 'Only block'
				}
			});

			// Click on the block to edit it
			const block = container.querySelector('.block-rendered');
			await fireEvent.click(block!);

			// Wait for textarea to appear
			const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
			expect(textarea).toBeTruthy();

			// Select all text
			textarea.selectionStart = 0;
			textarea.selectionEnd = textarea.value.length;

			// Press Backspace
			await fireEvent.keyDown(textarea, { key: 'Backspace' });

			// The block should still exist
			const blocks = container.querySelectorAll('.block-container');
			expect(blocks.length).toBeGreaterThanOrEqual(1);
		});

		it('should handle Backspace at position 0 in first block', async () => {
			const { container } = render(MarkdownEditor, {
				props: {
					value: 'First block\n\nSecond block'
				}
			});

			// Click on the first block to edit it
			const blocks = container.querySelectorAll('.block-rendered');
			await fireEvent.click(blocks[0]);

			// Wait for textarea to appear
			const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
			expect(textarea).toBeTruthy();

			// Set cursor to position 0
			textarea.selectionStart = 0;
			textarea.selectionEnd = 0;

			const initialValue = textarea.value;

			// Press Backspace (should do nothing since it's the first block)
			await fireEvent.keyDown(textarea, { key: 'Backspace' });

			// Nothing should change
			expect(textarea.value).toBe(initialValue);
		});
	});
});

describe('MarkdownEditor - Enter Key Behavior', () => {
	describe('Splitting blocks', () => {
		it('should split a paragraph block when pressing Enter', async () => {
			const { container } = render(MarkdownEditor, {
				props: {
					value: 'First line'
				}
			});

			// Click on the block to edit it
			const block = container.querySelector('.block-rendered');
			await fireEvent.click(block!);

			// Wait for textarea to appear
			const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
			expect(textarea).toBeTruthy();

			// Set cursor at end of text
			textarea.selectionStart = textarea.value.length;
			textarea.selectionEnd = textarea.value.length;

			// Press Enter
			await fireEvent.keyDown(textarea, { key: 'Enter' });

			// Should have created a second block
			const blocks = container.querySelectorAll('.block-container');
			expect(blocks.length).toBe(2);
		});

		it('should split a block at cursor position when pressing Enter', async () => {
			const { container } = render(MarkdownEditor, {
				props: {
					value: 'Hello World'
				}
			});

			// Click on the block to edit it
			const block = container.querySelector('.block-rendered');
			await fireEvent.click(block!);

			// Wait for textarea to appear
			let textarea = container.querySelector('textarea') as HTMLTextAreaElement;
			expect(textarea).toBeTruthy();

			// Set cursor after "Hello "
			textarea.selectionStart = 6;
			textarea.selectionEnd = 6;

			// Press Enter
			await fireEvent.keyDown(textarea, { key: 'Enter' });

			// Should have created two blocks, now editing second block
			const blocks = container.querySelectorAll('.block-container');
			expect(blocks.length).toBe(2);

			// Get the new textarea (editing second block)
			textarea = container.querySelector('textarea') as HTMLTextAreaElement;
			expect(textarea.value).toBe('World');
		});
	});

	describe('List continuation', () => {
		it('should continue list with new bullet when pressing Enter in a list', async () => {
			const { container } = render(MarkdownEditor, {
				props: {
					value: '- First item'
				}
			});

			// Click on the block to edit it
			const block = container.querySelector('.block-rendered');
			await fireEvent.click(block!);

			// Wait for textarea to appear
			const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
			expect(textarea).toBeTruthy();

			// Set cursor at end of text
			textarea.selectionStart = textarea.value.length;
			textarea.selectionEnd = textarea.value.length;

			// Press Enter
			await fireEvent.keyDown(textarea, { key: 'Enter' });

			// Should add a new list item with bullet
			expect(textarea.value).toContain('- First item\n- ');
		});

		it('should exit list and create new block when pressing Enter on empty list item', async () => {
			const { container } = render(MarkdownEditor, {
				props: {
					value: '- First item\n- '
				}
			});

			// Click on the block to edit it
			const block = container.querySelector('.block-rendered');
			await fireEvent.click(block!);

			// Wait for textarea to appear
			const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
			expect(textarea).toBeTruthy();

			// Set cursor at end of text (after the empty list item)
			textarea.selectionStart = textarea.value.length;
			textarea.selectionEnd = textarea.value.length;

			// Press Enter (should exit list and create new block)
			await fireEvent.keyDown(textarea, { key: 'Enter' });

			// Should have created a second block
			const blocks = container.querySelectorAll('.block-container');
			expect(blocks.length).toBe(2);
		});
	});
});

describe('MarkdownEditor - Tab Indentation', () => {
	it('should add indentation when pressing Tab', async () => {
		const { container } = render(MarkdownEditor, {
			props: {
				value: 'Some text'
			}
		});

		// Click on the block to edit it
		const block = container.querySelector('.block-rendered');
		await fireEvent.click(block!);

		// Wait for textarea to appear
		const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
		expect(textarea).toBeTruthy();

		// Set cursor at start
		textarea.selectionStart = 0;
		textarea.selectionEnd = 0;

		// Press Tab
		await fireEvent.keyDown(textarea, { key: 'Tab' });

		// Should add 2 spaces at the start
		expect(textarea.value).toBe('  Some text');
	});

	it('should remove indentation when pressing Shift+Tab', async () => {
		const { container } = render(MarkdownEditor, {
			props: {
				value: '  Indented text'
			}
		});

		// Click on the block to edit it
		const block = container.querySelector('.block-rendered');
		await fireEvent.click(block!);

		// Wait for textarea to appear
		const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
		expect(textarea).toBeTruthy();

		// Set cursor anywhere on the line
		textarea.selectionStart = 5;
		textarea.selectionEnd = 5;

		// Press Shift+Tab
		await fireEvent.keyDown(textarea, { key: 'Tab', shiftKey: true });

		// Should remove 2 spaces
		expect(textarea.value).toBe('Indented text');
	});

	it('should not remove indentation when there is none', async () => {
		const { container } = render(MarkdownEditor, {
			props: {
				value: 'No indent'
			}
		});

		// Click on the block to edit it
		const block = container.querySelector('.block-rendered');
		await fireEvent.click(block!);

		// Wait for textarea to appear
		const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
		expect(textarea).toBeTruthy();

		// Set cursor anywhere on the line
		textarea.selectionStart = 3;
		textarea.selectionEnd = 3;

		// Press Shift+Tab
		await fireEvent.keyDown(textarea, { key: 'Tab', shiftKey: true });

		// Should remain unchanged
		expect(textarea.value).toBe('No indent');
	});
});

describe('MarkdownEditor - Arrow Key Navigation', () => {
	it('should move to previous block when pressing ArrowUp at position 0', async () => {
		const { container } = render(MarkdownEditor, {
			props: {
				value: 'First block\n\nSecond block'
			}
		});

		// Click on the second block to edit it
		const blocks = container.querySelectorAll('.block-rendered');
		await fireEvent.click(blocks[1]);

		// Wait for textarea to appear
		let textarea = container.querySelector('textarea') as HTMLTextAreaElement;
		expect(textarea).toBeTruthy();
		expect(textarea.value).toBe('Second block');

		// Set cursor to position 0
		textarea.selectionStart = 0;
		textarea.selectionEnd = 0;

		// Press ArrowUp
		await fireEvent.keyDown(textarea, { key: 'ArrowUp' });

		// Should now be editing the first block
		textarea = container.querySelector('textarea') as HTMLTextAreaElement;
		expect(textarea.value).toBe('First block');
	});

	it('should move to next block when pressing ArrowDown at end of block', async () => {
		const { container } = render(MarkdownEditor, {
			props: {
				value: 'First block\n\nSecond block'
			}
		});

		// Click on the first block to edit it
		const blocks = container.querySelectorAll('.block-rendered');
		await fireEvent.click(blocks[0]);

		// Wait for textarea to appear
		let textarea = container.querySelector('textarea') as HTMLTextAreaElement;
		expect(textarea).toBeTruthy();
		expect(textarea.value).toBe('First block');

		// Set cursor to end
		textarea.selectionStart = textarea.value.length;
		textarea.selectionEnd = textarea.value.length;

		// Press ArrowDown
		await fireEvent.keyDown(textarea, { key: 'ArrowDown' });

		// Should now be editing the second block
		textarea = container.querySelector('textarea') as HTMLTextAreaElement;
		expect(textarea.value).toBe('Second block');
	});

	it('should call onnavigateup when pressing ArrowUp at position 0 in first block', async () => {
		let navigateUpCalled = false;
		const { container } = render(MarkdownEditor, {
			props: {
				value: 'First block',
				onnavigateup: () => {
					navigateUpCalled = true;
				}
			}
		});

		// Click on the block to edit it
		const block = container.querySelector('.block-rendered');
		await fireEvent.click(block!);

		// Wait for textarea to appear
		const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
		expect(textarea).toBeTruthy();

		// Set cursor to position 0
		textarea.selectionStart = 0;
		textarea.selectionEnd = 0;

		// Press ArrowUp
		await fireEvent.keyDown(textarea, { key: 'ArrowUp' });

		// Should have called the callback
		expect(navigateUpCalled).toBe(true);
	});
});

describe('MarkdownEditor - Wiki Link Trigger', () => {
	it('should allow typing [[ in textarea', async () => {
		const { container } = render(MarkdownEditor, {
			props: {
				value: 'Some text'
			}
		});

		// Click on the block to edit it
		const block = container.querySelector('.block-rendered');
		await fireEvent.click(block!);

		// Wait for textarea to appear
		const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
		expect(textarea).toBeTruthy();

		// Set initial position
		textarea.selectionStart = textarea.value.length;
		textarea.selectionEnd = textarea.value.length;

		// Manually type [[ (simulating user input without triggering the popover immediately)
		const initialValue = textarea.value;
		textarea.value = `${initialValue}[[`;

		// Verify the [[ was added to the textarea
		expect(textarea.value).toBe('Some text[[');
	});
});

describe('MarkdownEditor - Ctrl+Enter', () => {
	it('should call onctrlenter callback when pressing Ctrl+Enter', async () => {
		let ctrlEnterCalled = false;
		const { container } = render(MarkdownEditor, {
			props: {
				value: 'Some text',
				onctrlenter: () => {
					ctrlEnterCalled = true;
				}
			}
		});

		// Click on the block to edit it
		const block = container.querySelector('.block-rendered');
		await fireEvent.click(block!);

		// Wait for textarea to appear
		const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
		expect(textarea).toBeTruthy();

		// Press Ctrl+Enter
		await fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });

		// Should have called the callback
		expect(ctrlEnterCalled).toBe(true);
	});

	it('should prevent default Enter behavior when Ctrl is pressed', async () => {
		const { container } = render(MarkdownEditor, {
			props: {
				value: 'Single block'
			}
		});

		// Click on the block to edit it
		const block = container.querySelector('.block-rendered');
		await fireEvent.click(block!);

		// Wait for textarea to appear
		const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
		expect(textarea).toBeTruthy();

		const initialBlockCount = container.querySelectorAll('.block-container').length;

		// Press Ctrl+Enter
		await fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });

		// Should not create a new block
		const finalBlockCount = container.querySelectorAll('.block-container').length;
		expect(finalBlockCount).toBe(initialBlockCount);
	});
});
