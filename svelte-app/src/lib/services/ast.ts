import { MarkdownTokenizer, type Token } from './markdown';

const LIST_INDENT_SPACES = 2;

// AST Node types
export type ASTNodeType =
	| 'document' // Root node
	| 'paragraph' // Block
	| 'heading' // Block
	| 'list' // Block (container for list items)
	| 'list-item' // Block
	| 'code-block' // Block
	| 'blockquote' // Block
	| 'hr' // Block
	| 'text' // Inline
	| 'bold' // Inline
	| 'italic' // Inline
	| 'strikethrough' // Inline
	| 'code' // Inline
	| 'link' // Inline
	| 'wiki-link' // Inline
	| 'line-break'; // Inline

export interface ASTNode {
	type: ASTNodeType;
	start: number; // Character position in source
	end: number; // Character position in source
	children?: ASTNode[];

	// Type-specific properties
	level?: number; // For heading (1-6)
	href?: string; // For link
	entryId?: string; // For wiki-link
	language?: string; // For code-block
	listType?: 'bullet' | 'ordered'; // For list and list-item
	listLevel?: number; // For list-item (indentation)
	hasTrailingNewline?: boolean; // For block-level nodes that may have trailing newlines

	// Leaf nodes only
	text?: string; // For text nodes
}

// Type for resolving entry IDs to titles at runtime
export type EntryTitleMap = Map<string, string>;

/**
 * Convert tokens to AST
 */
export function tokensToAST(tokens: Token[]): ASTNode {
	const document: ASTNode = {
		type: 'document',
		start: 0,
		end: tokens.length > 0 ? tokens[tokens.length - 1].end : 0,
		children: []
	};

	let i = 0;
	while (i < tokens.length) {
		const token = tokens[i];

		// Handle block-level elements
		if (token.type === 'heading') {
			// Calculate where the content actually starts
			// Format: "### content" or "### content\n"
			// Content starts at: start + (raw.length - content.length - (has newline ? 1 : 0))
			const hasNewline = token.raw.endsWith('\n');
			const contentOffset =
				token.start + token.raw.length - token.content.length - (hasNewline ? 1 : 0);

			const heading: ASTNode = {
				type: 'heading',
				start: token.start,
				end: token.end,
				level: token.level,
				hasTrailingNewline: hasNewline,
				children: parseInlineTokens(token.content, contentOffset)
			};
			document.children!.push(heading);
			i++;
			continue;
		}

		if (token.type === 'code-block') {
			const codeBlock: ASTNode = {
				type: 'code-block',
				start: token.start,
				end: token.end,
				language: token.language,
				text: token.content
			};
			document.children!.push(codeBlock);
			i++;
			continue;
		}

		if (token.type === 'hr') {
			const hr: ASTNode = {
				type: 'hr',
				start: token.start,
				end: token.end
			};
			document.children!.push(hr);
			i++;
			continue;
		}

		if (token.type === 'blockquote') {
			const blockquote: ASTNode = {
				type: 'blockquote',
				start: token.start,
				end: token.end,
				children: parseInlineTokens(token.content, token.start)
			};
			document.children!.push(blockquote);
			i++;
			continue;
		}

		if (token.type === 'list-item') {
			// Group consecutive list items into a list
			const listStart = token.start;
			const listItems: ASTNode[] = [];
			const listType = token.listType ?? 'bullet';

			while (i < tokens.length && tokens[i].type === 'list-item') {
				const listItemToken = tokens[i];

				// Calculate where the content starts in the source text
				// Format: "  - content" (indent + marker + space + content)
				// For "- ", raw is "- " (2 chars) and content is "" (0 chars)
				// Content starts at: start + (raw.length - content.length - (has newline ? 1 : 0))
				const hasNewline = listItemToken.raw.endsWith('\n');
				const contentOffset =
					listItemToken.start +
					listItemToken.raw.length -
					listItemToken.content.length -
					(hasNewline ? 1 : 0);

				const listItem: ASTNode = {
					type: 'list-item',
					start: listItemToken.start,
					end: listItemToken.end,
					listType: listItemToken.listType ?? 'bullet',
					listLevel: listItemToken.level ?? 0,
					children: parseInlineTokens(listItemToken.content, contentOffset)
				};
				listItems.push(listItem);
				i++;
			}

			const list: ASTNode = {
				type: 'list',
				start: listStart,
				end: listItems[listItems.length - 1].end,
				listType,
				children: listItems
			};
			document.children!.push(list);
			continue;
		}

		// Handle inline text as paragraphs
		if (
			token.type === 'text' ||
			token.type === 'bold' ||
			token.type === 'italic' ||
			token.type === 'strikethrough' ||
			token.type === 'code' ||
			token.type === 'link' ||
			token.type === 'wiki-link'
		) {
			// Group consecutive inline tokens into a paragraph
			const paragraphStart = token.start;
			const inlineTokens: Token[] = [];

			while (
				i < tokens.length &&
				(tokens[i].type === 'text' ||
					tokens[i].type === 'bold' ||
					tokens[i].type === 'italic' ||
					tokens[i].type === 'strikethrough' ||
					tokens[i].type === 'code' ||
					tokens[i].type === 'link' ||
					tokens[i].type === 'wiki-link')
			) {
				inlineTokens.push(tokens[i]);
				i++;
			}

			// Convert inline tokens to inline AST nodes
			const inlineNodes: ASTNode[] = inlineTokens.map((t) => tokenToInlineNode(t));

			const paragraph: ASTNode = {
				type: 'paragraph',
				start: paragraphStart,
				end: inlineTokens[inlineTokens.length - 1].end,
				children: inlineNodes
			};
			document.children!.push(paragraph);
			continue;
		}

		i++;
	}

	return document;
}

