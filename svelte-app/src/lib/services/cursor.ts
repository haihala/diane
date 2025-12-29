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

	// Check if we're in a heading - if so, create paragraph break
	const node = findNodeAtPosition(root, pos);
	if (node?.type === 'heading' || isInHeading(root, pos)) {
		const currentText = astToText(root);
		const before = currentText.substring(0, pos);
		const after = currentText.substring(pos);
		// Insert double newline to create a new paragraph block after the heading
		const newText = `${before}\n\n${after}`;

		const tokenizer = new MarkdownTokenizer(newText);
		const tokens = tokenizer.tokenize();
		const newAST = tokensToAST(tokens);

		// Position cursor after the double newline (ready to start typing new content)
		const newPos = pos + 2;
		return { ast: newAST, newPos };
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
 */
export function getLineAndColumn(text: string, pos: number): { line: number; column: number } {
	const lines = text.substring(0, pos).split('\n');
	return {
		line: lines.length - 1,
		column: lines[lines.length - 1].length
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
