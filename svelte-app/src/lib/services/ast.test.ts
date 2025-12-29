import { describe, it, expect } from 'vitest';
import { MarkdownTokenizer } from './markdown';
import { tokensToAST, astToText, renderASTWithCursor } from './ast';

describe('AST Generation', () => {
	it('should create AST from empty text', () => {
		const tokenizer = new MarkdownTokenizer('');
		const tokens = tokenizer.tokenize();
		const ast = tokensToAST(tokens);

		expect(ast.type).toBe('document');
		expect(ast.children).toEqual([]);
	});

	it('should create AST from plain text', () => {
		const tokenizer = new MarkdownTokenizer('Hello world');
		const tokens = tokenizer.tokenize();
		const ast = tokensToAST(tokens);

		expect(ast.type).toBe('document');
		expect(ast.children).toHaveLength(1);
		expect(ast.children![0].type).toBe('paragraph');
	});

	it('should create AST from bullet list', () => {
		const tokenizer = new MarkdownTokenizer('- item');
		const tokens = tokenizer.tokenize();
		const ast = tokensToAST(tokens);

		expect(ast.type).toBe('document');
		expect(ast.children).toHaveLength(1);
		expect(ast.children![0].type).toBe('list');
		expect(ast.children![0].listType).toBe('bullet');
		expect(ast.children![0].children).toHaveLength(1);
		expect(ast.children![0].children![0].type).toBe('list-item');
		expect(ast.children![0].children![0].listType).toBe('bullet');
	});

	it('should create AST from ordered list', () => {
		const tokenizer = new MarkdownTokenizer('1. item');
		const tokens = tokenizer.tokenize();
		const ast = tokensToAST(tokens);

		expect(ast.type).toBe('document');
		expect(ast.children).toHaveLength(1);
		expect(ast.children![0].type).toBe('list');
		expect(ast.children![0].listType).toBe('ordered');
		expect(ast.children![0].children![0].listType).toBe('ordered');
	});

	it('should create AST from empty bullet list item', () => {
		const tokenizer = new MarkdownTokenizer('- ');
		const tokens = tokenizer.tokenize();
		const ast = tokensToAST(tokens);

		expect(ast.type).toBe('document');
		expect(ast.children).toHaveLength(1);
		expect(ast.children![0].type).toBe('list');

		const listItem = ast.children![0].children![0];
		expect(listItem.type).toBe('list-item');
		expect(listItem.children).toHaveLength(1);
		expect(listItem.children![0].type).toBe('text');
		expect(listItem.children![0].text).toBe('');
	});

	it('should create AST with correct content offset for list items', () => {
		const tokenizer = new MarkdownTokenizer('- test');
		const tokens = tokenizer.tokenize();
		const ast = tokensToAST(tokens);

		const listItem = ast.children![0].children![0];
		const textNode = listItem.children![0];

		// Content "test" starts at position 2 (after "- ")
		expect(textNode.start).toBe(2);
		expect(textNode.end).toBe(6);
		expect(textNode.text).toBe('test');
	});

	it('should create AST with multiple list items', () => {
		const tokenizer = new MarkdownTokenizer('- first\n- second');
		const tokens = tokenizer.tokenize();
		const ast = tokensToAST(tokens);

		const list = ast.children![0];
		expect(list.children).toHaveLength(2);
		expect(list.children![0].children![0].text).toBe('first');
		expect(list.children![1].children![0].text).toBe('second');
	});
});

