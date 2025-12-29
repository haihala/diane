import { LIST_INDENT_PX_PER_LEVEL } from '$lib/constants';
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
			['text', 'bold', 'italic', 'strikethrough', 'code', 'link', 'wiki-link'].includes(
				token.type
			)
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
	
	return nodes.length > 0 ? nodes : [
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

		// Build the text directly, preserving empty paragraphs as additional newlines
		let result = '';
		let needsSeparator = false;

		for (let i = 0; i < children.length; i++) {
			const child = children[i];
			const text = astToText(child);
			const trimmedText = text.trim();

			// For non-empty blocks (blocks with actual content)
			if (trimmedText !== '') {
				if (needsSeparator) {
					// If the block starts with newline(s), we need fewer separator newlines
					const leadingNewlines = text.match(/^\n*/)?.[0].length ?? 0;
					const separatorNeeded = Math.max(0, 2 - leadingNewlines);
					result += '\n'.repeat(separatorNeeded);
				}
				result += text;
				needsSeparator = true;
			} else if (text !== '') {
				// Block with only whitespace/newlines
				// These act as extra spacing between blocks
				if (needsSeparator) {
					// Add one newline for block separation, plus the content
					result = `${result}\n${text}`;
					// Don't need separator after this since the whitespace includes separation
					needsSeparator = false;
				} else {
					// At the start, just add the whitespace
					result += text;
					needsSeparator = false;
				}
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
		return `${prefix} ${content}`;
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
	const cursorSpan = '<span class="cursor" data-cursor="true"></span>';

	function renderNode(node: ASTNode): string {
		if (node.type === 'document') {
			return node.children?.map((child) => renderNode(child)).join('') ?? '';
		}

		if (node.type === 'paragraph') {
			// Render paragraph content, splitting at newlines into separate <p> tags
			const content = node.children?.map((child) => renderNode(child)).join('') ?? '';

			// Special case: if paragraph contains only newlines/whitespace and cursor,
			// render as a single <p> tag to avoid creating extra blank lines
			const contentWithoutCursor = content.replace(/<span class="cursor"[^>]*><\/span>/g, '');
			const isOnlyNewlinesAndWhitespace =
				contentWithoutCursor.replace(/<!-- NL -->/g, '').trim() === '';

			if (isOnlyNewlinesAndWhitespace) {
				// Just render as single <p> with cursor
				// Remove the newline markers since we're not splitting
				const cleanContent = content.replace(/<!-- NL -->/g, '');
				return `<p>${cleanContent}</p>`;
			}

			// If content contains <!-- NL --> markers (from text nodes), split into multiple <p> tags
			if (content.includes('<!-- NL -->')) {
				const lines = content.split('<!-- NL -->');

				// Remove the last empty element if the paragraph ends with a newline
				// e.g., "text\n" splits to ["text", ""] - we want just ["text"]
				// But "\n" splits to ["", ""] - we want just [""]
				// And "text\nmore" splits to ["text", "more"] - keep both
				if (lines.length > 1 && lines[lines.length - 1] === '') {
					lines.pop();
				}

				return lines.map((line) => `<p>${line}</p>`).join('');
			}

			return `<p>${content}</p>`;
		}

		if (node.type === 'heading') {
			// Check if cursor is before the first child (in the markdown syntax area like "# ")
			const firstChild = node.children?.[0];
			if (
				!cursorInserted &&
				firstChild &&
				cursorPos >= node.start &&
				cursorPos < firstChild.start
			) {
				// Place cursor at the beginning of the heading content
				cursorInserted = true;
				const content = node.children?.map((child) => renderNode(child)).join('') ?? '';
				return `<h${node.level}>${cursorSpan}${content}</h${node.level}>`;
			}

			const content = node.children?.map((child) => renderNode(child)).join('') ?? '';
			return `<h${node.level}>${content}</h${node.level}>`;
		}

		if (node.type === 'list') {
			const tag = node.listType === 'ordered' ? 'ol' : 'ul';
			const items = node.children?.map((child) => renderNode(child)).join('') ?? '';
			return `<${tag}>${items}</${tag}>`;
		}

		if (node.type === 'list-item') {
			const marginLeft = (node.listLevel ?? 0) * LIST_INDENT_PX_PER_LEVEL;
			const content = node.children?.map((child) => renderNode(child)).join('') ?? '';
			return `<li style="margin-left: ${marginLeft}px">${content}</li>`;
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
			const content = node.children?.map((child) => renderNode(child)).join('') ?? '';
			return `<strong>${content}</strong>`;
		}

		if (node.type === 'italic') {
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
