// Import dependencies
import { MarkdownTokenizer } from './markdown';
import { tokensToAST, astToText, type ASTNode } from './ast';
import { getListContext } from './astUtils';

export interface CursorPosition {
	node: ASTNode; // The node containing the cursor
	offset: number; // Offset within the node's text content
	absolutePos: number; // Absolute character position in document
}

/**
 * Handle Enter key press with smart list continuation
 */
export function handleEnterKey(root: ASTNode, pos: number): { ast: ASTNode; newPos: number } {
	const listContext = getListContext(root, pos);

	// If we're in a list
	if (listContext?.inList && listContext.listItem) {
		// If the list item is empty, exit the list
		if (listContext.isEmptyItem) {
			// Remove the empty list item and add a new paragraph after the list
			const currentText = astToText(root);

			// Find the list item in text
			const itemStart = listContext.listItem.start;
			const itemEnd = listContext.listItem.end;

			// Remove the list item and add two newlines to create a paragraph break
			const before = currentText.substring(0, itemStart);
			const after = currentText.substring(itemEnd);
			const newText = `${before.trimEnd()}\n\n${after}`;

			const tokenizer = new MarkdownTokenizer(newText);
			const tokens = tokenizer.tokenize();
			const newAST = tokensToAST(tokens);

			// Position cursor at the start of the new paragraph
			const newPos = before.trimEnd().length + 2;
			return { ast: newAST, newPos };
		} else {
			// Continue the list with a new item
			const currentText = astToText(root);
			const before = currentText.substring(0, pos);
			const after = currentText.substring(pos);

			// Create a new list item with the same indentation and type
			const indent = ' '.repeat((listContext.listItem.listLevel ?? 0) * 2);
			const listType = listContext.listItem.listType ?? 'bullet';
			const marker = listType === 'ordered' ? '1. ' : '- ';
			const newText = `${before}\n${indent}${marker}${after}`;

			const tokenizer = new MarkdownTokenizer(newText);
			const tokens = tokenizer.tokenize();
			const newAST = tokensToAST(tokens);

			// Position cursor after the new list marker
			const newPos = pos + 1 + indent.length + marker.length; // \n + indent + marker
			return { ast: newAST, newPos };
		}
	}

	// Check if we're in a heading - if so, just insert a single newline
	const node = findNodeAtPosition(root, pos);
	if (node?.type === 'heading' || isInHeading(root, pos)) {
		return insertTextAtCursor(root, pos, '\n');
	}

	// Not in a list or heading, just insert a single newline
	return insertTextAtCursor(root, pos, '\n');
}

/**
 * Helper to find the node at a given position
 */
function findNodeAtPosition(root: ASTNode, pos: number): ASTNode | null {
	function traverse(node: ASTNode): ASTNode | null {
		// Check if position is within this node
		if (pos < node.start || pos > node.end) {
			return null;
		}

		// If we have children, search them first (deeper match is more specific)
		if (node.children) {
			for (const child of node.children) {
				const result = traverse(child);
				if (result) {
					return result;
				}
			}
		}

		// If no child matched, this node is the match
		return node;
	}

	return traverse(root);
}

/**
 * Helper to check if we're in a heading by checking parent nodes
 */
function isInHeading(root: ASTNode, pos: number): boolean {
	const node = findNodeAtPosition(root, pos);
	if (!node) return false;

	// Check if the node itself is a heading
	if (node.type === 'heading') return true;

	// Check if any parent is a heading
	function findParent(current: ASTNode, target: ASTNode): ASTNode | null {
		if (current.children) {
			for (const child of current.children) {
				if (child === target) return current;
				const result = findParent(child, target);
				if (result) return result;
			}
		}
		return null;
	}

	let current: ASTNode | null = node;
	while (current) {
		if (current.type === 'heading') return true;
		current = findParent(root, current);
	}

	return false;
}

/**
 * Get line and column from cursor position
 * Returns the visual line/column, handling cases where cursor is on an empty line
 * after a newline (which visually appears at the end of the previous line)
 */
