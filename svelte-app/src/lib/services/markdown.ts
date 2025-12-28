import { LIST_INDENT_PX_PER_LEVEL } from '$lib/constants';

// Token types for markdown syntax
export type TokenType =
	| 'text'
	| 'bold'
	| 'italic'
	| 'strikethrough'
	| 'code'
	| 'link'
	| 'wiki-link'
	| 'heading'
	| 'list-item'
	| 'blockquote'
	| 'code-block'
	| 'hr';

// Constants
const LIST_INDENT_SPACES = 2; // 2 spaces = 1 level

export interface Token {
	type: TokenType;
	raw: string; // Original markdown text
	content: string; // Text content (without markdown syntax)
	start: number; // Start position in source text
	end: number; // End position in source text
	level?: number; // For headings (1-6) or list depth
	href?: string; // For links
	entryId?: string; // For wiki links - the target entry ID
	language?: string; // For code blocks
	listType?: 'bullet' | 'ordered'; // For list items - type of list
}

export interface ParseResult {
	tokens: Token[];
	html: string;
}

// Type for resolving entry IDs to titles at runtime
export type EntryTitleMap = Map<string, string>;

// Tokenizer class
export class MarkdownTokenizer {
	private text: string;
	private pos: number;
	private tokens: Token[];

	constructor(text: string) {
		this.text = text;
		this.pos = 0;
		this.tokens = [];
	}

	// Main tokenization method
	tokenize(): Token[] {
		this.tokens = [];
		this.pos = 0;

		while (this.pos < this.text.length) {
			// Try to match different token types
			if (
				this.matchHeading() ||
				this.matchCodeBlock() ||
				this.matchHorizontalRule() ||
				this.matchBlockquote() ||
				this.matchListItem() ||
				this.matchInlineSyntax()
			) {
				continue;
			}

			// If nothing matched, consume one character as text
			this.consumeText();
		}

		return this.tokens;
	}

	private peek(offset = 0): string {
		return this.text[this.pos + offset] || '';
	}

	private advance(count = 1): void {
		this.pos += count;
	}

	private isAtLineStart(): boolean {
		return this.pos === 0 || this.text[this.pos - 1] === '\n';
	}

