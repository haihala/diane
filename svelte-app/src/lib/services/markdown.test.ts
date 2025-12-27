import { describe, it, expect } from 'vitest';
import { parseMarkdown, MarkdownTokenizer, MarkdownParser } from './markdown';

describe('MarkdownTokenizer', () => {
	describe('Headings', () => {
		it('should tokenize h1 heading', () => {
			const tokenizer = new MarkdownTokenizer('# Heading 1\n');
			const tokens = tokenizer.tokenize();
			expect(tokens).toHaveLength(1);
			expect(tokens[0]).toMatchObject({
				type: 'heading',
				content: 'Heading 1',
				level: 1,
				raw: '# Heading 1\n'
			});
		});

		it('should tokenize h2 heading', () => {
			const tokenizer = new MarkdownTokenizer('## Heading 2\n');
			const tokens = tokenizer.tokenize();
			expect(tokens[0]).toMatchObject({
				type: 'heading',
				level: 2,
				content: 'Heading 2'
			});
		});

		it('should tokenize h6 heading', () => {
			const tokenizer = new MarkdownTokenizer('###### Heading 6\n');
			const tokens = tokenizer.tokenize();
			expect(tokens[0]).toMatchObject({
				type: 'heading',
				level: 6,
				content: 'Heading 6'
			});
		});

		it('should not tokenize heading without space', () => {
			const tokenizer = new MarkdownTokenizer('#NoSpace\n');
			const tokens = tokenizer.tokenize();
			expect(tokens[0]).toMatchObject({
				type: 'heading',
				content: 'NoSpace',
				level: 1
			});
		});

		it('should tokenize h2 without space', () => {
			const tokenizer = new MarkdownTokenizer('##NoSpace\n');
			const tokens = tokenizer.tokenize();
			expect(tokens[0]).toMatchObject({
				type: 'heading',
				content: 'NoSpace',
				level: 2
			});
		});

		it('should only tokenize headings at line start', () => {
			const tokenizer = new MarkdownTokenizer('text # not a heading\n');
			const tokens = tokenizer.tokenize();
			expect(tokens.every((t) => t.type !== 'heading')).toBe(true);
		});

		it('should handle single hashtag without content as text', () => {
			const tokenizer = new MarkdownTokenizer('#');
			const tokens = tokenizer.tokenize();
			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe('text');
			expect(tokens[0].content).toBe('#');
		});

		it('should handle hashtag without space at line start as heading', () => {
			const tokenizer = new MarkdownTokenizer('#NoSpace\n');
			const tokens = tokenizer.tokenize();
			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe('heading');
			expect(tokens[0].content).toBe('NoSpace');
		});

		it('should handle multiple hashtags without space as heading', () => {
			const tokenizer = new MarkdownTokenizer('###NotAHeading');
			const tokens = tokenizer.tokenize();
			expect(tokens[0].type).toBe('heading');
			expect(tokens[0].level).toBe(3);
			expect(tokens[0].content).toBe('NotAHeading');
		});

		it('should handle heading syntax with space but no content as text', () => {
			const tokenizer = new MarkdownTokenizer('# ');
			const tokens = tokenizer.tokenize();
			expect(tokens.every((t) => t.type === 'text')).toBe(true);
		});

		it('should handle h2 syntax with space but no content as text', () => {
			const tokenizer = new MarkdownTokenizer('## ');
			const tokens = tokenizer.tokenize();
			expect(tokens.every((t) => t.type === 'text')).toBe(true);
		});

		it('should handle h3 syntax with space but no content as text', () => {
			const tokenizer = new MarkdownTokenizer('### ');
			const tokens = tokenizer.tokenize();
			expect(tokens.every((t) => t.type === 'text')).toBe(true);
		});

		it('should handle heading with only whitespace after # as text', () => {
			const tokenizer = new MarkdownTokenizer('##   \n');
			const tokens = tokenizer.tokenize();
			expect(tokens.every((t) => t.type === 'text')).toBe(true);
		});
	});

	describe('Inline Formatting', () => {
		it('should tokenize bold with **', () => {
			const tokenizer = new MarkdownTokenizer('**bold text**');
			const tokens = tokenizer.tokenize();
			expect(tokens[0]).toMatchObject({
				type: 'bold',
				content: 'bold text',
				raw: '**bold text**'
			});
		});

		it('should tokenize bold with __', () => {
			const tokenizer = new MarkdownTokenizer('__bold text__');
			const tokens = tokenizer.tokenize();
			expect(tokens[0]).toMatchObject({
				type: 'bold',
				content: 'bold text'
			});
		});

		it('should tokenize italic with *', () => {
			const tokenizer = new MarkdownTokenizer('*italic text*');
			const tokens = tokenizer.tokenize();
			expect(tokens[0]).toMatchObject({
				type: 'italic',
				content: 'italic text',
				raw: '*italic text*'
			});
		});

		it('should tokenize italic with _', () => {
			const tokenizer = new MarkdownTokenizer('_italic text_');
			const tokens = tokenizer.tokenize();
			expect(tokens[0]).toMatchObject({
				type: 'italic',
				content: 'italic text'
			});
		});

		it('should tokenize strikethrough', () => {
			const tokenizer = new MarkdownTokenizer('~~strikethrough~~');
			const tokens = tokenizer.tokenize();
			expect(tokens[0]).toMatchObject({
				type: 'strikethrough',
				content: 'strikethrough'
			});
		});

		it('should tokenize inline code', () => {
			const tokenizer = new MarkdownTokenizer('`code`');
			const tokens = tokenizer.tokenize();
			expect(tokens[0]).toMatchObject({
				type: 'code',
				content: 'code',
				raw: '`code`'
			});
		});

		it('should handle unpaired asterisks as text', () => {
			const tokenizer = new MarkdownTokenizer('single * asterisk');
			const tokens = tokenizer.tokenize();
			expect(tokens.every((t) => t.type === 'text')).toBe(true);
		});

		it('should handle unpaired underscore as text', () => {
			const tokenizer = new MarkdownTokenizer('single _ underscore');
			const tokens = tokenizer.tokenize();
			expect(tokens.every((t) => t.type === 'text')).toBe(true);
		});

		it('should handle unpaired backtick as text', () => {
			const tokenizer = new MarkdownTokenizer('single ` backtick');
			const tokens = tokenizer.tokenize();
			expect(tokens.every((t) => t.type === 'text')).toBe(true);
		});
	});

	describe('Links', () => {
		it('should tokenize links', () => {
			const tokenizer = new MarkdownTokenizer('[link text](https://example.com)');
			const tokens = tokenizer.tokenize();
			expect(tokens[0]).toMatchObject({
				type: 'link',
				content: 'link text',
				href: 'https://example.com'
			});
		});

		it('should handle incomplete links as text', () => {
			const tokenizer = new MarkdownTokenizer('[link text](incomplete');
			const tokens = tokenizer.tokenize();
			expect(tokens.every((t) => t.type === 'text')).toBe(true);
		});
	});

	describe('Code Blocks', () => {
		it('should tokenize code blocks', () => {
			const tokenizer = new MarkdownTokenizer('```js\nconst x = 1;\n```\n');
			const tokens = tokenizer.tokenize();
			expect(tokens[0]).toMatchObject({
				type: 'code-block',
				content: 'const x = 1;',
				language: 'js'
			});
		});

		it('should tokenize code blocks without language', () => {
			const tokenizer = new MarkdownTokenizer('```\ncode here\n```\n');
			const tokens = tokenizer.tokenize();
			expect(tokens[0]).toMatchObject({
				type: 'code-block',
				content: 'code here',
				language: ''
			});
		});
	});

	describe('Lists and Blockquotes', () => {
		describe('Lists', () => {
			it('should tokenize list items with -', () => {
				const tokenizer = new MarkdownTokenizer('- item\n');
				const tokens = tokenizer.tokenize();
				expect(tokens[0]).toMatchObject({
					type: 'list-item',
					content: 'item'
				});
			});

			it('should tokenize list items with *', () => {
				const tokenizer = new MarkdownTokenizer('* item\n');
				const tokens = tokenizer.tokenize();
				expect(tokens[0]).toMatchObject({
					type: 'list-item',
					content: 'item'
				});
			});

			it('should tokenize numbered list items', () => {
				const tokenizer = new MarkdownTokenizer('1. item\n');
				const tokens = tokenizer.tokenize();
				expect(tokens[0]).toMatchObject({
					type: 'list-item',
					content: 'item'
				});
			});

			it('should handle empty list item "- "', () => {
				const tokenizer = new MarkdownTokenizer('- \n');
				const tokens = tokenizer.tokenize();
				expect(tokens[0]).toMatchObject({
					type: 'list-item',
					content: ''
				});
			});

			it('should handle list item with just dash "- " without newline', () => {
				const tokenizer = new MarkdownTokenizer('- ');
				const tokens = tokenizer.tokenize();
				expect(tokens[0]).toMatchObject({
					type: 'list-item',
					content: ''
				});
			});
		});

		it('should tokenize blockquotes', () => {
			const tokenizer = new MarkdownTokenizer('> quote\n');
			const tokens = tokenizer.tokenize();
			expect(tokens[0]).toMatchObject({
				type: 'blockquote',
				content: 'quote'
			});
		});

		it('should handle single > without space as text', () => {
			const tokenizer = new MarkdownTokenizer('>');
			const tokens = tokenizer.tokenize();
			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe('text');
		});

		it('should handle - without space as text', () => {
			const tokenizer = new MarkdownTokenizer('-');
			const tokens = tokenizer.tokenize();
			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe('text');
		});

		it('should handle * at line start without space as text', () => {
			const tokenizer = new MarkdownTokenizer('*NoSpace');
			const tokens = tokenizer.tokenize();
			expect(tokens.every((t) => t.type === 'text')).toBe(true);
		});
	});

	describe('Horizontal Rules', () => {
		it('should tokenize hr with ---', () => {
			const tokenizer = new MarkdownTokenizer('---\n');
			const tokens = tokenizer.tokenize();
			expect(tokens[0]).toMatchObject({
				type: 'hr'
			});
		});

		it('should tokenize hr with ***', () => {
			const tokenizer = new MarkdownTokenizer('***\n');
			const tokens = tokenizer.tokenize();
			expect(tokens[0]).toMatchObject({
				type: 'hr'
			});
		});

		it('should tokenize hr with ___', () => {
			const tokenizer = new MarkdownTokenizer('___\n');
			const tokens = tokenizer.tokenize();
			expect(tokens[0]).toMatchObject({
				type: 'hr'
			});
		});
	});

	describe('Mixed Content', () => {
		it('should tokenize mixed inline formatting', () => {
			const tokenizer = new MarkdownTokenizer('**bold** and *italic*');
			const tokens = tokenizer.tokenize();
			expect(tokens).toHaveLength(3);
			expect(tokens[0].type).toBe('bold');
			expect(tokens[1].type).toBe('text');
			expect(tokens[2].type).toBe('italic');
		});

		it('should tokenize paragraph with inline formatting', () => {
			const tokenizer = new MarkdownTokenizer('This is **bold** text\n');
			const tokens = tokenizer.tokenize();
			expect(tokens.length).toBeGreaterThan(1);
			expect(tokens.some((t) => t.type === 'bold')).toBe(true);
			expect(tokens.some((t) => t.type === 'text')).toBe(true);
		});
	});

	describe('Token Positions', () => {
		it('should track correct start and end positions', () => {
			const tokenizer = new MarkdownTokenizer('hello **world**');
			const tokens = tokenizer.tokenize();
			expect(tokens[0]).toMatchObject({
				type: 'text',
				start: 0,
				end: 6
			});
			expect(tokens[1]).toMatchObject({
				type: 'bold',
				start: 6,
				end: 15
			});
		});
	});
});

