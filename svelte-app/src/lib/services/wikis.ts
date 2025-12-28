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
	deleteDoc,
	type QueryConstraint,
	getDoc,
	deleteField
} from 'firebase/firestore';
import { db } from './firebase';
import { auth } from './firebase';
import { impersonatedUser } from './auth';
import { get } from 'svelte/store';
import type { Wiki, CreateWikiInput } from '$lib/types/Wiki';
import { getEntryById } from './entries';

const WIKIS_COLLECTION = 'wikis';

interface WikiDocument {
	userId: string;
	rootPageId: string;
	name: string;
	slug: string;
	createdAt: { toDate: () => Date };
	updatedAt: { toDate: () => Date };
}

/**
 * Generates a URL-safe slug from a given string
 * Converts to lowercase, replaces spaces with hyphens, and removes unsafe characters
 */
export function generateSlug(text: string): string {
	return (
		text
			.toLowerCase()
			.trim()
			// Replace spaces with hyphens
			.replace(/\s+/g, '-')
			// Remove all non-alphanumeric characters except hyphens
			.replace(/[^a-z0-9-]/g, '')
			// Replace multiple consecutive hyphens with a single hyphen
			.replace(/-+/g, '-')
			// Remove leading and trailing hyphens
			.replace(/^-+|-+$/g, '')
	);
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
 * Creates a new wiki in Firestore
 */
export async function createWiki(input: CreateWikiInput): Promise<Wiki> {
	try {
		const currentUser = auth.currentUser;
		if (!currentUser) {
			throw new Error('User must be authenticated to create wikis');
		}

		if (!input.rootPageId.trim()) {
			throw new Error('Root page ID cannot be empty');
		}

		// Verify the root page exists and belongs to the user
		const rootPage = await getEntryById(input.rootPageId);
		if (!rootPage) {
			throw new Error('Root page not found');
		}

		const now = new Date();
		const effectiveUserId = getEffectiveUserId();

		// Use provided name or default to root page title
		const name = input.name?.trim() ?? rootPage.title;
		const slug = generateSlug(name);

		const docData = {
			userId: effectiveUserId,
			rootPageId: input.rootPageId,
			name,
			slug,
			createdAt: Timestamp.fromDate(now),
			updatedAt: Timestamp.fromDate(now)
		};

		const docRef = await addDoc(collection(db, WIKIS_COLLECTION), docData);

		// Assign wikiId to all entries in the wiki
		await assignWikiToEntries(docRef.id, input.rootPageId);

		return {
			id: docRef.id,
			userId: effectiveUserId,
			rootPageId: input.rootPageId,
			name,
			slug,
			createdAt: now,
			updatedAt: now
		};
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Failed to create wiki: ${error.message}`);
		}
		throw new Error('Failed to create wiki: Unknown error');
	}
}

/**
 * Gets all wikis for the current user
 */
export async function getAllWikis(): Promise<Wiki[]> {
	try {
		const currentUser = auth.currentUser;
		if (!currentUser) {
			throw new Error('User must be authenticated to get wikis');
		}

		const effectiveUserId = getEffectiveUserId();

		const constraints: QueryConstraint[] = [
			where('userId', '==', effectiveUserId),
			orderBy('createdAt', 'desc')
		];

		const q = query(collection(db, WIKIS_COLLECTION), ...constraints);
		const snapshot = await getDocs(q);

		return snapshot.docs.map((doc) => {
			const data = doc.data() as WikiDocument;
			return {
				id: doc.id,
				userId: data.userId,
				rootPageId: data.rootPageId,
				name: data.name || doc.id, // Fallback for existing wikis
				slug: data.slug || generateSlug(data.name || doc.id), // Fallback for existing wikis
				createdAt: data.createdAt.toDate(),
				updatedAt: data.updatedAt.toDate()
			} as Wiki;
		});
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Failed to get wikis: ${error.message}`);
		}
		throw new Error('Failed to get wikis: Unknown error');
	}
}

/**
 * Gets a single wiki by ID
 */
