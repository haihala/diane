/**
 * Test helpers for the markdown editor
 *
 * These utilities make it easy to write tests that describe a series of inputs
 * and the expected output HTML/text they should produce.
 */

import { tokensToAST, astToText, type ASTNode, type EntryTitleMap } from './ast';
import { MarkdownTokenizer } from './markdown';
import { MarkdownEditor } from './markdownEditor';

/**
 * Represents a single keypress or input action
 */
export interface KeyPress {
	/** Type of key action */
	type: 'char' | 'enter' | 'backspace' | 'delete' | 'up' | 'down' | 'left' | 'right' | 'tab';
	/** Character to insert (for type='char') */
	char?: string;
	/** Modifiers applied */
	modifiers?: Modifier[];
}

export type Modifier = 'ctrl' | 'shift' | 'alt' | 'meta';

/**
 * State of the editor at a point in time
 */
export interface EditorState {
	/** Current AST */
	ast: ASTNode;
	/** Cursor position */
	cursorPos: number;
	/** Text representation of the document */
	text: string;
	/** HTML representation with cursor */
	html: string;
}

/**
 * Extract cursor position from text containing {cursor} marker
 * @returns Object with text (without cursor marker) and cursor position (or null if not found)
 */
export function extractCursorFromText(text: string): { text: string; cursorPos: number | null } {
	const cursorMatch = text.match(/\{cursor\}/);
	if (!cursorMatch?.index) {
		return { text, cursorPos: null };
	}

	const cursorPos = cursorMatch.index;
	const textWithoutCursor = text.slice(0, cursorPos) + text.slice(cursorPos + 8); // 8 = length of "{cursor}"

	return { text: textWithoutCursor, cursorPos };
}

/**
 * Convert a string to a series of keypresses
 *
 * Special sequences:
 * - \n => Enter key
 * - {backspace} => Backspace key
 * - {delete} => Delete key
 * - {enter} => Enter key
 * - {cursor} => Cursor position marker (not converted to keypress, used for positioning)
 * - {ctrl+a} => Ctrl+A (or any other modifier combo)
 *
 * @example
 * stringToKeypresses("Hello\n") // Type "Hello" then press Enter
 * stringToKeypresses("# Foo{backspace}") // Type "# Foo" then backspace
 */
export function stringToKeypresses(input: string): KeyPress[] {
	const keypresses: KeyPress[] = [];
	let i = 0;

	while (i < input.length) {
		// Handle special sequences in braces
		if (input[i] === '{') {
			const closeIdx = input.indexOf('}', i);
			if (closeIdx !== -1) {
				const command = input.substring(i + 1, closeIdx).toLowerCase();

				// Skip cursor marker - it's not a keypress
				if (command === 'cursor') {
					i = closeIdx + 1;
					continue;
				}

				// Handle commands with modifiers like {ctrl+a}
				if (command.includes('+')) {
					const parts = command.split('+');
					const modifiers: Modifier[] = [];
					let key = '';

					for (const part of parts) {
						if (part === 'ctrl' || part === 'shift' || part === 'alt' || part === 'meta') {
							modifiers.push(part as Modifier);
						} else {
							key = part;
						}
					}

					// For now, we mainly support text input, so modifier combos are converted to chars
					// This can be expanded later for actual keyboard shortcuts
					if (key) {
						keypresses.push({ type: 'char', char: key, modifiers });
					}
				} else if (command === 'backspace') {
					keypresses.push({ type: 'backspace' });
				} else if (command === 'delete') {
					keypresses.push({ type: 'delete' });
				} else if (command === 'enter') {
					keypresses.push({ type: 'enter' });
				} else if (command === 'tab') {
					keypresses.push({ type: 'tab' });
				}

				i = closeIdx + 1;
				continue;
			}
		}

		// Handle newlines as Enter key
		if (input[i] === '\n') {
			keypresses.push({ type: 'enter' });
			i++;
			continue;
		}

		// Regular character
		keypresses.push({ type: 'char', char: input[i] });
		i++;
	}

	return keypresses;
}

/**
 * Apply a single keypress to the editor state
 */