export function getLineAndColumn(text: string, pos: number): { line: number; column: number } {
	const lines = text.substring(0, pos).split('\n');
	const line = lines.length - 1;
	const column = lines[lines.length - 1].length;

	// If we're on an empty line (column 0) and it's not the first line,
	// visually we appear at the end of the previous line
	if (column === 0 && line > 0) {
		// Check if this is truly an empty line or just the start of a line with content
		const allLines = text.split('\n');
		if (line < allLines.length && allLines[line].length === 0) {
			// This is an empty line, visually we're at the end of the previous line
			return {
				line: line - 1,
				column: allLines[line - 1].length
			};
		}
	}

	return {
		line,
		column
	};
}

/**
 * Get cursor position from line and column
 */
export function getPositionFromLineColumn(text: string, line: number, column: number): number {
	const lines = text.split('\n');
	let pos = 0;

	for (let i = 0; i < line && i < lines.length; i++) {
		pos += lines[i].length + 1; // +1 for newline
	}

	if (line < lines.length) {
		pos += Math.min(column, lines[line].length);
	}

	return pos;
}

/**
 * Move cursor up one line
 */
export function moveCursorUp(root: ASTNode, pos: number): number {
	const text = astToText(root);
	const { line, column } = getLineAndColumn(text, pos);

	if (line === 0) {
		return 0; // Already at first line
	}

	return getPositionFromLineColumn(text, line - 1, column);
}

/**
 * Move cursor down one line
 */
export function moveCursorDown(root: ASTNode, pos: number): number {
	const text = astToText(root);
	const { line, column } = getLineAndColumn(text, pos);
	const lines = text.split('\n');

	if (line >= lines.length - 1) {
		return text.length; // Already at last line
	}

	return getPositionFromLineColumn(text, line + 1, column);
}

/**
 * Find the start of the word at or before the given position
 */
function findWordStart(text: string, pos: number): number {
	if (pos <= 0) return 0;

	// Move back to skip any whitespace at current position
	let i = pos - 1;
	while (i > 0 && /\s/.test(text[i])) {
		i--;
	}

	// Now move back to the start of the word
	while (i > 0 && !/\s/.test(text[i - 1])) {
		i--;
	}

	return i;
}

/**
 * Find the end of the word at or after the given position
 */
function findWordEnd(text: string, pos: number): number {
	if (pos >= text.length) return text.length;

	// Move forward to skip any whitespace at current position
	let i = pos;
	while (i < text.length && /\s/.test(text[i])) {
		i++;
	}

	// Now move forward to the end of the word
	while (i < text.length && !/\s/.test(text[i])) {
		i++;
	}

	return i;
}

/**
 * Move cursor left one character or one word if ctrl is held
 */
export function moveCursorLeft(root: ASTNode, pos: number, ctrl: boolean = false): number {
	if (pos <= 0) {
		return 0; // Already at start
	}

	if (ctrl) {
		const text = astToText(root);
		return findWordStart(text, pos);
	}

	return pos - 1;
}

/**
 * Move cursor right one character or one word if ctrl is held
 */
export function moveCursorRight(root: ASTNode, pos: number, ctrl: boolean = false): number {
	const text = astToText(root);
	if (pos >= text.length) {
		return text.length; // Already at end
	}

	if (ctrl) {
		return findWordEnd(text, pos);
	}

	return pos + 1;
}

/**
 * Insert text at cursor position and return updated AST
 * This regenerates the entire AST from text for simplicity
 */
export function insertTextAtCursor(
	root: ASTNode,
	pos: number,
	text: string
): { ast: ASTNode; newPos: number } {
	// Convert AST to text
	const currentText = astToText(root);

	// Insert text at position
	const before = currentText.substring(0, pos);
	const after = currentText.substring(pos);
	const newText = before + text + after;

	// Re-parse to get new AST
	const tokenizer = new MarkdownTokenizer(newText);
	const tokens = tokenizer.tokenize();
	const newAST = tokensToAST(tokens);

	return { ast: newAST, newPos: pos + text.length };
}

/**
 * Delete text at cursor position (backspace/delete)
 * This regenerates the entire AST from text for simplicity
 */