export async function getWikiById(id: string): Promise<Wiki | null> {
	try {
		const currentUser = auth.currentUser;
		if (!currentUser) {
			throw new Error('User must be authenticated to get wikis');
		}

		const wikiRef = doc(db, WIKIS_COLLECTION, id);
		const wikiSnap = await getDoc(wikiRef);

		if (!wikiSnap.exists()) {
			return null;
		}

		const data = wikiSnap.data() as WikiDocument;

		const effectiveUserId = getEffectiveUserId();

		// Verify the wiki belongs to the effective user
		if (data.userId !== effectiveUserId) {
			throw new Error('Unauthorized access to wiki');
		}

		return {
			id: wikiSnap.id,
			userId: data.userId,
			rootPageId: data.rootPageId,
			name: data.name || wikiSnap.id, // Fallback for existing wikis
			slug: data.slug || generateSlug(data.name || wikiSnap.id), // Fallback for existing wikis
			createdAt: data.createdAt.toDate(),
			updatedAt: data.updatedAt.toDate()
		};
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Failed to get wiki: ${error.message}`);
		}
		throw new Error('Failed to get wiki: Unknown error');
	}
}

/**
 * Updates an existing wiki
 */
export async function updateWiki(id: string, input: Partial<CreateWikiInput>): Promise<void> {
	try {
		const currentUser = auth.currentUser;
		if (!currentUser) {
			throw new Error('User must be authenticated to update wikis');
		}

		const updateData: Record<string, unknown> = {
			updatedAt: Timestamp.fromDate(new Date())
		};

		let shouldReassignEntries = false;
		let newRootPageId: string | undefined;

		if (input.rootPageId !== undefined) {
			if (!input.rootPageId.trim()) {
				throw new Error('Root page ID cannot be empty');
			}
			// Verify the root page exists and belongs to the user
			const rootPage = await getEntryById(input.rootPageId);
			if (!rootPage) {
				throw new Error('Root page not found');
			}
			updateData.rootPageId = input.rootPageId;
			shouldReassignEntries = true;
			newRootPageId = input.rootPageId;
		}

		if (input.name !== undefined) {
			if (!input.name.trim()) {
				throw new Error('Wiki name cannot be empty');
			}
			updateData.name = input.name.trim();
		}

		const wikiRef = doc(db, WIKIS_COLLECTION, id);
		await updateDoc(wikiRef, updateData);

		// If root page changed, reassign wikiId to all entries
		if (shouldReassignEntries && newRootPageId) {
			// First remove wikiId from old entries
			await removeWikiFromEntries(id);
			// Then assign wikiId to new entries
			await assignWikiToEntries(id, newRootPageId);
		}
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Failed to update wiki: ${error.message}`);
		}
		throw new Error('Failed to update wiki: Unknown error');
	}
}

/**
 * Deletes a wiki
 */
export async function deleteWiki(id: string): Promise<void> {
	try {
		const currentUser = auth.currentUser;
		if (!currentUser) {
			throw new Error('User must be authenticated to delete wikis');
		}

		// Remove wikiId from all entries before deleting the wiki
		await removeWikiFromEntries(id);

		const wikiRef = doc(db, WIKIS_COLLECTION, id);
		await deleteDoc(wikiRef);
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Failed to delete wiki: ${error.message}`);
		}
		throw new Error('Failed to delete wiki: Unknown error');
	}
}

/**
 * Updates wiki name and slug independently
 */
export async function updateWikiNameAndSlug(id: string, name: string, slug: string): Promise<void> {
	try {
		const currentUser = auth.currentUser;
		if (!currentUser) {
			throw new Error('User must be authenticated to update wikis');
		}

		if (!name.trim()) {
			throw new Error('Wiki name cannot be empty');
		}

		if (!slug.trim()) {
			throw new Error('Wiki slug cannot be empty');
		}

		const updateData = {
			name: name.trim(),
			slug: slug.trim(),
			updatedAt: Timestamp.fromDate(new Date())
		};

		const wikiRef = doc(db, WIKIS_COLLECTION, id);
		await updateDoc(wikiRef, updateData);
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Failed to update wiki name and slug: ${error.message}`);
		}
		throw new Error('Failed to update wiki name and slug: Unknown error');
	}
}

/**
 * Gets the display name for a wiki (uses custom name or root page title)
 */
export async function getWikiDisplayName(wiki: Wiki): Promise<string> {
	if (wiki.name) {
		return wiki.name;
	}

	const rootPage = await getEntryById(wiki.rootPageId);
	return rootPage?.title ?? wiki.rootPageId;
}

/**
 * Gets a wiki by slug without authentication (for public access)
 */