describe('AST to Text Conversion', () => {
	it('should convert empty AST to empty text', () => {
		const ast = { type: 'document' as const, start: 0, end: 0, children: [] };
		expect(astToText(ast)).toBe('');
	});

	it('should convert bullet list back to text', () => {
		const tokenizer = new MarkdownTokenizer('- item');
		const tokens = tokenizer.tokenize();
		const ast = tokensToAST(tokens);

		expect(astToText(ast)).toBe('- item');
	});

	it('should convert ordered list back to text', () => {
		const tokenizer = new MarkdownTokenizer('1. item');
		const tokens = tokenizer.tokenize();
		const ast = tokensToAST(tokens);

		// We always use "1." for ordered lists
		expect(astToText(ast)).toBe('1. item');
	});

	it('should convert empty bullet list back to text', () => {
		const tokenizer = new MarkdownTokenizer('- ');
		const tokens = tokenizer.tokenize();
		const ast = tokensToAST(tokens);

		expect(astToText(ast)).toBe('- ');
	});

	it('should convert multiple list items back to text', () => {
		const tokenizer = new MarkdownTokenizer('- first\n- second');
		const tokens = tokenizer.tokenize();
		const ast = tokensToAST(tokens);

		expect(astToText(ast)).toBe('- first\n- second');
	});

	it('should roundtrip: text -> AST -> text', () => {
		const texts = ['- item', '- first\n- second', '1. ordered', '# Heading', 'Plain text', '- '];

		texts.forEach((text) => {
			const tokenizer = new MarkdownTokenizer(text);
			const tokens = tokenizer.tokenize();
			const ast = tokensToAST(tokens);
			const result = astToText(ast);

			// For ordered lists, we normalize to "1."
			const expected = text.replace(/^\d+\./, '1.');
			expect(result).toBe(expected);
		});
	});

	it('should preserve wikilink with entry ID only during roundtrip', () => {
		const text = '[[entry-123]]';
		const tokenizer = new MarkdownTokenizer(text);
		const tokens = tokenizer.tokenize();
		const ast = tokensToAST(tokens);
		const result = astToText(ast);

		expect(result).toBe('[[entry-123]]');
	});

	it('should preserve wikilink with custom display name during roundtrip', () => {
		const text = '[[entry-456|Custom Display Name]]';
		const tokenizer = new MarkdownTokenizer(text);
		const tokens = tokenizer.tokenize();
		const ast = tokensToAST(tokens);
		const result = astToText(ast);

		expect(result).toBe('[[entry-456|Custom Display Name]]');
	});

	it('should preserve multiple wikilinks with mixed formats during roundtrip', () => {
		const text = 'Check [[entry-1]] and [[entry-2|Custom Name]] for details';
		const tokenizer = new MarkdownTokenizer(text);
		const tokens = tokenizer.tokenize();
		const ast = tokensToAST(tokens);
		const result = astToText(ast);

		expect(result).toBe('Check [[entry-1]] and [[entry-2|Custom Name]] for details');
	});
});