export function deleteAtCursor(
	root: ASTNode,
	pos: number,
	forward: boolean = false
): { ast: ASTNode; newPos: number } {
	// Convert AST to text
	const currentText = astToText(root);

	// Handle empty document
	if (currentText.length === 0) {
		return { ast: root, newPos: 0 };
	}

	// Check if we're in a list item and at the start of content
	// If so, remove the entire list marker instead of just one character
	if (!forward) {
		const listContext = getListContext(root, pos);
		if (listContext?.inList && listContext.listItem) {
			// Check if cursor is right after the list marker (at content start)
			// For bullet lists: "- " or "* " or "+ "
			// For ordered lists: "1. " or "2. " etc.
			const charBefore = pos > 0 ? currentText[pos - 1] : '';

			// Check for bullet list marker (- * +)
			if (charBefore === ' ') {
				const charBefore2 = pos > 1 ? currentText[pos - 2] : '';

				// Bullet list: "- " or "* " or "+ "
				if (charBefore2 === '-' || charBefore2 === '*' || charBefore2 === '+') {
					const beforeMarker = pos > 2 ? currentText[pos - 3] : '';
					if (beforeMarker === '\n' || pos <= 2) {
						// Check if this is an empty list item
						if (listContext.isEmptyItem) {
							// Remove the entire line including the newline before it
							// Find the start of the line (position after the previous newline)
							const lineStart = pos > 2 ? pos - 3 : 0; // Position of the newline before "- "

							// Remove from the newline before the marker to the current position
							const before = currentText.substring(0, lineStart);
							const after = currentText.substring(pos);
							const newText = before + after;
							const newPos = lineStart;

							const tokenizer = new MarkdownTokenizer(newText);
							const tokens = tokenizer.tokenize();
							const newAST = tokensToAST(tokens);

							return { ast: newAST, newPos };
						}

						// Remove "- " entirely
						const before = currentText.substring(0, pos - 2);
						const after = currentText.substring(pos);
						const newText = before + after;
						const newPos = pos - 2;

						const tokenizer = new MarkdownTokenizer(newText);
						const tokens = tokenizer.tokenize();
						const newAST = tokensToAST(tokens);

						return { ast: newAST, newPos };
					}
				}

				// Ordered list: "1. " or "2. " etc.
				if (charBefore2 === '.' && pos > 2) {
					// Look further back to find the start of the number
					let numStart = pos - 3;
					while (numStart >= 0 && /\d/.test(currentText[numStart])) {
						numStart--;
					}
					numStart++; // Move back to first digit

					// Check if we're at start of line
					const beforeNumber = numStart > 0 ? currentText[numStart - 1] : '';
					if (beforeNumber === '\n' || numStart === 0) {
						// Check if this is an empty list item
						if (listContext.isEmptyItem) {
							// Remove the entire line including the newline before it
							const lineStart = numStart > 0 ? numStart - 1 : 0; // Position of the newline before "1. "

							// Remove from the newline before the marker to the current position
							const before = currentText.substring(0, lineStart);
							const after = currentText.substring(pos);
							const newText = before + after;
							const newPos = lineStart;

							const tokenizer = new MarkdownTokenizer(newText);
							const tokens = tokenizer.tokenize();
							const newAST = tokensToAST(tokens);

							return { ast: newAST, newPos };
						}

						// Remove "1. " or "123. " entirely
						const before = currentText.substring(0, numStart);
						const after = currentText.substring(pos);
						const newText = `${before}${after}`;
						const newPos = numStart;

						const tokenizer = new MarkdownTokenizer(newText);
						const tokens = tokenizer.tokenize();
						const newAST = tokensToAST(tokens);

						return { ast: newAST, newPos };
					}
				}
			}
		}
	}

	let newText: string;
	let newPos: number;

	if (forward) {
		// Delete character after cursor
		if (pos < currentText.length) {
			const before = currentText.substring(0, pos);
			const after = currentText.substring(pos + 1);
			newText = before + after;
			newPos = pos;
		} else {
			return { ast: root, newPos: pos };
		}
	} else {
		// Backspace - delete character before cursor
		if (pos > 0) {
			const before = currentText.substring(0, pos - 1);
			const after = currentText.substring(pos);
			newText = before + after;
			newPos = pos - 1;
		} else {
			return { ast: root, newPos: pos };
		}
	}

	// Handle case where text becomes empty
	if (newText.length === 0) {
		return {
			ast: { type: 'document', start: 0, end: 0, children: [] },
			newPos: 0
		};
	}

	// Re-parse to get new AST
	const tokenizer = new MarkdownTokenizer(newText);
	const tokens = tokenizer.tokenize();
	const newAST = tokensToAST(tokens);

	return { ast: newAST, newPos };
}

