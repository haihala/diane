import { MarkdownTokenizer } from './markdown';
import {
	tokensToAST,
	astToText,
	renderASTWithCursor,
	type ASTNode,
	type EntryTitleMap
} from './ast';
import {
	insertTextAtCursor,
	deleteAtCursor,
	handleEnterKey,
	moveCursorUp,
	moveCursorDown,
	moveCursorLeft,
	moveCursorRight,
	handleTabKey
} from './cursor';
import { extractEntryIdsFromContent } from './entries';

export interface MarkdownEditorOptions {
	ast?: ASTNode;
	onchange?: (ast: ASTNode) => void;
	onnavigateup?: () => void;
	onctrlenter?: () => void;
	onescape?: () => void;
	onlinkpopovershow?: (data: LinkPopoverData) => void;
	onlinkpopoverhide?: () => void;
	currentEntryId?: string;
}

export interface LinkPopoverData {
	searchTerm: string;
	position: { x: number; y: number };
	linkStartPos: number;
}

export interface EditorState {
	html: string;
	showLinkPopover: boolean;
	linkPopoverData?: LinkPopoverData;
}

/**
 * Core markdown editor logic - handles AST manipulation, cursor management,
 * keyboard input, and rendering. This is framework-agnostic and can be used
 * with any UI framework.
 */
export class MarkdownEditor {
	private ast: ASTNode;
	private cursorPos: number;
	private entryTitles: EntryTitleMap;
	private isComposing: boolean;
	private isFocused: boolean;
	private showLinkPopover: boolean;
	private linkSearchTerm: string;
	private linkStartPos: number;

	// Callbacks
	private onchange?: (ast: ASTNode) => void;
	private onnavigateup?: () => void;
	private onctrlenter?: () => void;
	private onescape?: () => void;
	private onlinkpopovershow?: (data: LinkPopoverData) => void;
	private onlinkpopoverhide?: () => void;
	private currentEntryId?: string;

	constructor(options: MarkdownEditorOptions = {}) {
		this.ast = options.ast ?? { type: 'document', start: 0, end: 0, children: [] };
		this.cursorPos = 0;
		this.entryTitles = new Map();
		this.isComposing = false;
		this.isFocused = false;
		this.showLinkPopover = false;
		this.linkSearchTerm = '';
		this.linkStartPos = 0;

		this.onchange = options.onchange;
		this.onnavigateup = options.onnavigateup;
		this.onctrlenter = options.onctrlenter;
		this.onescape = options.onescape;
		this.onlinkpopovershow = options.onlinkpopovershow;
		this.onlinkpopoverhide = options.onlinkpopoverhide;
		this.currentEntryId = options.currentEntryId;
	}

	/**
	 * Get the current AST
	 */
	getAST(): ASTNode {
		return this.ast;
	}

	/**
	 * Set the AST (for external updates)
	 */
	setAST(ast: ASTNode): void {
		this.ast = ast;
		void this.updateEntryTitles();
	}

	/**
	 * Get the current cursor position
	 */
	getCursorPos(): number {
		return this.cursorPos;
	}

	/**
	 * Set the cursor position
	 */
	setCursorPos(pos: number): void {
		const maxPos = astToText(this.ast).length;
		this.cursorPos = Math.max(0, Math.min(pos, maxPos));
	}

	/**
	 * Get the entry titles map
	 */
	getEntryTitles(): EntryTitleMap {
		return this.entryTitles;
	}

	/**
	 * Set the entry titles map
	 */
	setEntryTitles(titles: EntryTitleMap): void {
		this.entryTitles = titles;
	}

	/**
	 * Update entry titles based on current content
	 */
	private async updateEntryTitles(): Promise<void> {
		const text = astToText(this.ast);
		const entryIds = extractEntryIdsFromContent(text);
		if (entryIds.length > 0) {
			try {
				const { loadEntryTitles } = await import('./entries');
				const titleMap = await loadEntryTitles(entryIds);
				this.entryTitles = titleMap;
			} catch (err) {
				console.error('Failed to load entry titles:', err);
			}
		} else {
			this.entryTitles = new Map();
		}
	}

	/**
	 * Set focus state
	 */
	setFocused(focused: boolean): void {
		this.isFocused = focused;
	}

	/**
	 * Get focus state
	 */
	isFocusedState(): boolean {
		return this.isFocused;
	}

	/**
	 * Render the current state to HTML
	 * Goes directly from AST -> HTML without converting to text first
	 */
	render(): string {
		// Only show cursor if focused
		const cursorPos = this.isFocused ? this.cursorPos : -1;
		return renderASTWithCursor(this.ast, cursorPos, this.entryTitles);
	}

	/**
	 * Get the current text content
	 */
	getText(): string {
		return astToText(this.ast);
	}