describe('MarkdownParser', () => {
	describe('Basic Rendering', () => {
		it('should render heading as h1', () => {
			const tokenizer = new MarkdownTokenizer('# Title\n');
			const tokens = tokenizer.tokenize();
			const parser = new MarkdownParser(tokens, -1);
			const html = parser.render();
			expect(html).toContain('<h1>Title</h1>');
		});

		it('should render bold as strong', () => {
			const tokenizer = new MarkdownTokenizer('**bold**');
			const tokens = tokenizer.tokenize();
			const parser = new MarkdownParser(tokens, -1);
			const html = parser.render();
			expect(html).toContain('<strong>bold</strong>');
		});

		it('should render italic as em', () => {
			const tokenizer = new MarkdownTokenizer('*italic*');
			const tokens = tokenizer.tokenize();
			const parser = new MarkdownParser(tokens, -1);
			const html = parser.render();
			expect(html).toContain('<em>italic</em>');
		});

		it('should render strikethrough as del', () => {
			const tokenizer = new MarkdownTokenizer('~~strikethrough~~');
			const tokens = tokenizer.tokenize();
			const parser = new MarkdownParser(tokens, -1);
			const html = parser.render();
			expect(html).toContain('<del>strikethrough</del>');
		});

		it('should render inline code', () => {
			const tokenizer = new MarkdownTokenizer('`code`');
			const tokens = tokenizer.tokenize();
			const parser = new MarkdownParser(tokens, -1);
			const html = parser.render();
			expect(html).toContain('<code>code</code>');
		});

		it('should render code blocks', () => {
			const tokenizer = new MarkdownTokenizer('```js\ncode\n```\n');
			const tokens = tokenizer.tokenize();
			const parser = new MarkdownParser(tokens, -1);
			const html = parser.render();
			expect(html).toContain('<pre><code');
			expect(html).toContain('language-js');
			expect(html).toContain('code');
		});

		it('should render links', () => {
			const tokenizer = new MarkdownTokenizer('[text](url)');
			const tokens = tokenizer.tokenize();
			const parser = new MarkdownParser(tokens, -1);
			const html = parser.render();
			expect(html).toContain('<a href="url">text</a>');
		});

		it('should render list items', () => {
			const tokenizer = new MarkdownTokenizer('- item\n');
			const tokens = tokenizer.tokenize();
			const parser = new MarkdownParser(tokens, -1);
			const html = parser.render();
			expect(html).toContain('<li');
			expect(html).toContain('>item</li>');
		});

		it('should render blockquotes', () => {
			const tokenizer = new MarkdownTokenizer('> quote\n');
			const tokens = tokenizer.tokenize();
			const parser = new MarkdownParser(tokens, -1);
			const html = parser.render();
			expect(html).toContain('<blockquote>');
			expect(html).toContain('quote');
		});

		it('should render horizontal rules', () => {
			const tokenizer = new MarkdownTokenizer('---\n');
			const tokens = tokenizer.tokenize();
			const parser = new MarkdownParser(tokens, -1);
			const html = parser.render();
			expect(html).toContain('<hr>');
		});
	});

	describe('Paragraph Wrapping', () => {
		it('should wrap text in paragraphs', () => {
			const tokenizer = new MarkdownTokenizer('plain text');
			const tokens = tokenizer.tokenize();
			const parser = new MarkdownParser(tokens, -1);
			const html = parser.render();
			expect(html).toContain('<p>');
			expect(html).toContain('</p>');
		});

		it('should not wrap headings in paragraphs', () => {
			const tokenizer = new MarkdownTokenizer('# Title\n');
			const tokens = tokenizer.tokenize();
			const parser = new MarkdownParser(tokens, -1);
			const html = parser.render();
			expect(html).not.toMatch(/<p>.*<h1>/);
		});

		it('should close paragraphs before block elements', () => {
			const tokenizer = new MarkdownTokenizer('text\n# Heading\n');
			const tokens = tokenizer.tokenize();
			const parser = new MarkdownParser(tokens, -1);
			const html = parser.render();
			expect(html).toContain('</p>');
			expect(html).toContain('<h1>');
		});
	});

	describe('HTML Escaping', () => {
		it('should escape < and >', () => {
			const tokenizer = new MarkdownTokenizer('<script>alert("xss")</script>');
			const tokens = tokenizer.tokenize();
			const parser = new MarkdownParser(tokens, -1);
			const html = parser.render();
			expect(html).toContain('&lt;');
			expect(html).toContain('&gt;');
			expect(html).not.toContain('<script>');
		});

		it('should escape & characters', () => {
			const tokenizer = new MarkdownTokenizer('foo & bar');
			const tokens = tokenizer.tokenize();
			const parser = new MarkdownParser(tokens, -1);
			const html = parser.render();
			expect(html).toContain('&amp;');
		});

		it('should escape quotes', () => {
			const tokenizer = new MarkdownTokenizer('"quoted" and \'single\'');
			const tokens = tokenizer.tokenize();
			const parser = new MarkdownParser(tokens, -1);
			const html = parser.render();
			expect(html).toContain('&quot;');
			expect(html).toContain('&#039;');
		});
	});
});

