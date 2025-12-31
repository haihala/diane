import { describe, it, expect } from 'vitest';
import {
	stringToKeypresses,
	expectInput,
	scenario,
	normalizeHtml,
	extractCursorFromHtml
} from './scenarioTestingTool';

describe('Test tooling', () => {
	describe('stringToKeypresses', () => {
		it('should convert simple string to keypresses', () => {
			const keypresses = stringToKeypresses('hello');
			expect(keypresses).toHaveLength(5);
			expect(keypresses[0]).toEqual({ type: 'char', char: 'h' });
			expect(keypresses[4]).toEqual({ type: 'char', char: 'o' });
		});

		it('should handle newlines as Enter key', () => {
			const keypresses = stringToKeypresses('hi\n');
			expect(keypresses).toHaveLength(3);
			expect(keypresses[2]).toEqual({ type: 'enter' });
		});

		it('should handle {backspace} command', () => {
			const keypresses = stringToKeypresses('test{backspace}');
			expect(keypresses).toHaveLength(5);
			expect(keypresses[4]).toEqual({ type: 'backspace' });
		});

		it('should handle {delete} command', () => {
			const keypresses = stringToKeypresses('test{delete}');
			expect(keypresses).toHaveLength(5);
			expect(keypresses[4]).toEqual({ type: 'delete' });
		});

		it('should handle {enter} command', () => {
			const keypresses = stringToKeypresses('test{enter}');
			expect(keypresses).toHaveLength(5);
			expect(keypresses[4]).toEqual({ type: 'enter' });
		});
	});

	describe('normalizeHtml', () => {
		it('should remove whitespace between tags', () => {
			const html = '<p>  test  </p>  <p>  more  </p>';
			const normalized = normalizeHtml(html);
			expect(normalized).toBe('<p>  test  </p><p>  more  </p>');
		});
	});

	describe('extractCursorFromHtml', () => {
		it('should detect cursor presence', () => {
			const html = '<p>test<span class="cursor" data-cursor="true"></span></p>';
			const result = extractCursorFromHtml(html);
			expect(result.position).toBe(5);
			expect(result.html).toBe('<p>test</p>');
		});

		it('should handle HTML without cursor', () => {
			const html = '<p>test</p>';
			const result = extractCursorFromHtml(html);
			expect(result.position).toBeNull();
			expect(result.html).toBe('<p>test</p>');
		});
	});

	describe('End to end tests', () => {
		it('should verify HTML output', () => {
			expectInput('# Foo\n').toYield('<h1>Foo</h1><p>{cursor}</p>');
		});

		it('should support contains check', () => {
			expectInput('# Foo').toYield('<p># Foo{cursor}</p>');
		});

		// I'm keeping this as a sanity check because the test helpers are AI generated
		it('should throw on mismatch', () => {
			expect(() => {
				expectInput('hello').toYield('<p>goodbye</p>');
			}).toThrow('Expectation failed');
		});
	});

	describe('scenario', () => {
		it('should handle empty test', () => {
			scenario().expect('');
		});

		it('should complete smoke test', () => {
			scenario()
				.type('# My Document')
				.press('enter')
				.type('This is the introduction.')
				.expect('<h1>My Document</h1><p>This is the introduction.</p>');
		});

		it('should support starting with initial state', () => {
			scenario('# Heading\n').expectContains('<h1>Heading</h1>');
		});

		it('should support starting with initial state with cursor', () => {
			scenario('# Head{cursor}ing').press('enter').expect('<h1>Head</h1><p>{cursor}ing</p>');
		});

		// I'm keeping this as a sanity check because the test helpers are AI generated
		it('should throw when asserts fail', () => {
			expect(() => {
				scenario().expect('<p>not empty</p>');
			}).toThrow('Expectation failed');
			expect(() => {
				scenario('content').expectContains('other');
			}).toThrow('Expectation failed');
		});

		it('should handle querying cursor position', () => {
			scenario('content').expect('<p>content{cursor}</p>');
			scenario('content').expectContains('content{cursor}');
		});
	});
});

