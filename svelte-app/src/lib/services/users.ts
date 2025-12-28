import { doc, getDoc, setDoc, collection, getDocs, query } from 'firebase/firestore';
import { db } from './firebase';
import type { UserData } from '$lib/types/Entry';

export interface UserWithStats extends UserData {
	uid: string;
	entryCount: number;
	lastActive: Date | null;
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
			return snapshot.data() as UserData;
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
		const defaultUserData: UserData = {
			isAdmin: false,
			displayName: null,
			email: null,
			...userData
		};

		await setDoc(userDoc, defaultUserData);
	} catch (error) {
		console.error('Error creating user data:', error);
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
		// First-time login - create user data with info from auth provider
		await createUserData(userId, { displayName, email });
		userData = await getUserData(userId);

		if (!userData) {
			throw new Error('Failed to create user data');
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

		// Count entries per user
		const entryCountByUser = new Map<string, number>();
		const lastActiveByUser = new Map<string, Date>();

		entriesSnapshot.docs.forEach((doc) => {
			const entry = doc.data();
			const userId = entry.userId as string;

			if (userId) {
				entryCountByUser.set(userId, (entryCountByUser.get(userId) ?? 0) + 1);

				const updatedAt = (entry.updatedAt as { toDate: () => Date } | undefined)?.toDate();
				if (updatedAt) {
					const currentLastActive = lastActiveByUser.get(userId);
					if (!currentLastActive || updatedAt > currentLastActive) {
						lastActiveByUser.set(userId, updatedAt);
					}
				}
			}
		});

		// Map users with their stats
		const users: UserWithStats[] = usersSnapshot.docs.map((doc) => {
			const userData = doc.data() as UserData;
			return {
				uid: doc.id,
				...userData,
				entryCount: entryCountByUser.get(doc.id) ?? 0,
				lastActive: lastActiveByUser.get(doc.id) ?? null
			};
		});

		return users;
	} catch (error) {
		console.error('Error getting all users:', error);
		throw error;
	}
}
