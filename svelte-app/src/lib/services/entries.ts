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
	getDocFromServer
} from 'firebase/firestore';
import { db } from './firebase';
import { auth } from './firebase';
import type { Entry, CreateEntryInput } from '$lib/types/Entry';
import { extractTagsFromTitle } from './markdown';

const ENTRIES_COLLECTION = 'entries';

// Regex pattern for extracting entry IDs from wiki links
const WIKI_LINK_PATTERN = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;

interface EntryDocument {
	userId: string;
	title: string;
	content: string;
	tags?: string[];
	createdAt: { toDate: () => Date };
	updatedAt: { toDate: () => Date };
}

/**
 * Creates a new entry in Firestore
 */
export async function createEntry(input: CreateEntryInput): Promise<Entry> {
	const currentUser = auth.currentUser;
	if (!currentUser) {
		throw new Error('User must be authenticated to create entries');
	}

	if (!input.title.trim()) {
		throw new Error('Entry title cannot be empty');
	}

	const now = new Date();

	// Extract tags from title
	const { tags, cleanedTitle } = extractTagsFromTitle(input.title);

	const docRef = await addDoc(collection(db, ENTRIES_COLLECTION), {
		userId: currentUser.uid,
		title: cleanedTitle,
		content: input.content,
		tags,
		createdAt: Timestamp.fromDate(now),
		updatedAt: Timestamp.fromDate(now)
	});

	return {
		id: docRef.id,
		userId: currentUser.uid,
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

	const constraints: QueryConstraint[] = [
		where('userId', '==', currentUser.uid),
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

	const entryRef = doc(db, ENTRIES_COLLECTION, id);
	// Force fetch from server to avoid cache issues with backlink updates
	const entrySnap = await getDocFromServer(entryRef);

	if (!entrySnap.exists()) {
		return null;
	}

	const data = entrySnap.data() as EntryDocument;

	// Verify the entry belongs to the current user
	if (data.userId !== currentUser.uid) {
		throw new Error('Unauthorized access to entry');
	}

	return {
		id: entrySnap.id,
		userId: data.userId,
		title: data.title,
		content: data.content,
		tags: data.tags ?? [],
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

	if (!input.title.trim()) {
		throw new Error('Entry title cannot be empty');
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

	// Note: We no longer need to update backlinks since titles are loaded dynamically at runtime
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

	// Get all entries with the old tag
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

	// Get all entries with the tag
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
