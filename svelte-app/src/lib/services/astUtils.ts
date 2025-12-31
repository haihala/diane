import type { ASTNode } from './ast';
import { astToText } from './ast';

/**
 * Find the node at a given cursor position
 */
export function findNodeAtPosition(root: ASTNode, pos: number): ASTNode | null {
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
 * Find the parent of a node in the tree
 */
export function findParentNode(root: ASTNode, targetNode: ASTNode): ASTNode | null {
	function traverse(node: ASTNode, parent: ASTNode | null): ASTNode | null {
		if (node === targetNode) {
			return parent;
		}

		if (node.children) {
			for (const child of node.children) {
				const result = traverse(child, node);
				if (result !== null) {
					return result;
				}
			}
		}

		return null;
	}

	return traverse(root, null);
}

/**
 * Check if cursor is in a list item and get context
 */
export function getListContext(
	root: ASTNode,
	pos: number
): {
	inList: boolean;
	listItem?: ASTNode;
	list?: ASTNode;
	isEmptyItem?: boolean;
	textBeforeCursor?: string;
	textAfterCursor?: string;
} | null {
	const node = findNodeAtPosition(root, pos);
	if (!node) {
		return null;
	}

	// Find the list-item ancestor
	let currentNode: ASTNode | null = node;
	let listItem: ASTNode | null = null;
	let iterations = 0;
	const maxIterations = 100; // Prevent infinite loops
	const seen = new Set<ASTNode>(); // Track visited nodes to prevent cycles

	while (currentNode && iterations < maxIterations) {
		// Check for cycles
		if (seen.has(currentNode)) {
			console.error('Cycle detected in getListContext');
			break;
		}
		seen.add(currentNode);

		if (currentNode.type === 'list-item') {
			listItem = currentNode;
			break;
		}

		const parent = findParentNode(root, currentNode);
		if (parent === null) {
			// No parent found, we've reached the top
			break;
		}

		currentNode = parent;
		iterations++;
	}

	if (!listItem) {
		return { inList: false };
	}

	// Find the list (parent of list-item)
	const list = findParentNode(root, listItem);
	if (!list?.type || list.type !== 'list') {
		return { inList: false };
	}

	// Get the text content of the list item
	const itemText = astToText(listItem);

	// Calculate position within the list item
	const posInItem = pos - listItem.start;

	// Check if item is empty (only whitespace or just the marker)
	// We need to check if the children content is empty, not the full text
	// because astToText includes the marker (e.g., "- " for bullet lists)
	const childrenText = listItem.children
		?.map((child) => {
			if (child.type === 'text') {
				return child.text ?? '';
			}
			return astToText(child);
		})
		.join('');
	const isEmptyItem = (childrenText?.trim().length ?? 0) === 0;

	// Get text before and after cursor
	const textBeforeCursor = itemText.substring(0, posInItem);
	const textAfterCursor = itemText.substring(posInItem);

	return {
		inList: true,
		listItem,
		list,
		isEmptyItem,
		textBeforeCursor,
		textAfterCursor
	};
}
