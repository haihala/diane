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

const ENTRIES_COLLECTION = 'entries';

// Regex pattern for extracting entry IDs from wiki links
const WIKI_LINK_PATTERN = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;

interface EntryDocument {
	userId: string;
	title: string;
	content: string;
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

	const docRef = await addDoc(collection(db, ENTRIES_COLLECTION), {
		userId: currentUser.uid,
		title: input.title,
		content: input.content,
		createdAt: Timestamp.fromDate(now),
		updatedAt: Timestamp.fromDate(now)
	});

	return {
		id: docRef.id,
		userId: currentUser.uid,
		title: input.title,
		content: input.content,
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

	const entryRef = doc(db, ENTRIES_COLLECTION, id);
	await updateDoc(entryRef, {
		title: input.title,
		content: input.content,
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
