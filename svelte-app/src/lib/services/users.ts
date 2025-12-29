import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query } from 'firebase/firestore';
import { db } from './firebase';
import type { UserData } from '$lib/types/Entry';

export interface UserWithStats extends UserData {
	uid: string;
	entryCount: number;
}

/**
 * Get user data from Firestore
 * @param userId - The user's authentication UID
 * @returns The user data or null if not found
 */
export async function getUserData(userId: string): Promise<UserData | null> {
	try {
		const userDoc = doc(db, 'users', userId);
		const snapshot = await getDoc(userDoc);

		if (snapshot.exists()) {
			const data = snapshot.data();
			return {
				isAdmin: data.isAdmin as boolean,
				displayName: (data.displayName as string | null) ?? null,
				email: (data.email as string | null) ?? null,
				lastActive: data.lastActive
					? (data.lastActive as { toDate: () => Date }).toDate()
					: undefined,
				createdAt: data.createdAt ? (data.createdAt as { toDate: () => Date }).toDate() : undefined
			};
		}

		return null;
	} catch (error) {
		console.error('Error getting user data:', error);
		throw error;
	}
}

/**
 * Create user data in Firestore for first-time login
 * @param userId - The user's authentication UID
 * @param userData - Optional user data to set (defaults to isAdmin: false)
 */
export async function createUserData(
	userId: string,
	userData: Partial<UserData> = {}
): Promise<void> {
	try {
		const userDoc = doc(db, 'users', userId);
		const now = new Date();
		const defaultUserData: UserData = {
			isAdmin: false,
			displayName: null,
			email: null,
			createdAt: now,
			lastActive: now,
			...userData
		};

		await setDoc(userDoc, defaultUserData);
	} catch (error) {
		console.error('Error creating user data:', error);
		throw error;
	}
}

/**
 * Update user active timestamp
 * @param userId - The user's authentication UID
 */
export async function updateUserLogin(userId: string): Promise<void> {
	try {
		const userDoc = doc(db, 'users', userId);
		await updateDoc(userDoc, {
			lastActive: new Date()
		});
	} catch (error) {
		console.error('Error updating user active timestamp:', error);
		throw error;
	}
}

/**
 * Ensure user data exists in Firestore
 * Creates the user document if it doesn't exist
 * @param userId - The user's authentication UID
 * @param displayName - The user's display name from auth provider
 * @param email - The user's email from auth provider
 * @returns The user data
 */
export async function ensureUserData(
	userId: string,
	displayName: string | null = null,
	email: string | null = null
): Promise<UserData> {
	let userData = await getUserData(userId);

	if (!userData) {
		await createUserData(userId, { displayName, email });
		userData = await getUserData(userId);

		if (!userData) {
			throw new Error('Failed to create user data');
		}
	} else {
		await updateUserLogin(userId);
		userData = await getUserData(userId);
		if (!userData) {
			throw new Error('Failed to fetch updated user data');
		}
	}

	return userData;
}

/**
 * Get all users with their statistics
 * Only accessible to admin users
 * @returns Array of users with their stats
 */
export async function getAllUsers(): Promise<UserWithStats[]> {
	try {
		const usersCollection = collection(db, 'users');
		const entriesCollection = collection(db, 'entries');

		const [usersSnapshot, entriesSnapshot] = await Promise.all([
			getDocs(query(usersCollection)),
			getDocs(query(entriesCollection))
		]);

		const entryCountByUser = new Map<string, number>();

		entriesSnapshot.docs.forEach((doc) => {
			const entry = doc.data();
			const userId = entry.userId as string;

			if (userId) {
				entryCountByUser.set(userId, (entryCountByUser.get(userId) ?? 0) + 1);
			}
		});

		const users: UserWithStats[] = usersSnapshot.docs.map((doc) => {
			const data = doc.data();
			return {
				uid: doc.id,
				isAdmin: data.isAdmin as boolean,
				displayName: (data.displayName as string | null) ?? null,
				email: (data.email as string | null) ?? null,
				lastActive: data.lastActive
					? (data.lastActive as { toDate: () => Date }).toDate()
					: undefined,
				createdAt: data.createdAt ? (data.createdAt as { toDate: () => Date }).toDate() : undefined,
				entryCount: entryCountByUser.get(doc.id) ?? 0
			};
		});

		return users;
	} catch (error) {
		console.error('Error getting all users:', error);
		throw error;
	}
}