	/**
	 * Handle keyboard input
	 */
	handleKeyDown(e: KeyboardEvent): void {
		// Ignore events during IME composition
		if (this.isComposing) return;

		// If link popover is open, let calling code handle certain keys
		if (
			this.showLinkPopover &&
			(e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter')
		) {
			// Don't handle these keys, let the popover component handle them
			return;
		}

		// Handle special keys
		if (e.key === 'Escape') {
			e.preventDefault();
			if (this.showLinkPopover) {
				this.hideLinkPopover();
			} else {
				this.onescape?.();
			}
			return;
		}

		if (e.key === 'Enter' && e.ctrlKey) {
			e.preventDefault();
			this.onctrlenter?.();
			return;
		}

		if (e.key === 'ArrowUp' && this.cursorPos === 0) {
			e.preventDefault();
			this.onnavigateup?.();
			return;
		}

		// Handle arrow keys for cursor navigation
		if (e.key === 'ArrowLeft') {
			e.preventDefault();
			this.cursorPos = moveCursorLeft(this.ast, this.cursorPos, e.ctrlKey);
			return;
		}

		if (e.key === 'ArrowRight') {
			e.preventDefault();
			this.cursorPos = moveCursorRight(this.ast, this.cursorPos, e.ctrlKey);
			return;
		}

		if (e.key === 'ArrowUp') {
			e.preventDefault();
			this.cursorPos = moveCursorUp(this.ast, this.cursorPos);
			return;
		}

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			this.cursorPos = moveCursorDown(this.ast, this.cursorPos);
			return;
		}

		// Handle text input
		if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
			e.preventDefault();
			const { ast: newAST, newPos } = insertTextAtCursor(this.ast, this.cursorPos, e.key);
			this.ast = newAST;
			this.cursorPos = newPos;
			this.onchange?.(this.ast);

			// Check for [[ trigger after insertion
			this.checkForLinkTrigger();
			return;
		}

		// Handle Backspace
		if (e.key === 'Backspace') {
			e.preventDefault();
			const { ast: newAST, newPos } = deleteAtCursor(this.ast, this.cursorPos, false);
			this.ast = newAST;
			this.cursorPos = newPos;
			this.onchange?.(this.ast);

			// Check for [[ trigger after deletion
			this.checkForLinkTrigger();
			return;
		}

		// Handle Delete
		if (e.key === 'Delete') {
			e.preventDefault();
			const { ast: newAST, newPos } = deleteAtCursor(this.ast, this.cursorPos, true);
			this.ast = newAST;
			this.cursorPos = newPos;
			this.onchange?.(this.ast);

			// Check for [[ trigger after deletion
			this.checkForLinkTrigger();
			return;
		}

		// Handle Enter
		if (e.key === 'Enter') {
			e.preventDefault();
			const { ast: newAST, newPos } = handleEnterKey(this.ast, this.cursorPos);
			this.ast = newAST;
			this.cursorPos = newPos;
			this.onchange?.(this.ast);
			return;
		}

		// Handle Tab (indent/de-indent in lists)
		if (e.key === 'Tab') {
			e.preventDefault();
			const { ast: newAST, newPos } = handleTabKey(this.ast, this.cursorPos, e.shiftKey);
			this.ast = newAST;
			this.cursorPos = newPos;
			this.onchange?.(this.ast);
			return;
		}
	}

	/**
	 * Handle IME composition start
	 */
	handleCompositionStart(): void {
		this.isComposing = true;
	}

	/**
	 * Handle IME composition end
	 */
	handleCompositionEnd(e: CompositionEvent): void {
		this.isComposing = false;
		if (e.data) {
			const { ast: newAST, newPos } = insertTextAtCursor(this.ast, this.cursorPos, e.data);
			this.ast = newAST;
			this.cursorPos = newPos;
			this.onchange?.(this.ast);
		}
	}

	/**
	 * Check for [[ trigger to show link selector
	 */
	private checkForLinkTrigger(): void {
		const text = astToText(this.ast);
		const textBeforeCursor = text.substring(0, this.cursorPos);
		const lastDoubleBracket = textBeforeCursor.lastIndexOf('[[');

		// Check if we have [[ without closing ]]
		if (lastDoubleBracket !== -1) {
			const textAfterBracket = textBeforeCursor.substring(lastDoubleBracket);
			const hasClosing = textAfterBracket.includes(']]');

			if (!hasClosing) {
				// Extract search term (text after [[)
				this.linkSearchTerm = textAfterBracket.substring(2);
				this.linkStartPos = lastDoubleBracket;
				this.showLinkPopover = true;

				// Notify listener that popover should be shown
				// Position will be calculated by the UI layer
				this.onlinkpopovershow?.({
					searchTerm: this.linkSearchTerm,
					position: { x: 0, y: 0 }, // UI layer will calculate this
					linkStartPos: this.linkStartPos
				});
				return;
			}
		}

		// Hide popover if no valid [[ trigger found
		if (this.showLinkPopover) {
			this.hideLinkPopover();
		}
	}

	/**
	 * Hide the link popover
	 */
	private hideLinkPopover(): void {
		this.showLinkPopover = false;
		this.onlinkpopoverhide?.();
	}

	/**
	 * Insert a wiki link at the current link position
	 */
	insertWikiLink(entryId: string): void {
		const currentText = astToText(this.ast);

		// Replace [[ and search term with wiki link
		const beforeLink = currentText.substring(0, this.linkStartPos);
		let afterCursor = currentText.substring(this.cursorPos);

		// Check if ]] already exists right after cursor and skip it if present
		if (afterCursor.startsWith(']]')) {
			afterCursor = afterCursor.substring(2);
		}

		const wikiLink = `[[${entryId}]]`;
		const newText = beforeLink + wikiLink + afterCursor;

		// Re-parse to get new AST
		const tokenizer = new MarkdownTokenizer(newText);
		const tokens = tokenizer.tokenize();
		this.ast = tokensToAST(tokens);

		// Position cursor after the inserted link
		this.cursorPos = this.linkStartPos + wikiLink.length;

		this.hideLinkPopover();
		this.onchange?.(this.ast);
	}

	/**
	 * Get link popover state
	 */
	getLinkPopoverState(): {
		show: boolean;
		searchTerm: string;
		linkStartPos: number;
	} {
		return {
			show: this.showLinkPopover,
			searchTerm: this.linkSearchTerm,
			linkStartPos: this.linkStartPos
		};
	}

	/**
	 * Close the link popover
	 */
	closeLinkPopover(): void {
		this.hideLinkPopover();
	}
}