describe('Cursor-Aware Rendering', () => {
	describe('Cursor on Token', () => {
		it('should render raw markdown when cursor is on bold token', () => {
			const text = '**bold text**';
			const tokenizer = new MarkdownTokenizer(text);
			const tokens = tokenizer.tokenize();
			const parser = new MarkdownParser(tokens, 2); // cursor inside **
			const html = parser.render();
			expect(html).toContain('**bold text**');
			expect(html).not.toContain('<strong>');
		});

		it('should render raw markdown when cursor is at start of token', () => {
			const text = '**bold**';
			const tokenizer = new MarkdownTokenizer(text);
			const tokens = tokenizer.tokenize();
			// Token starts at position 0
			const parser = new MarkdownParser(tokens, 0);
			const html = parser.render();
			expect(html).toContain('**bold**');
			expect(html).not.toContain('<strong>');
		});

		it('should render raw markdown when cursor is at end of token', () => {
			const text = '**bold**';
			const tokenizer = new MarkdownTokenizer(text);
			const tokens = tokenizer.tokenize();
			// Token ends at position 8
			const parser = new MarkdownParser(tokens, 8);
			const html = parser.render();
			expect(html).toContain('**bold**');
			expect(html).not.toContain('<strong>');
		});

		it('should render raw markdown when cursor is on italic token', () => {
			const text = '*italic*';
			const tokenizer = new MarkdownTokenizer(text);
			const tokens = tokenizer.tokenize();
			const parser = new MarkdownParser(tokens, 3); // cursor inside italic
			const html = parser.render();
			expect(html).toContain('*italic*');
			expect(html).not.toContain('<em>');
		});

		it('should render raw markdown when cursor is on heading', () => {
			const text = '# Heading\n';
			const tokenizer = new MarkdownTokenizer(text);
			const tokens = tokenizer.tokenize();
			const parser = new MarkdownParser(tokens, 2); // cursor on heading
			const html = parser.render();
			expect(html).toContain('# Heading');
			expect(html).not.toContain('<h1>');
		});

		it('should render heading as HTML when cursor is on next line', () => {
			const text = '# Heading\nNext line';
			const tokenizer = new MarkdownTokenizer(text);
			const tokens = tokenizer.tokenize();
			// Token for heading ends at position 10 (includes \n)
			// Cursor at position 10 is on the next line
			const parser = new MarkdownParser(tokens, 10);
			const html = parser.render();
			expect(html).toContain('<h1>Heading</h1>');
			expect(html).not.toContain('# Heading');
		});

		it('should render heading as HTML when cursor is after the newline', () => {
			const text = '# Heading\n';
			const tokenizer = new MarkdownTokenizer(text);
			const tokens = tokenizer.tokenize();
			// Cursor right after the newline
			const parser = new MarkdownParser(tokens, 10);
			const html = parser.render();
			expect(html).toContain('<h1>Heading</h1>');
			expect(html).not.toContain('# Heading\n');
		});

		it('should render code block as HTML when cursor is on next line', () => {
			const text = '```\ncode\n```\nNext line';
			const tokenizer = new MarkdownTokenizer(text);
			const tokens = tokenizer.tokenize();
			// Cursor on next line after code block
			const codeBlockEndPos = text.indexOf('Next');
			const parser = new MarkdownParser(tokens, codeBlockEndPos);
			const html = parser.render();
			expect(html).toContain('<pre><code');
			expect(html).not.toContain('```');
		});

		it('should render blockquote as HTML when cursor is on next line', () => {
			const text = '> quote\nNext line';
			const tokenizer = new MarkdownTokenizer(text);
			const tokens = tokenizer.tokenize();
			// Cursor on next line
			const parser = new MarkdownParser(tokens, 8);
			const html = parser.render();
			expect(html).toContain('<blockquote>');
			expect(html).not.toContain('> quote');
		});

		it('should render list item as HTML when cursor is on next line', () => {
			const text = '- item\nNext line';
			const tokenizer = new MarkdownTokenizer(text);
			const tokens = tokenizer.tokenize();
			// Cursor on next line
			const parser = new MarkdownParser(tokens, 7);
			const html = parser.render();
			expect(html).toContain('<li');
			expect(html).toContain('>item</li>');
			expect(html).not.toContain('- item');
		});

		it('should render raw markdown when cursor is on code block', () => {
			const text = '```\ncode\n```\n';
			const tokenizer = new MarkdownTokenizer(text);
			const tokens = tokenizer.tokenize();
			const parser = new MarkdownParser(tokens, 5); // cursor in code block
			const html = parser.render();
			expect(html).toContain('```');
		});
	});

	describe('Cursor not on Token', () => {
		it('should render HTML when cursor is not on token', () => {
			const text = 'before **bold** after';
			const tokenizer = new MarkdownTokenizer(text);
			const tokens = tokenizer.tokenize();
			const parser = new MarkdownParser(tokens, 0); // cursor at start, before bold token
			const html = parser.render();
			expect(html).toContain('<strong>bold</strong>');
			expect(html).not.toContain('**bold**');
		});

		it('should render HTML when cursor is just after end of token', () => {
			const text = '**bold** after';
			const tokenizer = new MarkdownTokenizer(text);
			const tokens = tokenizer.tokenize();
			// Token ends at position 8, cursor at 9 (just after)
			const parser = new MarkdownParser(tokens, 9);
			const html = parser.render();
			expect(html).toContain('<strong>bold</strong>');
			expect(html).not.toContain('**bold**');
		});

		it('should render HTML when cursor is way past end', () => {
			const text = '**bold**';
			const tokenizer = new MarkdownTokenizer(text);
			const tokens = tokenizer.tokenize();
			const parser = new MarkdownParser(tokens, 100); // cursor past end
			const html = parser.render();
			expect(html).toContain('<strong>bold</strong>');
		});
	});

	describe('Mixed Rendering', () => {
		it('should render only cursor token as raw, others as HTML', () => {
			const text = '**bold** and *italic*';
			const tokenizer = new MarkdownTokenizer(text);
			const tokens = tokenizer.tokenize();
			const parser = new MarkdownParser(tokens, 2); // cursor on bold
			const html = parser.render();
			expect(html).toContain('**bold**');
			expect(html).toContain('<em>italic</em>');
		});

		it('should switch rendering based on cursor position', () => {
			const text = '**first** **second**';
			const tokenizer = new MarkdownTokenizer(text);
			const tokens = tokenizer.tokenize();

			// Cursor on first token
			const parser1 = new MarkdownParser(tokens, 2);
			const html1 = parser1.render();
			expect(html1).toContain('**first**');
			expect(html1).toContain('<strong>second</strong>');

			// Cursor on second token
			const parser2 = new MarkdownParser(tokens, 12);
			const html2 = parser2.render();
			expect(html2).toContain('<strong>first</strong>');
			expect(html2).toContain('**second**');
		});
	});
});

