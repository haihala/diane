import {
	collection,
	addDoc,
	getDocs,
	query,
	orderBy,
	where,
	Timestamp,
	doc,
	updateDoc,
	type QueryConstraint,
	getDocFromServer,
	deleteField,
	deleteDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { auth } from './firebase';
import { impersonatedUser } from './auth';
import { get } from 'svelte/store';
import type { Entry, CreateEntryInput } from '$lib/types/Entry';
import { extractTagsFromTitle } from './markdown';
import { createEntryInputSchema, entryIdSchema, tagSchema } from '$lib/validation/entry';
import { ZodError, type ZodIssue } from 'zod';

const ENTRIES_COLLECTION = 'entries';

// Regex pattern for extracting entry IDs from wiki links
const WIKI_LINK_PATTERN = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;

/**
 * Helper function to format Zod validation errors
 */
function formatValidationError(zodError: ZodError): string {
	// ZodError.issues contains the array of validation errors
	return zodError.issues.map((e: ZodIssue) => e.message).join(', ') || 'Validation error';
}

interface EntryDocument {
	userId: string;
	title: string;
	content: string;
	tags?: string[];
	wikiIds?: string[];
	createdAt: { toDate: () => Date };
	updatedAt: { toDate: () => Date };
}

/**
 * Get the effective user ID (impersonated user if active, otherwise current user)
 */
function getEffectiveUserId(): string {
	const impersonated = get(impersonatedUser);
	if (impersonated) {
		return impersonated.uid;
	}

	if (!auth.currentUser) {
		throw new Error('User must be authenticated');
	}

	return auth.currentUser.uid;
}

/**
 * Creates a new entry in Firestore
 */
export async function createEntry(input: CreateEntryInput): Promise<Entry> {
	const currentUser = auth.currentUser;
	if (!currentUser) {
		throw new Error('User must be authenticated to create entries');
	}

	// Validate input
	try {
		createEntryInputSchema.parse(input);
	} catch (error) {
		if (error instanceof ZodError) {
			throw new Error(`Validation failed: ${formatValidationError(error)}`);
		}
		throw error;
	}

	const now = new Date();

	// Extract tags from title
	const { tags, cleanedTitle } = extractTagsFromTitle(input.title);

	// Use effective user ID (respects impersonation)
	const effectiveUserId = getEffectiveUserId();

	const docRef = await addDoc(collection(db, ENTRIES_COLLECTION), {
		userId: effectiveUserId,
		title: cleanedTitle,
		content: input.content,
		tags,
		createdAt: Timestamp.fromDate(now),
		updatedAt: Timestamp.fromDate(now)
	});

	return {
		id: docRef.id,
		userId: effectiveUserId,
		title: cleanedTitle,
		content: input.content,
		tags,
		createdAt: now,
		updatedAt: now
	};
}

/**
 * Searches entries by title
 */
export async function searchEntries(searchTerm: string): Promise<Entry[]> {
	const currentUser = auth.currentUser;
	if (!currentUser) {
		throw new Error('User must be authenticated to search entries');
	}

	// Use effective user ID (respects impersonation)
	const effectiveUserId = getEffectiveUserId();

	const constraints: QueryConstraint[] = [
		where('userId', '==', effectiveUserId),
		orderBy('createdAt', 'desc')
	];

	const q = query(collection(db, ENTRIES_COLLECTION), ...constraints);
	const snapshot = await getDocs(q);

	const entries = snapshot.docs.map((doc) => {
		const data = doc.data() as EntryDocument;
		return {
			id: doc.id,
			userId: data.userId,
			title: data.title,
			content: data.content,
			tags: data.tags ?? [],
			wikiIds: data.wikiIds ?? [],
			createdAt: data.createdAt.toDate(),
			updatedAt: data.updatedAt.toDate()
		} as Entry;
	});

	// Filter by title on client-side (Firestore doesn't support contains queries)
	if (searchTerm?.trim()) {
		const lowerSearch = searchTerm.toLowerCase().trim();
		return entries.filter((entry) => entry.title.toLowerCase().includes(lowerSearch));
	}

	return entries;
}

/**
 * Searches entries by tag
 */
export async function searchEntriesByTag(tag: string): Promise<Entry[]> {
	const currentUser = auth.currentUser;
	if (!currentUser) {
		throw new Error('User must be authenticated to search entries');
	}

	// Validate tag
	try {
		tagSchema.parse(tag);
	} catch (error) {
		if (error instanceof ZodError) {
			throw new Error(`Invalid tag: ${formatValidationError(error)}`);
		}
		throw error;
	}

	// Use effective user ID (respects impersonation)
	const effectiveUserId = getEffectiveUserId();

	const constraints: QueryConstraint[] = [
		where('userId', '==', effectiveUserId),
		where('tags', 'array-contains', tag),
		orderBy('createdAt', 'desc')
	];

	const q = query(collection(db, ENTRIES_COLLECTION), ...constraints);
	const snapshot = await getDocs(q);

	return snapshot.docs.map((doc) => {
		const data = doc.data() as EntryDocument;
		return {
			id: doc.id,
			userId: data.userId,
			title: data.title,
			content: data.content,
			tags: data.tags ?? [],
			wikiIds: data.wikiIds ?? [],
			createdAt: data.createdAt.toDate(),
			updatedAt: data.updatedAt.toDate()
		} as Entry;
	});
}

/**
 * Gets all entries ordered by creation date
 */
export async function getAllEntries(): Promise<Entry[]> {
	return searchEntries('');
}

/**
 * Gets a single entry by ID
 */
export async function getEntryById(id: string): Promise<Entry | null> {
	const currentUser = auth.currentUser;
	if (!currentUser) {
		throw new Error('User must be authenticated to get entries');
	}

	// Validate entry ID
	try {
		entryIdSchema.parse(id);
	} catch (error) {
		if (error instanceof ZodError) {
			throw new Error(`Invalid entry ID: ${formatValidationError(error)}`);
		}
		throw error;
	}

	const entryRef = doc(db, ENTRIES_COLLECTION, id);
	// Force fetch from server to avoid cache issues with backlink updates
	const entrySnap = await getDocFromServer(entryRef);

	if (!entrySnap.exists()) {
		return null;
	}

	const data = entrySnap.data() as EntryDocument;

	// Use effective user ID (respects impersonation)
	const effectiveUserId = getEffectiveUserId();

	// Verify the entry belongs to the effective user
	if (data.userId !== effectiveUserId) {
		throw new Error('Unauthorized access to entry');
	}

	return {
		id: entrySnap.id,
		userId: data.userId,
		title: data.title,
		content: data.content,
		tags: data.tags ?? [],
		wikiIds: data.wikiIds ?? [],
		createdAt: data.createdAt.toDate(),
		updatedAt: data.updatedAt.toDate()
	};
}

/**
 * Updates an existing entry in Firestore
 */
export async function updateEntry(id: string, input: CreateEntryInput): Promise<void> {
	const currentUser = auth.currentUser;
	if (!currentUser) {
		throw new Error('User must be authenticated to update entries');
	}

	// Validate entry ID
	try {
		entryIdSchema.parse(id);
	} catch (error) {
		if (error instanceof ZodError) {
			throw new Error(`Invalid entry ID: ${formatValidationError(error)}`);
		}
		throw error;
	}

	// Validate input
	try {
		createEntryInputSchema.parse(input);
	} catch (error) {
		if (error instanceof ZodError) {
			throw new Error(`Validation failed: ${formatValidationError(error)}`);
		}
		throw error;
	}

	// Extract tags from title
	const { tags, cleanedTitle } = extractTagsFromTitle(input.title);

	const entryRef = doc(db, ENTRIES_COLLECTION, id);
	await updateDoc(entryRef, {
		title: cleanedTitle,
		content: input.content,
		tags,
		updatedAt: Timestamp.fromDate(new Date())
	});

	// Automatically sync wiki assignments after entry update
	await syncEntryWikis(id);

	// Note: We no longer need to update backlinks since titles are loaded dynamically at runtime
}

/**
 * Deletes an entry from Firestore
 */
export async function deleteEntry(id: string): Promise<void> {
	const currentUser = auth.currentUser;
	if (!currentUser) {
		throw new Error('User must be authenticated to delete entries');
	}

	// Verify the entry belongs to the current user
	const entry = await getEntryById(id);
	if (!entry) {
		throw new Error('Entry not found');
	}

	const entryRef = doc(db, ENTRIES_COLLECTION, id);
	await deleteDoc(entryRef);
}

/**
 * Gets the title of an entry by ID (for wiki link resolution)
 */
export async function getEntryTitle(id: string): Promise<string | null> {
	try {
		const entry = await getEntryById(id);
		return entry?.title ?? null;
	} catch (err) {
		console.error('Failed to get entry title:', err);
		return null;
	}
}

/**
 * Extracts all entry IDs from wiki links in content
 */
export function extractEntryIdsFromContent(content: string): string[] {
	if (!content || typeof content !== 'string') {
		return [];
	}

	const ids: string[] = [];
	let match;

	// Reset lastIndex for global regex before use
	WIKI_LINK_PATTERN.lastIndex = 0;

	while ((match = WIKI_LINK_PATTERN.exec(content)) !== null) {
		const id = match[1];
		// Only add non-empty IDs
		if (id?.trim()) {
			ids.push(id);
		}
	}

	return [...new Set(ids)]; // Remove duplicates
}

/**
 * Loads titles for multiple entry IDs and returns a map
 */
export async function loadEntryTitles(entryIds: string[]): Promise<Map<string, string>> {
	const titleMap = new Map<string, string>();

	if (!entryIds || entryIds.length === 0) {
		return titleMap;
	}

	// Filter out invalid IDs
	const validIds = entryIds.filter((id) => id && typeof id === 'string' && id.trim());

	if (validIds.length === 0) {
		return titleMap;
	}

	// Load all titles in parallel with error handling
	await Promise.allSettled(
		validIds.map(async (id) => {
			try {
				const title = await getEntryTitle(id);
				if (title) {
					titleMap.set(id, title);
				}
			} catch (err) {
				console.warn(`Failed to load title for entry ${id}:`, err);
				// Fallback: use the ID as the title if loading fails
				titleMap.set(id, id);
			}
		})
	);

	return titleMap;
}

/**
 * Finds all entries that link to the given entry ID (backlinks)
 */
export async function getBacklinks(targetEntryId: string): Promise<Entry[]> {
	const currentUser = auth.currentUser;
	if (!currentUser) {
		throw new Error('User must be authenticated to get backlinks');
	}

	// Get all entries for the current user
	const allEntries = await getAllEntries();

	// Filter entries that contain a link to the target entry
	const backlinks = allEntries.filter((entry) => {
		// Skip the target entry itself
		if (entry.id === targetEntryId) {
			return false;
		}

		// Extract all entry IDs from the content
		const linkedIds = extractEntryIdsFromContent(entry.content);

		// Check if this entry links to the target entry
		return linkedIds.includes(targetEntryId);
	});

	// Sort alphabetically by title
	return backlinks.sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * Gets all unique tags from all entries
 */
export async function getAllTags(): Promise<Map<string, number>> {
	const entries = await getAllEntries();
	const tagCounts = new Map<string, number>();

	entries.forEach((entry) => {
		if (entry.tags && entry.tags.length > 0) {
			entry.tags.forEach((tag) => {
				tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
			});
		}
	});

	return tagCounts;
}

/**
 * Renames a tag across all entries that have it
 */
export async function renameTag(oldTag: string, newTag: string): Promise<void> {
	const currentUser = auth.currentUser;
	if (!currentUser) {
		throw new Error('User must be authenticated to rename tags');
	}

	if (!oldTag.trim() || !newTag.trim()) {
		throw new Error('Tag names cannot be empty');
	}

	if (oldTag === newTag) {
		return; // No change needed
	}

	// Get all entries with the old tag (respects impersonation)
	const allEntries = await getAllEntries();
	const entriesToUpdate = allEntries.filter((entry) => entry.tags?.includes(oldTag));

	// Update each entry with the new tag
	const updatePromises = entriesToUpdate.map(async (entry) => {
		const updatedTags = entry.tags.map((tag) => (tag === oldTag ? newTag : tag));
		const entryRef = doc(db, ENTRIES_COLLECTION, entry.id);
		await updateDoc(entryRef, {
			tags: updatedTags,
			updatedAt: Timestamp.fromDate(new Date())
		});
	});

	await Promise.all(updatePromises);
}

/**
 * Recursively gets all entries linked from a starting entry
 */
export async function getWikiPages(rootPageId: string): Promise<Entry[]> {
	const currentUser = auth.currentUser;
	if (!currentUser) {
		throw new Error('User must be authenticated to get wiki pages');
	}

	const visitedIds = new Set<string>();
	const pages: Entry[] = [];
	const toVisit = [rootPageId];

	while (toVisit.length > 0) {
		const currentId = toVisit.shift();
		if (!currentId || visitedIds.has(currentId)) {
			continue;
		}

		visitedIds.add(currentId);

		try {
			const entry = await getEntryById(currentId);
			if (!entry) {
				continue;
			}

			pages.push(entry);

			// Extract all linked entry IDs from content
			const linkedIds = extractEntryIdsFromContent(entry.content);

			// Add unvisited linked IDs to the queue
			for (const linkedId of linkedIds) {
				if (!visitedIds.has(linkedId)) {
					toVisit.push(linkedId);
				}
			}
		} catch (error) {
			console.error(`Failed to load entry ${currentId}:`, error);
		}
	}

	return pages;
}

/**
 * Deletes a tag from all entries that have it
 */
export async function deleteTag(tagToDelete: string): Promise<void> {
	const currentUser = auth.currentUser;
	if (!currentUser) {
		throw new Error('User must be authenticated to delete tags');
	}

	if (!tagToDelete.trim()) {
		throw new Error('Tag name cannot be empty');
	}

	// Get all entries with the tag (respects impersonation)
	const allEntries = await getAllEntries();
	const entriesToUpdate = allEntries.filter((entry) => entry.tags?.includes(tagToDelete));

	// Remove the tag from each entry
	const updatePromises = entriesToUpdate.map(async (entry) => {
		const updatedTags = entry.tags.filter((tag) => tag !== tagToDelete);
		const entryRef = doc(db, ENTRIES_COLLECTION, entry.id);
		await updateDoc(entryRef, {
			tags: updatedTags,
			updatedAt: Timestamp.fromDate(new Date())
		});
	});

	await Promise.all(updatePromises);
}

/**
 * Gets a single entry by ID without authentication (for public access)
 */
export async function getEntryByIdPublic(id: string): Promise<Entry | null> {
	const entryRef = doc(db, ENTRIES_COLLECTION, id);
	const entrySnap = await getDocFromServer(entryRef);

	if (!entrySnap.exists()) {
		return null;
	}

	const data = entrySnap.data() as EntryDocument;

	return {
		id: entrySnap.id,
		userId: data.userId,
		title: data.title,
		content: data.content,
		tags: data.tags ?? [],
		wikiIds: data.wikiIds ?? [],
		createdAt: data.createdAt.toDate(),
		updatedAt: data.updatedAt.toDate()
	};
}

/**
 * Gets the title of an entry by ID without authentication (for public access)
 */
export async function getEntryTitlePublic(id: string): Promise<string | null> {
	try {
		const entry = await getEntryByIdPublic(id);
		return entry?.title ?? null;
	} catch (err) {
		console.error('Failed to get entry title:', err);
		return null;
	}
}

/**
 * Loads titles for multiple entry IDs without authentication (for public access)
 */
export async function loadEntryTitlesPublic(entryIds: string[]): Promise<Map<string, string>> {
	const titleMap = new Map<string, string>();

	if (!entryIds || entryIds.length === 0) {
		return titleMap;
	}

	// Filter out invalid IDs
	const validIds = entryIds.filter((id) => id && typeof id === 'string' && id.trim());

	if (validIds.length === 0) {
		return titleMap;
	}

	// Load all titles in parallel with error handling
	await Promise.allSettled(
		validIds.map(async (id) => {
			try {
				const title = await getEntryTitlePublic(id);
				if (title) {
					titleMap.set(id, title);
				}
			} catch (err) {
				console.warn(`Failed to load title for entry ${id}:`, err);
				// Fallback: use the ID as the title if loading fails
				titleMap.set(id, id);
			}
		})
	);

	return titleMap;
}

/**
 * Syncs an entry's wiki assignments based on which wikis contain it
 * This is called automatically after updating an entry to ensure wiki graphs are up-to-date
 */
export async function syncEntryWikis(entryId: string): Promise<void> {
	const currentUser = auth.currentUser;
	if (!currentUser) {
		throw new Error('User must be authenticated to sync entry wikis');
	}

	// Import getAllWikis from wikis service
	const { getAllWikis } = await import('./wikis');

	// Get all wikis for the current user
	const allWikis = await getAllWikis();

	// Check which wikis this entry belongs to
	const wikisContainingEntry = new Set<string>();

	for (const wiki of allWikis) {
		try {
			// Get all pages in this wiki
			const wikiPages = await getWikiPages(wiki.rootPageId);

			// Check if this entry is in the wiki
			if (wikiPages.some((page) => page.id === entryId)) {
				wikisContainingEntry.add(wiki.id);
			}
		} catch (error) {
			console.error(`Failed to check wiki ${wiki.id}:`, error);
		}
	}

	// Update the entry's wikiIds to match which wikis contain it
	const entryRef = doc(db, ENTRIES_COLLECTION, entryId);
	const updatedWikiIds = Array.from(wikisContainingEntry);

	if (updatedWikiIds.length > 0) {
		await updateDoc(entryRef, {
			wikiIds: updatedWikiIds,
			updatedAt: Timestamp.fromDate(new Date())
		});
	} else {
		// If no wikis contain this entry, remove the wikiIds field
		await updateDoc(entryRef, {
			wikiIds: deleteField(),
			updatedAt: Timestamp.fromDate(new Date())
		});
	}
}