export function applyKeypress(
	state: EditorState,
	keypress: KeyPress,
	entryTitleMap?: EntryTitleMap
): EditorState {
	// Create a temporary editor instance to handle the keypress
	const editor = new MarkdownEditor({
		ast: state.ast
	});
	editor.setCursorPos(state.cursorPos);
	editor.setFocused(true);
	if (entryTitleMap) {
		editor.setEntryTitles(entryTitleMap);
	}

	// Create a synthetic KeyboardEvent for the keypress
	const modifiers = keypress.modifiers ?? [];
	const hasCtrl = modifiers.includes('ctrl');
	const hasShift = modifiers.includes('shift');
	const hasAlt = modifiers.includes('alt');
	const hasMeta = modifiers.includes('meta');

	let keyEventKey: string;
	switch (keypress.type) {
		case 'char':
			keyEventKey = keypress.char ?? '';
			break;
		case 'enter':
			keyEventKey = 'Enter';
			break;
		case 'backspace':
			keyEventKey = 'Backspace';
			break;
		case 'delete':
			keyEventKey = 'Delete';
			break;
		case 'up':
			keyEventKey = 'ArrowUp';
			break;
		case 'down':
			keyEventKey = 'ArrowDown';
			break;
		case 'left':
			keyEventKey = 'ArrowLeft';
			break;
		case 'right':
			keyEventKey = 'ArrowRight';
			break;
		case 'tab':
			keyEventKey = 'Tab';
			break;
		default:
			keyEventKey = '';
	}

	// Create a minimal KeyboardEvent-like object
	const fakeEvent = {
		key: keyEventKey,
		ctrlKey: hasCtrl,
		shiftKey: hasShift,
		altKey: hasAlt,
		metaKey: hasMeta,
		preventDefault: () => {},
		stopPropagation: () => {}
	} as KeyboardEvent;

	// Handle the keypress
	editor.handleKeyDown(fakeEvent);

	const newAst = editor.getAST();
	const newPos = editor.getCursorPos();
	const text = astToText(newAst);
	const html = editor.render();

	return { ast: newAst, cursorPos: newPos, text, html };
}

/**
 * Apply a series of keypresses to the editor
 */
export function applyKeypresses(
	keypresses: KeyPress[],
	entryTitleMap?: EntryTitleMap,
	initialState?: EditorState
): EditorState {
	let state = initialState ?? createEmptyEditorState();

	for (const keypress of keypresses) {
		state = applyKeypress(state, keypress, entryTitleMap);
	}

	return state;
}

/**
 * Create an empty editor state
 */
export function createEmptyEditorState(): EditorState {
	const ast: ASTNode = { type: 'document', start: 0, end: 0, children: [] };
	const editor = new MarkdownEditor({ ast });
	editor.setFocused(true);

	return {
		ast,
		cursorPos: 0,
		text: '',
		html: editor.render()
	};
}

/**
 * Create an editor state from initial text
 */
export function createEditorState(
	text: string,
	cursorPos?: number,
	entryTitleMap?: EntryTitleMap
): EditorState {
	const tokenizer = new MarkdownTokenizer(text);
	const tokens = tokenizer.tokenize();
	const ast = tokensToAST(tokens);
	const pos = cursorPos ?? text.length;

	const editor = new MarkdownEditor({ ast });
	editor.setCursorPos(pos);
	editor.setFocused(true);
	if (entryTitleMap) {
		editor.setEntryTitles(entryTitleMap);
	}
	const html = editor.render();

	return { ast, cursorPos: pos, text, html };
}

/**
 * High-level helper: type a string and get the resulting state
 *
 * @example
 * const result = typeString("# Foo\n");
 * expect(result.text).toBe("# Foo\n\n");
 * expect(result.html).toContain("<h1>Foo</h1>");
 */
function typeString(
	input: string,
	options?: {
		initialText?: string;
		initialCursorPos?: number;
		entryTitleMap?: EntryTitleMap;
	}
): EditorState {
	const initialState = options?.initialText
		? createEditorState(options.initialText, options.initialCursorPos, options.entryTitleMap)
		: createEmptyEditorState();

	const keypresses = stringToKeypresses(input);
	return applyKeypresses(keypresses, options?.entryTitleMap, initialState);
}

/**
 * Convert HTML with {cursor} marker to HTML with actual cursor span
 */
function insertCursorIntoHtml(html: string): string {
	return html.replace(/\{cursor\}/g, '<span class="cursor" data-cursor="true"></span>');
}

/**
 * Assertion helper: verify that a sequence of inputs produces expected output
 *
 * @example
 * expectInput("# Foo\n").toYield('<h1>Foo</h1><p>{cursor}</p>');
 */