describe('Markdown elements', () => {
	describe('Headings', () => {
		it('should create heading and paragraph', () => {
			expectInput('# Foo\n').toYield('<h1>Foo</h1><p>{cursor}</p>');
		});

		it('should handle typing heading step by step', () => {
			scenario()
				.type('#')
				.type(' ')
				.type('Test')
				.press('enter') // This creates the <p> tag on the next line
				.expect('<h1>Test</h1><p>{cursor}</p>');
		});

		// These should be the same thing. This is more or less a test of the test tooling
		it('should create heading of different levels (scenario)', () => {
			scenario()
				.type('# h1')
				.press('enter')
				.type('## h2')
				.press('enter')
				.type('### h3')
				.press('enter')
				.type('#### h4')
				.press('enter')
				.type('##### h5')
				.expect('<h1>h1</h1> <h2>h2</h2> <h3>h3</h3> <h4>h4</h4> <p>##### h5{cursor}</p>');
		});
		it('should create heading of different levels (expectInput)', () => {
			expectInput('# h1\n## h2\n### h3\n#### h4\n##### h5').toYield(
				'<h1>h1</h1> <h2>h2</h2> <h3>h3</h3> <h4>h4</h4> <p>##### h5{cursor}</p>'
			);
		});
	});

	describe('Paragraph', () => {
		it('should wrap text in a paragraph', () => {
			expectInput('foo').toYield('<p>foo</p>');
		});

		it('should create several empty <p> tags when pressing enter repeatedly', () => {
			scenario()
				.press('enter')
				.press('enter')
				.press('enter')
				.press('enter')
				.expect('<p></p> <p></p> <p></p> <p>{cursor}</p>');
		});
	});

	describe('Lists', () => {
		it('should create bullet list', () => {
			expectInput('- item').toContain('<li');
		});

		it('should create multiple list items', () => {
			scenario()
				.type('- one')
				.press('enter')
				.type('two')
				.press('enter')
				.type('three')
				.expect('<ul><li>one</li><li>two</li><li>three{cursor}</li></ul>');
		});

		it('should indent and de-indent with tab and shift-tab', () => {
			scenario()
				.type('- one')
				.press('enter')
				.type('two')
				.press('tab')
				.expect('<ul><li>one</li><li><ul><li>two{cursor}</li></ul></li></ul>')
				.press('tab', { shift: true })
				.expect('<ul><li>one</li><li>two{cursor}</li></ul>');
		});

		it('should not allow indenting more than one level deeper than parent', () => {
			scenario()
				.type('- one')
				.press('enter')
				.type('two')
				.press('tab')
				.expect('<ul><li>one</li><li><ul><li>two{cursor}</li></ul></li></ul>')
				.press('tab') // This should do nothing
				.expect('<ul><li>one</li><li><ul><li>two{cursor}</li></ul></li></ul>');
		});

		it('should create an ordered list', () => {
			scenario()
				.type('1. one')
				.press('enter')
				.type('two')
				.expect('<ol><li>one</li><li>two{cursor}</li></ol>');
		});

		it('should handle backspace in lists', () => {
			scenario().type('- ').press('backspace').expect('');
		});

		it('should create <p> after list', () => {
			scenario()
				.type('- one')
				.press('enter')
				.type('two')
				.press('enter')
				.press('enter')
				.expect('<ul><li>one</li><li>two</li></ul><p>{cursor}</p>');
		});

		it('should create <p> after list', () => {
			scenario()
				.type('- one')
				.press('enter')
				.type('two')
				.press('enter')
				.press('backspace')
				.expect('<ul><li>one</li><li>two{cursor}</li></ul>');
		});
	});

	describe('Bold and Italic', () => {
		it('should render bold text', () => {
			expectInput('**bold**\n').toContain('<strong>bold</strong>');
		});

		it('should not render bold text when cursor is touching it', () => {
			scenario(' **bold** normal\n')
				.expect('<p> <strong>bold</strong> normal</p><p>{cursor}</p>')
				.press('up')
				.expect('<p>{cursor} <strong>bold</strong> normal</p>')
				.press('right')
				.expectContains('<p> {cursor}**bold** normal</p>')
				.press('right', { ctrl: true })
				.expectContains('<p> **bold**{cursor} normal</p>')
				.press('right')
				.expectContains('<p> <strong>bold</strong> {cursor}normal</p>');
		});

		it('should render italic text', () => {
			expectInput('*italic*\n').toContain('<em>italic</em>');
		});

		it('should not render italic text when cursor is touching it', () => {
			scenario(' *italic* normal\n')
				.expect('<p> <em>italic</em> normal</p><p>{cursor}</p>')
				.press('up')
				.expect('<p>{cursor} <em>italic</em> normal</p>')
				.press('right')
				.expectContains('<p> {cursor}*italic* normal</p>')
				.press('right', { ctrl: true })
				.expectContains('<p> *italic*{cursor} normal</p>')
				.press('right')
				.expectContains('<p> <em>italic</em> {cursor}normal</p>');
		});

		it('should handle mixed formatting', () => {
			scenario('**bold** and *italic*\n')
				.expect('<p><strong>bold</strong> and <em>italic</em></p><p>{cursor}</p>')
				.press('left')
				.expect('<p><strong>bold</strong> and *italic*{cursor}</p><p></p>');
		});
	});

	describe('Wiki Links', () => {
		it('should render wiki link with entry map', () => {
			const entryMap = new Map([['entry-123', 'My Entry']]);

			expectInput('[[entry-123]]', entryMap).toContain(
				'<a href="/entries/entry-123" class="wiki-link">My Entry</a>'
			);
		});

		it('should handle typing wiki link', () => {
			const entryMap = new Map([['entry-1', 'Test Entry']]);

			scenario('', entryMap).type('Check this: [[entry-1]]').expectContains('Test Entry');
		});
	});
});

describe('Markdown editor navigation', () => {
	it('should navigate multiple paragraphs correctly', () => {
		scenario('one\ntwo\nthree\nfour')
			.expect('<p>one</p> <p>two</p> <p>three</p> <p>four{cursor}</p>')
			.press('up')
			.expect('<p>one</p> <p>two</p> <p>thre{cursor}e</p> <p>four</p>')
			.press('left')
			.expect('<p>one</p> <p>two</p> <p>thr{cursor}ee</p> <p>four</p>')
			.press('down')
			.expect('<p>one</p> <p>two</p> <p>three</p> <p>fou{cursor}r</p>')
			.press('right')
			.expect('<p>one</p> <p>two</p> <p>three</p> <p>four{cursor}</p>');
	});

	it('should navigate a word at a time when control is held.', () => {
		scenario('one two three')
			.expect('<p>one two three{cursor}</p>')
			.press('left', { ctrl: true })
			.expect('<p>one two {cursor}three</p>')
			.press('left', { ctrl: true })
			.expect('<p>one {cursor}two three</p>')
			.press('left', { ctrl: true })
			.expect('<p>{cursor}one two three</p>')
			.press('right', { ctrl: true })
			.expect('<p>one{cursor} two three</p>')
			.press('right', { ctrl: true })
			.expect('<p>one two{cursor} three</p>')
			.press('right', { ctrl: true })
			.expect('<p>one two three{cursor}</p>');
	});
});