/**
 * Parse inline content (text with inline markup) into AST nodes
 * baseOffset should be the position where the content text starts in the source
 */
function parseInlineTokens(text: string, baseOffset: number): ASTNode[] {
	const tokenizer = new MarkdownTokenizer(text);
	const tokens = tokenizer.tokenize();

	const nodes: ASTNode[] = [];

	for (const token of tokens) {
		// Only process inline tokens
		if (
			['text', 'bold', 'italic', 'strikethrough', 'code', 'link', 'wiki-link'].includes(token.type)
		) {
			// Adjust token positions to account for baseOffset
			const adjustedToken = {
				...token,
				start: baseOffset + token.start,
				end: baseOffset + token.end
			};

			// Convert token to AST node
			const node = tokenToInlineNode(adjustedToken);
			nodes.push(node);
		} else {
			// For block-level tokens, just treat as text
			nodes.push({
				type: 'text',
				start: baseOffset + token.start,
				end: baseOffset + token.end,
				text: token.raw
			});
		}
	}

	return nodes.length > 0
		? nodes
		: [
				{
					type: 'text',
					start: baseOffset,
					end: baseOffset + text.length,
					text
				}
			];
}

/**
 * Convert a single token to an inline AST node
 */
function tokenToInlineNode(token: Token): ASTNode {
	switch (token.type) {
		case 'text':
			return {
				type: 'text',
				start: token.start,
				end: token.end,
				text: token.content
			};
		case 'bold':
			return {
				type: 'bold',
				start: token.start,
				end: token.end,
				children: [
					{
						type: 'text',
						start: token.start,
						end: token.end,
						text: token.content
					}
				]
			};
		case 'italic':
			return {
				type: 'italic',
				start: token.start,
				end: token.end,
				children: [
					{
						type: 'text',
						start: token.start,
						end: token.end,
						text: token.content
					}
				]
			};
		case 'strikethrough':
			return {
				type: 'strikethrough',
				start: token.start,
				end: token.end,
				children: [
					{
						type: 'text',
						start: token.start,
						end: token.end,
						text: token.content
					}
				]
			};
		case 'code':
			return {
				type: 'code',
				start: token.start,
				end: token.end,
				text: token.content
			};
		case 'link':
			return {
				type: 'link',
				start: token.start,
				end: token.end,
				href: token.href,
				children: [
					{
						type: 'text',
						start: token.start,
						end: token.end,
						text: token.content
					}
				]
			};
		case 'wiki-link':
			return {
				type: 'wiki-link',
				start: token.start,
				end: token.end,
				entryId: token.entryId,
				children: [
					{
						type: 'text',
						start: token.start,
						end: token.end,
						text: token.content
					}
				]
			};
		default:
			return {
				type: 'text',
				start: token.start,
				end: token.end,
				text: token.raw
			};
	}
}