export async function getWikiBySlugPublic(slug: string): Promise<Wiki | null> {
	try {
		const q = query(collection(db, WIKIS_COLLECTION), where('slug', '==', slug));
		const snapshot = await getDocs(q);

		if (snapshot.empty) {
			return null;
		}

		const doc = snapshot.docs[0];
		const data = doc.data() as WikiDocument;

		return {
			id: doc.id,
			userId: data.userId,
			rootPageId: data.rootPageId,
			name: data.name || doc.id,
			slug: data.slug || generateSlug(data.name || doc.id),
			createdAt: data.createdAt.toDate(),
			updatedAt: data.updatedAt.toDate()
		};
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Failed to get wiki by slug: ${error.message}`);
		}
		throw new Error('Failed to get wiki by slug: Unknown error');
	}
}

/**
 * Assigns wikiId to all entries that belong to a wiki
 * This should be called after creating or updating a wiki
 *
 * Performance: Uses batched reads to avoid N+1 query pattern
 */
export async function assignWikiToEntries(wikiId: string, rootPageId: string): Promise<void> {
	try {
		const currentUser = auth.currentUser;
		if (!currentUser) {
			throw new Error('User must be authenticated to assign wiki to entries');
		}

		// Import getWikiPages to get all linked entries
		const { getWikiPages } = await import('./entries');

		// Get all entries in the wiki graph
		const wikiPages = await getWikiPages(rootPageId);

		// Batch updates to avoid N+1 pattern - process in chunks
		const BATCH_SIZE = 500; // Firestore limit
		const batches: Promise<void>[] = [];

		for (let i = 0; i < wikiPages.length; i += BATCH_SIZE) {
			const chunk = wikiPages.slice(i, i + BATCH_SIZE);

			const batchPromise = (async (): Promise<void> => {
				// Batch read all entries in this chunk
				const entryRefs = chunk.map((entry) => doc(db, 'entries', entry.id));
				const entrySnaps = await Promise.all(entryRefs.map((ref) => getDoc(ref)));

				// Batch write updates
				const updates = entrySnaps
					.map((entrySnap, index) => {
						if (!entrySnap.exists()) return null;

						const data = entrySnap.data();
						const currentWikiIds: string[] = (data.wikiIds as string[]) ?? [];

						// Only update if this wikiId isn't already in the array
						if (currentWikiIds.includes(wikiId)) return null;

						return {
							ref: entryRefs[index],
							data: {
								wikiIds: [...currentWikiIds, wikiId],
								updatedAt: Timestamp.fromDate(new Date())
							}
						};
					})
					.filter((update): update is NonNullable<typeof update> => update !== null);

				// Execute all updates for this batch
				await Promise.all(updates.map((update) => updateDoc(update.ref, update.data)));
			})();

			batches.push(batchPromise);
		}

		await Promise.all(batches);
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Failed to assign wiki to entries: ${error.message}`);
		}
		throw new Error('Failed to assign wiki to entries: Unknown error');
	}
}

/**
 * Removes wikiId from all entries that belong to a wiki
 * This should be called when deleting a wiki
 */
export async function removeWikiFromEntries(wikiId: string): Promise<void> {
	try {
		const currentUser = auth.currentUser;
		if (!currentUser) {
			throw new Error('User must be authenticated to remove wiki from entries');
		}

		// Query all entries with this wikiId in their wikiIds array
		const q = query(collection(db, 'entries'), where('wikiIds', 'array-contains', wikiId));
		const snapshot = await getDocs(q);

		// Remove wikiId from each entry's wikiIds array
		const updatePromises = snapshot.docs.map(async (entryDoc) => {
			const data = entryDoc.data();
			const currentWikiIds: string[] = (data.wikiIds as string[]) ?? [];
			const updatedWikiIds = currentWikiIds.filter((id: string) => id !== wikiId);

			const entryRef = doc(db, 'entries', entryDoc.id);

			// If array becomes empty, remove the field entirely
			if (updatedWikiIds.length === 0) {
				await updateDoc(entryRef, {
					wikiIds: deleteField(),
					updatedAt: Timestamp.fromDate(new Date())
				});
			} else {
				await updateDoc(entryRef, {
					wikiIds: updatedWikiIds,
					updatedAt: Timestamp.fromDate(new Date())
				});
			}
		});

		await Promise.all(updatePromises);
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Failed to remove wiki from entries: ${error.message}`);
		}
		throw new Error('Failed to remove wiki from entries: Unknown error');
	}
}
