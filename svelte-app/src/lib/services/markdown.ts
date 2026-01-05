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