/**
 * Handle Tab key press for list indentation
 */
export function handleTabKey(
	root: ASTNode,
	pos: number,
	shift: boolean = false
): { ast: ASTNode; newPos: number } {
	const listContext = getListContext(root, pos);

	// Only handle tab in lists
	if (!listContext?.inList || !listContext.listItem) {
		// Not in a list, just insert a tab character or do nothing
		return { ast: root, newPos: pos };
	}

	const currentText = astToText(root);
	const listItem = listContext.listItem;

	// Find the start of the line (the position right after the previous newline or start of document)
	let lineStart = listItem.start;
	// Walk backwards from listItem.start to find the newline or start of document
	while (lineStart > 0 && currentText[lineStart - 1] !== '\n') {
		lineStart--;
	}

	// Count current indentation (spaces at start of line, before the list marker)
	let indentCount = 0;
	let i = lineStart;
	while (i < currentText.length && currentText[i] === ' ') {
		indentCount++;
		i++;
	}

	// Find the previous list item to determine max allowed indentation
	let prevLineStart = -1;
	let prevIndentCount = 0;
	let isPrevLineList = false;

	// Only look for previous line if we're not at the start
	if (lineStart > 0) {
		// Walk backwards from the newline before current line
		let searchPos = lineStart - 1;
		
		// Skip the newline
		if (searchPos >= 0 && currentText[searchPos] === '\n') {
			searchPos--;
		}
		
		// Find the start of the previous line
		while (searchPos >= 0 && currentText[searchPos] !== '\n') {
			searchPos--;
		}
		prevLineStart = searchPos + 1; // Move past the newline (or start at 0 if searchPos is -1)
		
		// Count indentation of previous line
		let j = prevLineStart;
		while (j < currentText.length && currentText[j] === ' ') {
			prevIndentCount++;
			j++;
		}
		
		// Check if previous line is a list item (has a list marker)
		if (j < currentText.length) {
			const char = currentText[j];
			const nextChar = j + 1 < currentText.length ? currentText[j + 1] : '';
			isPrevLineList = char === '-' || char === '*' || char === '+' || 
			                 (char >= '0' && char <= '9' && nextChar === '.');
		}
	}

	let newIndentCount: number;
	if (shift) {
		// De-indent: remove 2 spaces (but not less than 0)
		newIndentCount = Math.max(0, indentCount - 2);
	} else {
		// Indent: add 2 spaces, but not more than one level deeper than previous item
		if (isPrevLineList && prevLineStart >= 0) {
			// Can only be at most 2 spaces more than the previous list item
			const maxIndent = prevIndentCount + 2;
			newIndentCount = Math.min(indentCount + 2, maxIndent);
		} else {
			// No previous list item, allow any indentation
			newIndentCount = indentCount + 2;
		}
	}

	// If indentation wouldn't change, don't do anything
	if (newIndentCount === indentCount) {
		return { ast: root, newPos: pos };
	}

	// Build the new text with updated indentation
	const indent = ' '.repeat(newIndentCount);
	const before = currentText.substring(0, lineStart);
	// Skip the old indentation and get everything from the list marker onwards
	const afterIndent = i; // Position right after the old indentation
	const lineContent = currentText.substring(afterIndent); // Everything from marker onwards
	const newText = before + indent + lineContent;

	// Parse the new text
	const tokenizer = new MarkdownTokenizer(newText);
	const tokens = tokenizer.tokenize();
	const newAST = tokensToAST(tokens);

	// Calculate new cursor position
	// The cursor position shifts by the difference in indentation
	const indentDiff = newIndentCount - indentCount;
	const newPos = pos + indentDiff;

	return { ast: newAST, newPos };
}