export function expectInput(
	input: string,
	entryTitleMap?: EntryTitleMap
): {
	toYield: (expected: string) => EditorState;
	toContain: (expected: string) => EditorState;
	state: EditorState;
} {
	const state = typeString(input, { entryTitleMap });

	return {
		toYield(expected: string) {
			const errors: string[] = [];

			// Normalize the expected HTML
			const normalizedExpected = normalizeHtml(expected);

			// Check if expected HTML contains {cursor} marker
			const hasCursorMarker = normalizedExpected.includes('{cursor}');

			if (hasCursorMarker) {
				// Convert {cursor} to actual cursor span for comparison
				const expectedWithCursor = insertCursorIntoHtml(normalizedExpected);
				const normalizedActual = normalizeHtml(state.html);

				if (normalizedActual !== expectedWithCursor) {
					errors.push(`Expected HTML: ${expectedWithCursor}`);
					errors.push(`Actual HTML:   ${normalizedActual}`);
				}
			} else {
				// No cursor marker - compare HTML without cursor positions (ignore cursor)
				const { html: expectedHtmlWithoutCursor } = extractCursorFromHtml(normalizedExpected);
				const { html: actualHtmlWithoutCursor } = extractCursorFromHtml(normalizeHtml(state.html));

				if (expectedHtmlWithoutCursor !== actualHtmlWithoutCursor) {
					errors.push(`Expected HTML: ${normalizedExpected}`);
					errors.push(`Actual HTML:   ${normalizeHtml(state.html)}`);
				}
			}

			if (errors.length > 0) {
				throw new Error(`Expectation failed:\n${errors.join('\n')}`);
			}

			return state;
		},

		toContain(expected: string) {
			const errors: string[] = [];

			// Normalize the expected HTML
			const normalizedExpected = normalizeHtml(expected);

			// Extract cursor from expected HTML if present (ignore cursor for contains check)
			const { html: expectedHtmlWithoutCursor } = extractCursorFromHtml(normalizedExpected);
			const { html: actualHtmlWithoutCursor } = extractCursorFromHtml(normalizeHtml(state.html));

			if (!actualHtmlWithoutCursor.includes(expectedHtmlWithoutCursor)) {
				errors.push(`Expected HTML to contain: ${normalizedExpected}`);
				errors.push(`Actual HTML: ${normalizeHtml(state.html)}`);
			}

			if (errors.length > 0) {
				throw new Error(`Expectation failed:\n${errors.join('\n')}`);
			}

			return state;
		},

		state
	};
}

/**
 * Helper to normalize HTML for easier comparison (removes extra whitespace between tags)
 */
export function normalizeHtml(html: string): string {
	return html.replace(/>\s+</g, '><').trim();
}

/**
 * Helper to extract cursor position from HTML with data-cursor attribute or {cursor} marker
 */
export function extractCursorFromHtml(html: string): {
	html: string;
	position: number | null;
} {
	// First check for {cursor} marker
	const cursorMarkerMatch = html.match(/\{cursor\}/);
	if (cursorMarkerMatch?.index !== undefined) {
		const position = cursorMarkerMatch.index;
		const htmlWithoutCursor = html.slice(0, position) + html.slice(position + 8); // 8 = length of "{cursor}"

		return {
			html: htmlWithoutCursor,
			position
		};
	}

	// Otherwise check for actual cursor span element
	const cursorMatch = html.match(/<span[^>]*data-cursor[^>]*>/);
	if (!cursorMatch) {
		return {
			html,
			position: null
		};
	}

	// Count characters before cursor to estimate position
	// Position is 1-indexed: position 1 = at start (before first char), position 5 = after 4th char
	const beforeCursor = html.substring(0, cursorMatch.index);
	// Strip HTML tags to count text content
	const textBefore = beforeCursor.replace(/<[^>]*>/g, '');
	const position = textBefore.length + 1; // 1-indexed

	return {
		html: html.replace(/<span[^>]*data-cursor[^>]*><\/span>/g, ''),
		position
	};
}

/**
 * Helper to create step-by-step test scenarios with immediate assertions
 *
 * @example
 * scenario()
 *   .type("# ")
 *   .type("Hello")
 *   .press("enter")
 *   .expect({ html: '<h1>Hello</h1><p>{cursor}</p>' });
 */
export class TestScenario {
	private state: EditorState;
	private entryTitleMap?: EntryTitleMap;