	private matchHeading(): boolean {
		if (!this.isAtLineStart()) return false;

		const match = this.text.slice(this.pos).match(/^(#{1,6})\s*(.*)(?:\n|$)/);
		if (!match) return false;

		const start = this.pos;
		const level = match[1].length;
		const content = match[2];

		// If there's no content, don't create a heading token
		// Instead, consume it as text by not creating a token but still advancing
		if (!content.trim()) {
			// Consume as text token
			this.tokens.push({
				type: 'text',
				raw: match[0],
				content: match[0],
				start,
				end: start + match[0].length
			});
			this.advance(match[0].length);
			return true;
		}

		this.tokens.push({
			type: 'heading',
			raw: match[0],
			content,
			start,
			end: start + match[0].length,
			level
		});

		this.advance(match[0].length);
		return true;
	}

	private matchCodeBlock(): boolean {
		if (!this.isAtLineStart()) return false;

		const match = this.text.slice(this.pos).match(/^```(\w*)\n([\s\S]*?)\n```(?:\n|$)/);
		if (!match) return false;

		const start = this.pos;
		const language = match[1] || '';
		const content = match[2];

		this.tokens.push({
			type: 'code-block',
			raw: match[0],
			content,
			start,
			end: start + match[0].length,
			language
		});

		this.advance(match[0].length);
		return true;
	}

	private matchHorizontalRule(): boolean {
		if (!this.isAtLineStart()) return false;

		const match = this.text.slice(this.pos).match(/^(?:---+|___+|\*\*\*+)(?:\n|$)/);
		if (!match) return false;

		const start = this.pos;

		this.tokens.push({
			type: 'hr',
			raw: match[0],
			content: '',
			start,
			end: start + match[0].length
		});

		this.advance(match[0].length);
		return true;
	}

	private matchBlockquote(): boolean {
		if (!this.isAtLineStart()) return false;

		const match = this.text.slice(this.pos).match(/^>\s+(.+?)(?:\n|$)/);
		if (!match) return false;

		const start = this.pos;
		const content = match[1];

		this.tokens.push({
			type: 'blockquote',
			raw: match[0],
			content,
			start,
			end: start + match[0].length
		});

		this.advance(match[0].length);
		return true;
	}

	private matchListItem(): boolean {
		if (!this.isAtLineStart()) return false;

		const match = this.text.slice(this.pos).match(/^(\s*)(?:[-*+]|\d+\.)\s+(.*?)(?:\n|$)/);
		if (!match) return false;

		const start = this.pos;
		const indent = match[1] || '';
		const content = match[2] || '';
		const level = Math.floor(indent.length / LIST_INDENT_SPACES);

		// Determine if it's a numbered list or bullet list
		const listMarker = this.text.slice(this.pos + indent.length).match(/^([-*+]|\d+\.)/)?.[0];
		const listType = listMarker && /\d+\./.test(listMarker) ? 'ordered' : 'bullet';

		this.tokens.push({
			type: 'list-item',
			raw: match[0],
			content,
			start,
			end: start + match[0].length,
			level,
			listType
		});

		this.advance(match[0].length);
		return true;
	}

	private matchInlineSyntax(): boolean {
		const start = this.pos;

		// Wiki links: [[entryId|display name]] or [[entryId]]
		if (this.peek() === '[' && this.peek(1) === '[') {
			const match = this.text.slice(this.pos).match(/^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
			if (match) {
				const entryId = match[1] ? match[1].trim() : '';
				const displayName = match[2] ? match[2].trim() : entryId;

				// Only create token if entryId is not empty
				if (entryId) {
					this.tokens.push({
						type: 'wiki-link',
						raw: match[0],
						content: displayName,
						start,
						end: start + match[0].length,
						entryId
					});
					this.advance(match[0].length);
					return true;
				}
			}
		}

		// Bold: **text** or __text__
		if (this.peek() === '*' && this.peek(1) === '*') {
			const match = this.text.slice(this.pos).match(/^\*\*(.+?)\*\*/);
			if (match) {
				this.tokens.push({
					type: 'bold',
					raw: match[0],
					content: match[1],
					start,
					end: start + match[0].length
				});
				this.advance(match[0].length);
				return true;
			}
		}

		if (this.peek() === '_' && this.peek(1) === '_') {
			const match = this.text.slice(this.pos).match(/^__(.+?)__/);
			if (match) {
				this.tokens.push({
					type: 'bold',
					raw: match[0],
					content: match[1],
					start,
					end: start + match[0].length
				});
				this.advance(match[0].length);
				return true;
			}
		}

		// Italic: *text* or _text_
		if (this.peek() === '*' && this.peek(1) !== '*') {
			const match = this.text.slice(this.pos).match(/^\*(.+?)\*/);
			if (match) {
				this.tokens.push({
					type: 'italic',
					raw: match[0],
					content: match[1],
					start,
					end: start + match[0].length
				});
				this.advance(match[0].length);
				return true;
			}
		}

		if (this.peek() === '_' && this.peek(1) !== '_') {
			const match = this.text.slice(this.pos).match(/^_(.+?)_/);
			if (match) {
				this.tokens.push({
					type: 'italic',
					raw: match[0],
					content: match[1],
					start,
					end: start + match[0].length
				});
				this.advance(match[0].length);
				return true;
			}
		}

		// Strikethrough: ~~text~~
		if (this.peek() === '~' && this.peek(1) === '~') {
			const match = this.text.slice(this.pos).match(/^~~(.+?)~~/);
			if (match) {
				this.tokens.push({
					type: 'strikethrough',
					raw: match[0],
					content: match[1],
					start,
					end: start + match[0].length
				});
				this.advance(match[0].length);
				return true;
			}
		}

		// Inline code: `text`
		if (this.peek() === '`' && this.peek(1) !== '`') {
			const match = this.text.slice(this.pos).match(/^`(.+?)`/);
			if (match) {
				this.tokens.push({
					type: 'code',
					raw: match[0],
					content: match[1],
					start,
					end: start + match[0].length
				});
				this.advance(match[0].length);
				return true;
			}
		}

		// Links: [text](url)
		if (this.peek() === '[') {
			const match = this.text.slice(this.pos).match(/^\[(.+?)\]\((.+?)\)/);
			if (match) {
				this.tokens.push({
					type: 'link',
					raw: match[0],
					content: match[1],
					start,
					end: start + match[0].length,
					href: match[2]
				});
				this.advance(match[0].length);
				return true;
			}
		}

		return false;
	}

	private consumeText(): void {
		const start = this.pos;
		let content = '';

		// Consume characters until we hit special syntax or end of text
		while (this.pos < this.text.length) {
			const char = this.peek();

			// Check if we're at the start of special syntax at line start
			if (this.isAtLineStart()) {
				// Look ahead to see if this is actually block syntax
				// For headings, check if there's content after # (with or without space)
				if (char === '#' && /^#{1,6}\s*.+/.test(this.text.slice(this.pos))) {
					break;
				}
				if (char === '>' && /^>\s+/.test(this.text.slice(this.pos))) {
					break;
				}
				if (
					(char === '-' || char === '*' || char === '+') &&
					/^[-*+]\s+/.test(this.text.slice(this.pos))
				) {
					break;
				}
				if (/\d/.test(char) && /^\d+\.\s+/.test(this.text.slice(this.pos))) {
					break;
				}
				if (char === '`' && this.text.slice(this.pos).startsWith('```')) {
					break;
				}
			}

			// Check for inline syntax - only break if it can form a complete token
			// Otherwise just consume it as text
			let shouldBreak = false;

			// Don't check for inline syntax if we're at line start with a potential block element
			// This prevents # or * at line start from being mistaken for inline syntax
			const atLineStartWithBlockChar =
				this.isAtLineStart() &&
				(char === '#' ||
					char === '>' ||
					char === '-' ||
					char === '*' ||
					char === '+' ||
					/\d/.test(char));

			if (!atLineStartWithBlockChar) {
				if (char === '[' && this.peek(1) === '[') {
					// Check if there's a closing ]]
					if (/^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/.test(this.text.slice(this.pos))) {
						shouldBreak = true;
					}
				} else if (char === '*' && this.peek(1) === '*') {
					// Check if there's a closing **
					if (/^\*\*(.+?)\*\*/.test(this.text.slice(this.pos))) {
						shouldBreak = true;
					}
				} else if (char === '*' && this.peek(1) !== '*') {
					// Check if there's a closing *
					if (/^\*(.+?)\*/.test(this.text.slice(this.pos))) {
						shouldBreak = true;
					}
				}

				if (char === '_' && this.peek(1) === '_') {
					if (/^__(.+?)__/.test(this.text.slice(this.pos))) {
						shouldBreak = true;
					}
				} else if (char === '_' && this.peek(1) !== '_') {
					if (/^_(.+?)_/.test(this.text.slice(this.pos))) {
						shouldBreak = true;
					}
				}

				if (char === '~' && this.peek(1) === '~' && /^~~(.+?)~~/.test(this.text.slice(this.pos))) {
					shouldBreak = true;
				}

				if (char === '`' && this.peek(1) !== '`' && /^`(.+?)`/.test(this.text.slice(this.pos))) {
					shouldBreak = true;
				}

				if (char === '[' && /^\[(.+?)\]\((.+?)\)/.test(this.text.slice(this.pos))) {
					shouldBreak = true;
				}
			}

			if (shouldBreak) {
				break;
			}

			content += char;
			this.advance();

			// Break at newlines for block-level elements
			if (char === '\n') {
				break;
			}
		}

		if (content) {
			this.tokens.push({
				type: 'text',
				raw: content,
				content,
				start,
				end: this.pos
			});
		}
	}
}

// Parser class that converts tokens to HTML
export class MarkdownParser {
	private tokens: Token[];
	private cursorPos: number;
	private entryTitleMap?: EntryTitleMap;

	constructor(tokens: Token[], cursorPos: number, entryTitleMap?: EntryTitleMap) {
		this.tokens = tokens;
		this.cursorPos = cursorPos;
		this.entryTitleMap = entryTitleMap;
	}

	// Render tokens to HTML, keeping cursor token as plain text
	render(): string {
		let html = '';
		let inParagraph = false;
		let inList = false;
		let currentListType: 'bullet' | 'ordered' | null = null;

		for (let i = 0; i < this.tokens.length; i++) {
			const token = this.tokens[i];

			// For block-level elements, exclude trailing newline from cursor detection
			// This way, if cursor is on the next line, the block element is fully rendered
			const isBlockLevel = ['heading', 'code-block', 'hr', 'blockquote', 'list-item'].includes(
				token.type
			);

			let effectiveEnd = token.end;
			if (isBlockLevel && token.raw.endsWith('\n')) {
				// Exclude the trailing newline from cursor detection
				effectiveEnd = token.end - 1;
			}

			const isCursorToken = this.cursorPos >= token.start && this.cursorPos <= effectiveEnd;

			// Handle list grouping
			if (token.type === 'list-item') {
				// Check if we need to start a new list or close previous list
				if (!inList) {
					// Close paragraph if open
					if (inParagraph) {
						html += '</p>';
						inParagraph = false;
					}
					// Start new list
					currentListType = token.listType ?? 'bullet';
					html += currentListType === 'ordered' ? '<ol>' : '<ul>';
					inList = true;
				} else if (currentListType !== token.listType) {
					// List type changed, close previous list and start new one
					html += currentListType === 'ordered' ? '</ol>' : '</ul>';
					currentListType = token.listType ?? 'bullet';
					html += currentListType === 'ordered' ? '<ol>' : '<ul>';
				}
			} else {
				// Not a list item, close list if open
				if (inList) {
					html += currentListType === 'ordered' ? '</ol>' : '</ul>';
					inList = false;
					currentListType = null;
				}
			}

			if (isBlockLevel && inParagraph) {
				html += '</p>';
				inParagraph = false;
			}

			// Handle paragraph wrapping for text
			if (token.type === 'text' && !inParagraph && !token.raw.trim().startsWith('\n')) {
				html += '<p>';
				inParagraph = true;
			}

			// Close paragraph on newline in text
			if (inParagraph && token.type === 'text' && token.raw.includes('\n')) {
				// Split on newline
				const beforeNewline = token.raw.substring(0, token.raw.indexOf('\n'));
				const afterNewline = token.raw.substring(token.raw.indexOf('\n'));

				if (isCursorToken) {
					html += this.escapeHtml(token.raw);
				} else {
					html += this.escapeHtml(beforeNewline);
				}
				html += '</p>';
				inParagraph = false;

				if (afterNewline.trim() && !isCursorToken) {
					html += '<p>';
					html += this.escapeHtml(afterNewline);
					inParagraph = true;
				}
				continue;
			}

			// Render based on whether cursor is on this token
			if (isCursorToken) {
				html += this.escapeHtml(token.raw);
			} else {
				html += this.renderToken(token);
			}
		}

		// Close any open list
		if (inList) {
			html += currentListType === 'ordered' ? '</ol>' : '</ul>';
		}

		if (inParagraph) {
			html += '</p>';
		}

		return html;
	}

	private renderToken(token: Token): string {
		switch (token.type) {
			case 'heading': {
				// Parse inline content within the heading
				const headingContentHtml = this.parseInlineContent(token.content);
				return `<h${token.level}>${headingContentHtml}</h${token.level}>`;
			}

			case 'bold':
				return `<strong>${this.escapeHtml(token.content)}</strong>`;

			case 'italic':
				return `<em>${this.escapeHtml(token.content)}</em>`;

			case 'strikethrough':
				return `<del>${this.escapeHtml(token.content)}</del>`;

			case 'code':
				return `<code>${this.escapeHtml(token.content)}</code>`;

			case 'code-block':
				return `<pre><code class="language-${token.language}">${this.escapeHtml(token.content)}</code></pre>`;

			case 'link':
				return `<a href="${this.escapeHtml(token.href ?? '')}">${this.escapeHtml(token.content)}</a>`;

			case 'wiki-link': {
				// Wiki links render as links to /entries/[entryId]
				const entryId = token.entryId ?? '';

				// Check if the entry exists in the title map
				const entryExists = this.entryTitleMap ? this.entryTitleMap.has(entryId) : false;

				// If entry doesn't exist, render as invalid link
				if (!entryExists) {
					return `<span class="wiki-link-invalid">Invalid link</span>`;
				}

				// Determine display name:
				// If token.content differs from entryId, it means an explicit display name was provided in the syntax [[id|name]]
				// In that case, use the explicit display name
				// Otherwise, try to get the title from the map, falling back to entry ID
				let displayName = token.content;
				if (displayName === entryId && this.entryTitleMap) {
					displayName = this.entryTitleMap.get(entryId) ?? entryId;
				}

				return `<a href="/entries/${this.escapeHtml(entryId)}" class="wiki-link">${this.escapeHtml(displayName)}</a>`;
			}

			case 'list-item': {
				const indent = token.level ?? 0;
				const marginLeft = indent * LIST_INDENT_PX_PER_LEVEL;
				// Parse inline content within the list item
				const contentHtml = this.parseInlineContent(token.content);
				return `<li style="margin-left: ${marginLeft}px">${contentHtml}</li>`;
			}

			case 'blockquote': {
				// Parse inline content within the blockquote
				const blockquoteContentHtml = this.parseInlineContent(token.content);
				return `<blockquote><p>${blockquoteContentHtml}</p></blockquote>`;
			}

			case 'hr':
				return '<hr>';

			case 'text':
				return this.escapeHtml(token.content);

			default:
				return this.escapeHtml(token.raw);
		}
	}

	private escapeHtml(text: string): string {
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');
	}

	// Parse inline elements from text content
	private parseInlineContent(text: string): string {
		const tokenizer = new MarkdownTokenizer(text);
		const tokens = tokenizer.tokenize();
		let html = '';

		for (const token of tokens) {
			// Only render inline tokens, not block-level ones
			if (
				['text', 'bold', 'italic', 'strikethrough', 'code', 'link', 'wiki-link'].includes(
					token.type
				)
			) {
				html += this.renderToken(token);
			} else {
				// For any block-level tokens that somehow got in, just escape as text
				html += this.escapeHtml(token.raw);
			}
		}

		return html;
	}
}

/**
 * Extracts hashtags from a title string and returns both tags and cleaned title
 */
export function extractTagsFromTitle(title: string): { tags: string[]; cleanedTitle: string } {
	const tagPattern = /#(\w+)/g;
	const tags: string[] = [];
	let match;

	while ((match = tagPattern.exec(title)) !== null) {
		tags.push(match[1]);
	}

	// Remove all hashtags from the title
	const cleanedTitle = title.replace(/#\w+/g, '').trim().replace(/\s+/g, ' ');

	return { tags, cleanedTitle };
}

// Main export function
export function parseMarkdown(
	text: string,
	cursorPos: number,
	entryTitleMap?: EntryTitleMap
): ParseResult {
	const tokenizer = new MarkdownTokenizer(text);
	const tokens = tokenizer.tokenize();
	const parser = new MarkdownParser(tokens, cursorPos, entryTitleMap);
	const html = parser.render();

	return { tokens, html };
}