describe('Cursor Rendering', () => {
	it('should render cursor at end of heading', () => {
		const tokenizer = new MarkdownTokenizer('# test');
		const tokens = tokenizer.tokenize();
		const ast = tokensToAST(tokens);

		// Cursor at position 6 (end of "test")
		const html = renderASTWithCursor(ast, 6);

		// Cursor should be inside the h1 tag
		expect(html).toContain('<span class="cursor"');
		expect(html).toMatch(/<h1>.*<span class="cursor".*<\/h1>/);
	});

	it('should render cursor at position 0', () => {
		const tokenizer = new MarkdownTokenizer('test');
		const tokens = tokenizer.tokenize();
		const ast = tokensToAST(tokens);

		const html = renderASTWithCursor(ast, 0);
		expect(html).toContain('<span class="cursor"');
		expect(html).toContain('<p>');
	});

	it('should render cursor in empty list item', () => {
		const tokenizer = new MarkdownTokenizer('- ');
		const tokens = tokenizer.tokenize();
		const ast = tokensToAST(tokens);

		// Cursor at position 2 (after "- ")
		const html = renderASTWithCursor(ast, 2);
		expect(html).toContain('<span class="cursor"');
		expect(html).toContain('<li');
	});

	it('should render cursor in list item with content', () => {
		const tokenizer = new MarkdownTokenizer('- test');
		const tokens = tokenizer.tokenize();
		const ast = tokensToAST(tokens);

		// Cursor at position 3 (after "- t")
		const html = renderASTWithCursor(ast, 3);
		expect(html).toContain('<span class="cursor"');
		expect(html).toContain('t<span class="cursor"');
	});

	it('should render cursor at end of document', () => {
		const tokenizer = new MarkdownTokenizer('test');
		const tokens = tokenizer.tokenize();
		const ast = tokensToAST(tokens);

		const html = renderASTWithCursor(ast, 4);
		expect(html).toContain('<span class="cursor"');
	});

	it('should not render cursor when position is -1', () => {
		const tokenizer = new MarkdownTokenizer('test');
		const tokens = tokenizer.tokenize();
		const ast = tokensToAST(tokens);

		const html = renderASTWithCursor(ast, -1);
		expect(html).not.toContain('<span class="cursor"');
	});

	it('should render wikilink with target entry name when no custom display name', () => {
		const tokenizer = new MarkdownTokenizer('Check [[entry-123]] for details');
		const tokens = tokenizer.tokenize();
		const ast = tokensToAST(tokens);
		const entryMap = new Map([['entry-123', 'My Entry Title']]);

		const html = renderASTWithCursor(ast, -1, entryMap);
		
		// Should show the entry title, not the entry ID
		expect(html).toContain('<a href="/entries/entry-123" class="wiki-link">My Entry Title</a>');
		expect(html).not.toContain('>entry-123<');
	});

	it('should render wikilink with custom display name when provided', () => {
		const tokenizer = new MarkdownTokenizer('Check [[entry-456|Custom Name]] here');
		const tokens = tokenizer.tokenize();
		const ast = tokensToAST(tokens);
		const entryMap = new Map([['entry-456', 'Actual Title']]);

		const html = renderASTWithCursor(ast, -1, entryMap);
		
		// Should show the custom display name, not the entry title
		expect(html).toContain('<a href="/entries/entry-456" class="wiki-link">Custom Name</a>');
		expect(html).not.toContain('>Actual Title<');
	});

	it('should render wikilink with entry ID when no title map provided', () => {
		const tokenizer = new MarkdownTokenizer('Check [[entry-789]] out');
		const tokens = tokenizer.tokenize();
		const ast = tokensToAST(tokens);

		const html = renderASTWithCursor(ast, -1, new Map([['entry-789', 'Some Title']]));
		
		// Should show the title from the map
		expect(html).toContain('<a href="/entries/entry-789" class="wiki-link">Some Title</a>');
	});

	it('should render wikilink in list item with target entry name', () => {
		const tokenizer = new MarkdownTokenizer('- Check [[entry-123]] for details');
		const tokens = tokenizer.tokenize();
		const ast = tokensToAST(tokens);
		const entryMap = new Map([['entry-123', 'My Entry Title']]);

		const html = renderASTWithCursor(ast, -1, entryMap);
		
		// Should show the entry title, not the entry ID
		expect(html).toContain('<li');
		expect(html).toContain('Check ');
		expect(html).toContain('<a href="/entries/entry-123" class="wiki-link">My Entry Title</a>');
		expect(html).toContain(' for details</li>');
		expect(html).not.toContain('>entry-123<');
	});

	it('should render wikilink in list item with custom display name', () => {
		const tokenizer = new MarkdownTokenizer('- See [[entry-456|Custom Name]] here');
		const tokens = tokenizer.tokenize();
		const ast = tokensToAST(tokens);
		const entryMap = new Map([['entry-456', 'Actual Title']]);

		const html = renderASTWithCursor(ast, -1, entryMap);
		
		// Should show the custom display name, not the entry title
		expect(html).toContain('<li');
		expect(html).toContain('See ');
		expect(html).toContain('<a href="/entries/entry-456" class="wiki-link">Custom Name</a>');
		expect(html).toContain(' here</li>');
		expect(html).not.toContain('>Actual Title<');
	});

	it('should render multiple wikilinks in list item', () => {
		const tokenizer = new MarkdownTokenizer('- Link to [[entry-1]] and [[entry-2]]');
		const tokens = tokenizer.tokenize();
		const ast = tokensToAST(tokens);
		const entryMap = new Map([
			['entry-1', 'First Entry'],
			['entry-2', 'Second Entry']
		]);

		const html = renderASTWithCursor(ast, -1, entryMap);
		
		expect(html).toContain('<li');
		expect(html).toContain('<a href="/entries/entry-1" class="wiki-link">First Entry</a>');
		expect(html).toContain('<a href="/entries/entry-2" class="wiki-link">Second Entry</a>');
	});
});
