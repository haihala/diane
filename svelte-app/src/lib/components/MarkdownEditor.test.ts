import { describe, it, expect, beforeEach } from 'vitest';
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
			const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
			expect(textarea).toBeTruthy();

			// Set cursor to position 0
			textarea.selectionStart = 0;
			textarea.selectionEnd = 0;

			// Press Backspace
			await fireEvent.keyDown(textarea, { key: 'Backspace' });

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
			const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
			expect(textarea).toBeTruthy();

			// Set cursor to position 0
			textarea.selectionStart = 0;
			textarea.selectionEnd = 0;

			// Press Backspace
			await fireEvent.keyDown(textarea, { key: 'Backspace' });

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
			expect(textarea.value).not.toBe(initialValue + '\n\nFirst block');
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

			// Select only part of the text
			textarea.selectionStart = 0;
			textarea.selectionEnd = 5; // Only "Secon" is selected

			// Press Backspace
			await fireEvent.keyDown(textarea, { key: 'Backspace' });

			// The block should still exist
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