describe('parseMarkdown Integration', () => {
	it('should tokenize and parse in one call', () => {
		const result = parseMarkdown('**bold**', -1);
		expect(result.tokens).toBeDefined();
		expect(result.html).toBeDefined();
		expect(result.html).toContain('<strong>bold</strong>');
	});

	it('should handle cursor-aware rendering', () => {
		const result = parseMarkdown('**bold**', 2);
		expect(result.html).toContain('**bold**');
		expect(result.html).not.toContain('<strong>');
	});

	it('should handle complex mixed content', () => {
		const text = '# Title\n\nThis is **bold** and *italic* text with `code`.\n';
		const result = parseMarkdown(text, -1);
		expect(result.html).toContain('<h1>');
		expect(result.html).toContain('<strong>');
		expect(result.html).toContain('<em>');
		expect(result.html).toContain('<code>');
	});

	it('should handle empty string', () => {
		const result = parseMarkdown('', 0);
		expect(result.tokens).toHaveLength(0);
		expect(result.html).toBe('');
	});

	it('should handle plain text', () => {
		const result = parseMarkdown('plain text', -1);
		expect(result.tokens).toHaveLength(1);
		expect(result.tokens[0].type).toBe('text');
	});
});

describe('Wiki Links', () => {
	describe('Tokenization', () => {
		it('should tokenize wiki link with display name', () => {
			const tokenizer = new MarkdownTokenizer('[[entry-id-123|My Entry]]');
			const tokens = tokenizer.tokenize();
			expect(tokens).toHaveLength(1);
			expect(tokens[0]).toMatchObject({
				type: 'wiki-link',
				content: 'My Entry',
				entryId: 'entry-id-123',
				raw: '[[entry-id-123|My Entry]]'
			});
		});

		it('should tokenize wiki link without display name', () => {
			const tokenizer = new MarkdownTokenizer('[[entry-id-123]]');
			const tokens = tokenizer.tokenize();
			expect(tokens).toHaveLength(1);
			expect(tokens[0]).toMatchObject({
				type: 'wiki-link',
				content: 'entry-id-123',
				entryId: 'entry-id-123',
				raw: '[[entry-id-123]]'
			});
		});

		it('should tokenize wiki link in mixed content', () => {
			const tokenizer = new MarkdownTokenizer('Check out [[entry-123|this entry]] for more.');
			const tokens = tokenizer.tokenize();
			expect(tokens).toHaveLength(3);
			expect(tokens[0].type).toBe('text');
			expect(tokens[1].type).toBe('wiki-link');
			expect(tokens[2].type).toBe('text');
		});
	});

	describe('Rendering', () => {
		it('should render wiki link with display name from link syntax', () => {
			const entryMap = new Map([['entry-123', 'Entry Title From Map']]);
			const result = parseMarkdown('[[entry-123|My Entry Title]]', -1, entryMap);
			expect(result.html).toContain(
				'<a href="/entries/entry-123" class="wiki-link">My Entry Title</a>'
			);
		});

		it('should render wiki link with ID when no display name provided', () => {
			const entryMap = new Map([['entry-123', 'Some Title']]);
			const result = parseMarkdown('[[entry-123]]', -1, entryMap);
			// When no explicit display name is provided, it should use the title from the map
			expect(result.html).toContain(
				'<a href="/entries/entry-123" class="wiki-link">Some Title</a>'
			);
		});

		it('should render wiki link in paragraph with display name', () => {
			const entryMap = new Map([['entry-123', 'Title From Map']]);
			const result = parseMarkdown('Check [[entry-123|Important Note]] out.', -1, entryMap);
			expect(result.html).toContain('<p>');
			expect(result.html).toContain('Check ');
			expect(result.html).toContain(
				'<a href="/entries/entry-123" class="wiki-link">Important Note</a>'
			);
			expect(result.html).toContain(' out.</p>');
		});

		it('should handle cursor on wiki link', () => {
			const entryMap = new Map([['entry-123', 'Some Title']]);
			const result = parseMarkdown('[[entry-123]]', 5, entryMap);
			expect(result.html).toBe('[[entry-123]]');
		});

		it('should use display name from link syntax', () => {
			const entryMap = new Map([['entry-123', 'Title From Map']]);
			const result = parseMarkdown('[[entry-123|Custom Title]]', -1, entryMap);
			expect(result.html).toContain(
				'<a href="/entries/entry-123" class="wiki-link">Custom Title</a>'
			);
		});
	});
});