/**
 * Convert AST back to markdown text
 */
export function astToText(node: ASTNode): string {
	if (node.type === 'document') {
		const children = node.children ?? [];

		// Build the text with appropriate separators between blocks
		let result = '';

		for (let i = 0; i < children.length; i++) {
			const child = children[i];
			const childText = astToText(child);

			result += childText;

			// Add newline separator after each block (except the last one)
			// unless the block already ends with a newline
			if (i < children.length - 1 && !childText.endsWith('\n')) {
				result += '\n';
			}
		}

		return result;
	}

	if (node.type === 'paragraph') {
		const children = node.children ?? [];
		// Keep all text nodes, including newlines
		// The document-level logic will handle separation between blocks
		const content = children.map((child) => astToText(child)).join('');
		return content;
	}

	if (node.type === 'heading') {
		const prefix = '#'.repeat(node.level ?? 1);
		const content = node.children?.map((child) => astToText(child)).join('') ?? '';
		// Include trailing newline only if it was present in the original
		const suffix = node.hasTrailingNewline ? '\n' : '';
		return `${prefix} ${content}${suffix}`;
	}

	if (node.type === 'list') {
		return node.children?.map((child) => astToText(child)).join('\n') ?? '';
	}

	if (node.type === 'list-item') {
		const indent = ' '.repeat((node.listLevel ?? 0) * LIST_INDENT_SPACES);
		const content = node.children?.map((child) => astToText(child)).join('') ?? '';

		// Use the list type from the list-item node
		if (node.listType === 'ordered') {
			// For ordered lists, we'd need to track the item number
			// For simplicity, always use "1." for now
			return `${indent}1. ${content}`;
		} else {
			return `${indent}- ${content}`;
		}
	}

	if (node.type === 'code-block') {
		return `\`\`\`${node.language ?? ''}\n${node.text ?? ''}\n\`\`\``;
	}

	if (node.type === 'blockquote') {
		const content = node.children?.map((child) => astToText(child)).join('') ?? '';
		return `> ${content}`;
	}

	if (node.type === 'hr') {
		return '---';
	}

	if (node.type === 'bold') {
		const content = node.children?.map((child) => astToText(child)).join('') ?? '';
		return `**${content}**`;
	}

	if (node.type === 'italic') {
		const content = node.children?.map((child) => astToText(child)).join('') ?? '';
		return `*${content}*`;
	}

	if (node.type === 'strikethrough') {
		const content = node.children?.map((child) => astToText(child)).join('') ?? '';
		return `~~${content}~~`;
	}

	if (node.type === 'code') {
		return `\`${node.text ?? ''}\``;
	}

	if (node.type === 'link') {
		const content = node.children?.map((child) => astToText(child)).join('') ?? '';
		return `[${content}](${node.href ?? ''})`;
	}

	if (node.type === 'wiki-link') {
		const entryId = node.entryId ?? '';
		const displayName = node.children?.[0]?.text ?? '';

		// If display name differs from entry ID, include it in the syntax
		if (displayName && displayName !== entryId) {
			return `[[${entryId}|${displayName}]]`;
		}

		return `[[${entryId}]]`;
	}

	if (node.type === 'text') {
		return node.text ?? '';
	}

	if (node.type === 'line-break') {
		return '\n';
	}

	return '';
}

/**
 * Render AST to HTML with cursor inserted at specified position
 */