	constructor(initialState?: EditorState, entryTitleMap?: EntryTitleMap) {
		this.state = initialState ?? createEmptyEditorState();
		this.entryTitleMap = entryTitleMap;
	}

	type(input: string): this {
		const keypresses = stringToKeypresses(input);
		this.state = applyKeypresses(keypresses, this.entryTitleMap, this.state);
		return this;
	}

	press(
		key: 'enter' | 'backspace' | 'delete' | 'up' | 'down' | 'left' | 'right' | 'tab',
		modifiers?: { ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean }
	): this {
		const modifiersList: Modifier[] = [];
		if (modifiers?.ctrl) modifiersList.push('ctrl');
		if (modifiers?.shift) modifiersList.push('shift');
		if (modifiers?.alt) modifiersList.push('alt');
		if (modifiers?.meta) modifiersList.push('meta');

		const keypress: KeyPress = {
			type: key,
			modifiers: modifiersList.length > 0 ? modifiersList : undefined
		};
		this.state = applyKeypress(this.state, keypress, this.entryTitleMap);
		return this;
	}

	expect(expected: string): this {
		const errors: string[] = [];

		// Normalize the expected HTML
		const normalizedExpected = normalizeHtml(expected);

		// Check if expected HTML contains {cursor} marker
		const hasCursorMarker = normalizedExpected.includes('{cursor}');

		if (hasCursorMarker) {
			// Convert {cursor} to actual cursor span for comparison
			const expectedWithCursor = insertCursorIntoHtml(normalizedExpected);
			// Normalize again after inserting cursor to ensure consistent comparison
			const normalizedExpectedWithCursor = normalizeHtml(expectedWithCursor);
			const normalizedActual = normalizeHtml(this.state.html);

			if (normalizedActual !== normalizedExpectedWithCursor) {
				errors.push(`Expected HTML: ${normalizedExpectedWithCursor}`);
				errors.push(`Actual HTML:   ${normalizedActual}`);
			}
		} else {
			// No cursor marker - compare HTML without cursor positions
			const { html: expectedHtmlWithoutCursor } = extractCursorFromHtml(normalizedExpected);
			const { html: actualHtmlWithoutCursor } = extractCursorFromHtml(
				normalizeHtml(this.state.html)
			);

			if (expectedHtmlWithoutCursor !== actualHtmlWithoutCursor) {
				errors.push(`Expected HTML: ${normalizedExpected}`);
				errors.push(`Actual HTML:   ${normalizeHtml(this.state.html)}`);
			}
		}

		if (errors.length > 0) {
			throw new Error(`Expectation failed:\n${errors.join('\n')}`);
		}

		return this;
	}

	expectContains(expected: string): this {
		const errors: string[] = [];

		// DON'T normalize before extracting cursor - normalize after!
		// This prevents the normalization from removing content spaces that happen
		// to be adjacent to the cursor span element
		const { html: expectedHtmlWithoutCursor } = extractCursorFromHtml(expected);
		const { html: actualHtmlWithoutCursor } = extractCursorFromHtml(this.state.html);

		// NOW normalize both, after cursor is extracted
		const normalizedExpected = normalizeHtml(expectedHtmlWithoutCursor);
		const normalizedActual = normalizeHtml(actualHtmlWithoutCursor);

		if (!normalizedActual.includes(normalizedExpected)) {
			errors.push(`Expected HTML to contain: ${expected}`);
			errors.push(`Actual HTML: ${this.state.html}`);
		}

		if (errors.length > 0) {
			throw new Error(`Expectation failed:\n${errors.join('\n')}`);
		}

		return this;
	}
}

/**
 * Create a new test scenario
 * @param initialText - Initial text with optional {cursor} marker (defaults to end if not specified)
 * @param entryTitleMap - Optional map of entry IDs to titles for wiki link rendering
 */
export function scenario(initialText?: string, entryTitleMap?: EntryTitleMap): TestScenario {
	if (!initialText) {
		return new TestScenario(undefined, entryTitleMap);
	}

	// Extract cursor position from initial text
	const { text, cursorPos } = extractCursorFromText(initialText);

	// If no cursor specified, place at end
	const finalCursorPos = cursorPos ?? text.length;

	const initialState = createEditorState(text, finalCursorPos, entryTitleMap);
	return new TestScenario(initialState, entryTitleMap);
}
