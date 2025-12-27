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
	type QueryConstraint
} from 'firebase/firestore';
import { db } from './firebase';
import { auth } from './firebase';
import type { Entry, CreateEntryInput } from '$lib/types/Entry';

const ENTRIES_COLLECTION = 'entries';

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
	if (searchTerm) {
		const lowerSearch = searchTerm.toLowerCase();
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
}