export function renderASTWithCursor(
	node: ASTNode,
	cursorPos: number,
	entryTitleMap?: EntryTitleMap,
	wikiSlug?: string
): string {
	let cursorInserted = false;
	let hasRawInlineElement = false; // Track if any inline element is rendered as raw
	const cursorSpan = '<span class="cursor" data-cursor="true"></span>';
	const totalTextLength = astToText(node).length;

	function renderNode(node: ASTNode): string {
		if (node.type === 'document') {
			return node.children?.map((child) => renderNode(child)).join('') ?? '';
		}

		if (node.type === 'paragraph') {
			// Reset raw inline element tracking for this paragraph
			const paragraphHadRawElement = hasRawInlineElement;
			hasRawInlineElement = false;

			// Render paragraph content, splitting at newlines into separate <p> tags
			const content = node.children?.map((child) => renderNode(child)).join('') ?? '';

			// Remember if this paragraph had any raw inline elements
			const currentParagraphHasRaw = hasRawInlineElement;
			// Restore previous state
			hasRawInlineElement = paragraphHadRawElement;

			// If content contains <!-- NL --> markers (from text nodes), split into multiple <p> tags
			if (content.includes('<!-- NL -->')) {
				const lines = content.split('<!-- NL -->');
				const cursorSpan = '<span class="cursor" data-cursor="true"></span>';

				// Check if there's any actual content (not just empty strings and cursor)
				const hasContent = lines.some((line) => {
					const withoutCursor = line.replace(cursorSpan, '');
					return withoutCursor.trim() !== '';
				});

				// Only remove leading empty elements if there's actual content after them
				// "\ntext" -> ["", "text"] -> want ["text"] (remove leading empty)
				// "\n\n" -> ["", "", ""] -> want ["", ""] (keep empty paragraphs)
				if (hasContent) {
					while (lines.length > 0 && lines[0] === '') {
						lines.shift();
					}
				}

				// Handle trailing empty element or cursor-only element
				const lastIdx = lines.length - 1;

				// Check if last element is just the cursor (or empty)
				if (lastIdx > 0 && lines[lastIdx].trim() === cursorSpan) {
					// If the previous line is empty or whitespace-only, merge cursor into it
					// Otherwise, keep cursor separate (for cases like "content\n{cursor}")
					const prevLineContent = lines[lastIdx - 1].replace(cursorSpan, '').trim();
					if (prevLineContent === '') {
						// Merge cursor into the previous line (for cases like empty paragraphs)
						lines[lastIdx - 1] += lines[lastIdx];
						lines.pop();
					}
					// If previous line has content, keep cursor separate
				} else if (lines[lastIdx] === '' && !currentParagraphHasRaw) {
					// Remove trailing empty element only if no inline element is shown as raw
					// (content ended with newline but cursor not in trailing paragraph and not editing raw inline elements)
					lines.pop();
				}

				// If all lines were empty after processing, render a single empty paragraph
				if (lines.length === 0) {
					return '<p></p>';
				}

				return lines.map((line) => `<p>${line}</p>`).join('');
			}

			return `<p>${content}</p>`;
		}

		if (node.type === 'heading') {
			// Check if cursor is anywhere within the heading line (excluding trailing newline)
			// If cursor is on the heading line, show raw markdown text for easier editing
			const headingEndExcludingNewline = node.hasTrailingNewline ? node.end - 1 : node.end;

			if (!cursorInserted && cursorPos >= node.start && cursorPos <= headingEndExcludingNewline) {
				// Render as raw markdown text in a paragraph when cursor is on the heading line
				cursorInserted = true;
				const rawText = astToText(node);
				// Strip the trailing newline from raw text if present
				const rawTextWithoutNewline = node.hasTrailingNewline ? rawText.slice(0, -1) : rawText;

				let html = '<p>';

				// Insert cursor at the correct position within the raw text
				for (let i = 0; i < rawTextWithoutNewline.length; i++) {
					const charPos = node.start + i;
					if (charPos === cursorPos) {
						html += cursorSpan;
					}
					html += escapeHtml(rawTextWithoutNewline[i]);
				}

				// Check if cursor should be at the end
				if (node.start + rawTextWithoutNewline.length === cursorPos) {
					html += cursorSpan;
				}

				html += '</p>';
				return html;
			}

			const content = node.children?.map((child) => renderNode(child)).join('') ?? '';
			return `<h${node.level}>${content}</h${node.level}>`;
		}

		if (node.type === 'list') {
			const tag = node.listType === 'ordered' ? 'ol' : 'ul';
			const items = node.children ?? [];

			// Build nested list structure from flat list items
			function buildNestedList(items: ASTNode[], level: number = 0): string {
				if (items.length === 0) return '';

				let html = `<${tag}>`;
				let i = 0;

				while (i < items.length) {
					const item = items[i];
					const currentLevel = item.listLevel ?? 0;

					// Skip items that are not at the current level
					if (currentLevel < level) {
						break;
					}

					if (currentLevel > level) {
						// This item is deeper than current level, skip it for now
						i++;
						continue;
					}

					// Render list item content
					const content = item.children?.map((child) => renderNode(child)).join('') ?? '';
					html += `<li>${content}</li>`;

					// Look ahead for items at a deeper level immediately following this item
					const nextItem = items[i + 1];
					if (nextItem && (nextItem.listLevel ?? 0) > currentLevel) {
						// Collect all nested items
						const nestedItems: ASTNode[] = [];
						let j = i + 1;
						while (j < items.length && (items[j].listLevel ?? 0) > currentLevel) {
							nestedItems.push(items[j]);
							j++;
						}

						// Create a wrapper list item for the nested list
						html += `<li>`;
						html += buildNestedList(nestedItems, currentLevel + 1);
						html += `</li>`;
						i = j;
					} else {
						i++;
					}
				}

				html += `</${tag}>`;
				return html;
			}

			return buildNestedList(items);
		}

		// This case should be unreachable now as list items are rendered within the list node
		// Keeping it for backwards compatibility if needed
		if (node.type === 'list-item') {
			const content = node.children?.map((child) => renderNode(child)).join('') ?? '';
			return `<li>${content}</li>`;
		}

		if (node.type === 'code-block') {
			const text = node.text ?? '';
			let html = '';
			const nodeTextStart = node.start;

			for (let i = 0; i < text.length; i++) {
				if (!cursorInserted && nodeTextStart + i === cursorPos) {
					html += cursorSpan;
					cursorInserted = true;
				}
				html += escapeHtml(text[i]);
			}

			if (!cursorInserted && nodeTextStart + text.length === cursorPos) {
				html += cursorSpan;
				cursorInserted = true;
			}

			return `<pre><code class="language-${node.language ?? ''}">${html}</code></pre>`;
		}

		if (node.type === 'blockquote') {
			const content = node.children?.map((child) => renderNode(child)).join('') ?? '';
			return `<blockquote><p>${content}</p></blockquote>`;
		}

		if (node.type === 'hr') {
			return '<hr>';
		}

		if (node.type === 'bold') {
			// Check if cursor is anywhere within the bold node (including the ** markers)
			// OR at node.end, but only if we're not at the very end of the document
			// (at the end of document, render normally so user sees the final result)
			const cursorWithinBold = cursorPos >= node.start && cursorPos < node.end;
			const cursorAtEnd = cursorPos === node.end;
			const atDocumentEnd = cursorPos === totalTextLength;
			const shouldShowRaw = cursorWithinBold || (cursorAtEnd && !atDocumentEnd && !cursorInserted);

			if (shouldShowRaw) {
				hasRawInlineElement = true; // Mark that this paragraph has raw inline elements
				const rawText = astToText(node); // This will be "**content**"
				let html = '';

				// Insert cursor at the correct position within the raw text (only if not already inserted)
				for (let i = 0; i < rawText.length; i++) {
					const charPos = node.start + i;
					if (!cursorInserted && charPos === cursorPos) {
						html += cursorSpan;
						cursorInserted = true;
					}
					html += escapeHtml(rawText[i]);
				}

				// Check if cursor should be at the end
				if (!cursorInserted && node.start + rawText.length === cursorPos) {
					html += cursorSpan;
					cursorInserted = true;
				}

				return html;
			}

			const content = node.children?.map((child) => renderNode(child)).join('') ?? '';
			return `<strong>${content}</strong>`;
		}

		if (node.type === 'italic') {
			// Check if cursor is anywhere within the italic node (including the * markers)
			// OR at node.end, but only if we're not at the very end of the document
			// (at the end of document, render normally so user sees the final result)
			const cursorWithinItalic = cursorPos >= node.start && cursorPos < node.end;
			const cursorAtEnd = cursorPos === node.end;
			const atDocumentEnd = cursorPos === totalTextLength;
			const shouldShowRaw =
				cursorWithinItalic || (cursorAtEnd && !atDocumentEnd && !cursorInserted);

			if (shouldShowRaw) {
				hasRawInlineElement = true; // Mark that this paragraph has raw inline elements
				const rawText = astToText(node); // This will be "*content*"
				let html = '';

				// Insert cursor at the correct position within the raw text (only if not already inserted)
				for (let i = 0; i < rawText.length; i++) {
					const charPos = node.start + i;
					if (!cursorInserted && charPos === cursorPos) {
						html += cursorSpan;
						cursorInserted = true;
					}
					html += escapeHtml(rawText[i]);
				}

				// Check if cursor should be at the end
				if (!cursorInserted && node.start + rawText.length === cursorPos) {
					html += cursorSpan;
					cursorInserted = true;
				}

				return html;
			}

			const content = node.children?.map((child) => renderNode(child)).join('') ?? '';
			return `<em>${content}</em>`;
		}

		if (node.type === 'strikethrough') {
			const content = node.children?.map((child) => renderNode(child)).join('') ?? '';
			return `<del>${content}</del>`;
		}

		if (node.type === 'code') {
			const text = node.text ?? '';
			let html = '';
			const nodeTextStart = node.start;

			for (let i = 0; i < text.length; i++) {
				if (!cursorInserted && nodeTextStart + i === cursorPos) {
					html += cursorSpan;
					cursorInserted = true;
				}
				html += escapeHtml(text[i]);
			}

			if (!cursorInserted && nodeTextStart + text.length === cursorPos) {
				html += cursorSpan;
				cursorInserted = true;
			}

			return `<code>${html}</code>`;
		}

		if (node.type === 'link') {
			const content = node.children?.map((child) => renderNode(child)).join('') ?? '';
			return `<a href="${escapeHtml(node.href ?? '')}">${content}</a>`;
		}

		if (node.type === 'wiki-link') {
			const entryId = node.entryId ?? '';
			const entryExists = entryTitleMap ? entryTitleMap.has(entryId) : false;

			if (!entryExists) {
				return `<span class="wiki-link-invalid">Invalid link</span>`;
			}

			// Determine display name:
			// Get the content from children (which is either custom display name or entryId)
			const contentFromChildren = node.children?.[0]?.text ?? entryId;

			// If content equals entryId, it means no custom display name was provided
			// In that case, use the title from the map
			// Otherwise, use the explicit display name
			let displayName = contentFromChildren;
			if (displayName === entryId && entryTitleMap) {
				displayName = entryTitleMap.get(entryId) ?? entryId;
			}

			const href = wikiSlug
				? `/wiki/${escapeHtml(wikiSlug)}/${escapeHtml(entryId)}`
				: `/entries/${escapeHtml(entryId)}`;

			return `<a href="${href}" class="wiki-link">${escapeHtml(displayName)}</a>`;
		}

		if (node.type === 'text') {
			const text = node.text ?? '';
			let html = '';
			const nodeTextStart = node.start;

			for (let i = 0; i < text.length; i++) {
				if (!cursorInserted && nodeTextStart + i === cursorPos) {
					html += cursorSpan;
					cursorInserted = true;
				}

				// Convert newlines to markers that will be split by paragraph rendering
				if (text[i] === '\n') {
					html += '<!-- NL -->';
				} else {
					html += escapeHtml(text[i]);
				}
			}

			// Check if cursor should be at the end of this text node
			// Don't insert cursor at the end if it will be handled by a following bold/italic node
			// (This is a workaround for the cursor boundary issue)
			if (!cursorInserted && nodeTextStart + text.length === cursorPos) {
				html += cursorSpan;
				cursorInserted = true;
			}

			return html;
		}

		if (node.type === 'line-break') {
			if (!cursorInserted && node.start === cursorPos) {
				cursorInserted = true;
				return `${cursorSpan}<br>`;
			}
			return '<br>';
		}

		return '';
	}

	const html = renderNode(node);

	// If cursor wasn't inserted yet and cursorPos is valid (>= 0), add it at the end
	if (!cursorInserted && cursorPos >= 0) {
		// Check if the last rendered element was a heading
		// If so, wrap the cursor in an empty paragraph for better UX
		const lastChild =
			node.type === 'document' && node.children && node.children.length > 0
				? node.children[node.children.length - 1]
				: null;

		if (lastChild?.type === 'heading' && cursorPos >= lastChild.end) {
			return `${html}<p>${cursorSpan}</p>`;
		}

		return html + cursorSpan;
	}

	return html;
}

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}
