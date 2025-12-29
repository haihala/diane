import { createEntry, updateEntry, getBacklinks } from '$lib/services/entries';
import { toast } from '$lib/services/toast';
import type { Entry } from '$lib/types/Entry';

/**
 * Shared logic for entry editing (used by EntryModal and EntryEditPage)
 */
export interface UseEntryEditorOptions {
	entry?: Entry;
	initialTitle?: string;
	onSave?: () => void;
}

export interface UseEntryEditorReturn {
	// State
	title: string;
	content: string;
	hasUnsavedChanges: boolean;
	isSaving: boolean;
	error: string | null;
	backlinks: Entry[];
	isLoadingBacklinks: boolean;
	lastLoadedEntryId: string | undefined;

	// State setters
	setTitle: (value: string) => void;
	setContent: (value: string) => void;
	setHasUnsavedChanges: (value: boolean) => void;
	setIsSaving: (value: boolean) => void;
	setError: (value: string | null) => void;
	setBacklinks: (value: Entry[]) => void;
	setIsLoadingBacklinks: (value: boolean) => void;
	setLastLoadedEntryId: (value: string | undefined) => void;

	// Methods
	getTitleWithTags: (entry: Entry) => string;
	handleInput: () => void;
	saveIfNeeded: () => Promise<void>;
	handleSaveAndClose: (onNavigate?: () => void | Promise<void>) => Promise<void>;
	handleSaveOnly: () => Promise<void>;
	loadBacklinks: (entryId: string) => Promise<void>;
	initializeFromEntry: (entry: Entry) => void;
	reset: () => void;
}

/**
 * Helper function to reconstruct title with tags
 */
export function getTitleWithTags(entry: Entry): string {
	const tags = entry.tags ?? [];
	const tagsString = tags.length > 0 ? ` ${tags.map((t) => `#${t}`).join(' ')}` : '';
	return entry.title + tagsString;
}

/**
 * Composable for entry editor logic
 * This extracts shared logic between EntryModal and EntryEditPage
 */
export function useEntryEditor(options: UseEntryEditorOptions): UseEntryEditorReturn {
	const { entry, initialTitle = '', onSave } = options;

	// State
	let title = $state('');
	let content = $state('');
	let hasUnsavedChanges = $state(false);
	let isSaving = $state(false);
	let error = $state<string | null>(null);
	let backlinks = $state<Entry[]>([]);
	let isLoadingBacklinks = $state(false);
	let lastLoadedEntryId = $state<string | undefined>(undefined);

	/**
	 * Initialize state from entry
	 */
	function initializeFromEntry(entryToLoad: Entry): void {
		title = getTitleWithTags(entryToLoad);
		content = entryToLoad.content;
		lastLoadedEntryId = entryToLoad.id;
		hasUnsavedChanges = false;
	}

	/**
	 * Reset state
	 */
	function reset(): void {
		title = initialTitle;
		content = '';
		hasUnsavedChanges = false;
		error = null;
		lastLoadedEntryId = undefined;
	}

	/**
	 * Load backlinks for an entry
	 */
	async function loadBacklinks(entryId: string): Promise<void> {
		isLoadingBacklinks = true;
		try {
			backlinks = await getBacklinks(entryId);
		} catch (err) {
			console.error('Failed to load backlinks:', err);
			backlinks = [];
		} finally {
			isLoadingBacklinks = false;
		}
	}

	/**
	 * Handle input changes
	 */
	function handleInput(): void {
		if (entry) {
			hasUnsavedChanges = true;
		}
	}

	/**
	 * Save if there are unsaved changes
	 */
	async function saveIfNeeded(): Promise<void> {
		if (!entry || !hasUnsavedChanges || !title.trim()) {
			return;
		}

		isSaving = true;
		error = null;

		try {
			await updateEntry(entry.id, {
				title: title.trim(),
				content: content.trim()
			});
			hasUnsavedChanges = false;
			toast.success('Entry saved successfully');
			onSave?.();
		} catch (err) {
			console.error('Failed to save entry:', err);
			error = err instanceof Error ? err.message : 'Failed to save entry';
			toast.error('Failed to save entry');
			throw err; // Re-throw to let caller know save failed
		} finally {
			isSaving = false;
		}
	}

	/**
	 * Save entry (create or update)
	 */
	async function handleSaveOnly(): Promise<void> {
		if (!title.trim()) {
			error = 'Title is required';
			return;
		}

		isSaving = true;
		error = null;

		try {
			if (entry) {
				// Update existing entry
				await updateEntry(entry.id, {
					title: title.trim(),
					content: content.trim()
				});
				toast.success('Entry saved successfully');
			} else {
				// Create new entry
				await createEntry({
					title: title.trim(),
					content: content.trim()
				});
				toast.success('Entry created successfully');
			}
			hasUnsavedChanges = false;
			onSave?.();
		} catch (err) {
			console.error('Failed to save entry:', err);
			error = err instanceof Error ? err.message : 'Failed to save entry';
			toast.error('Failed to save entry');
			throw err;
		} finally {
			isSaving = false;
		}
	}

	/**
	 * Save and then navigate
	 */
	async function handleSaveAndClose(onNavigate?: () => void | Promise<void>): Promise<void> {
		// If editing and there are unsaved changes, save them
		if (entry && hasUnsavedChanges && title.trim()) {
			try {
				await saveIfNeeded();
			} catch (_err) {
				// Don't navigate if save failed
				return;
			}
		}

		// Execute navigation callback if provided
		if (onNavigate) {
			await onNavigate();
		}
	}

	// Initialize from entry if provided
	if (entry) {
		initializeFromEntry(entry);
	} else {
		reset();
	}

	return {
		// State
		get title() {
			return title;
		},
		get content() {
			return content;
		},
		get hasUnsavedChanges() {
			return hasUnsavedChanges;
		},
		get isSaving() {
			return isSaving;
		},
		get error() {
			return error;
		},
		get backlinks() {
			return backlinks;
		},
		get isLoadingBacklinks() {
			return isLoadingBacklinks;
		},
		get lastLoadedEntryId() {
			return lastLoadedEntryId;
		},

		// State setters
		setTitle: (value: string) => {
			title = value;
		},
		setContent: (value: string) => {
			content = value;
		},
		setHasUnsavedChanges: (value: boolean) => {
			hasUnsavedChanges = value;
		},
		setIsSaving: (value: boolean) => {
			isSaving = value;
		},
		setError: (value: string | null) => {
			error = value;
		},
		setBacklinks: (value: Entry[]) => {
			backlinks = value;
		},
		setIsLoadingBacklinks: (value: boolean) => {
			isLoadingBacklinks = value;
		},
		setLastLoadedEntryId: (value: string | undefined) => {
			lastLoadedEntryId = value;
		},

		// Methods
		getTitleWithTags,
		handleInput,
		saveIfNeeded,
		handleSaveAndClose,
		handleSaveOnly,
		loadBacklinks,
		initializeFromEntry,
		reset
	};
}
