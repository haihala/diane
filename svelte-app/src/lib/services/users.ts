import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { UserData } from '$lib/types/Entry';

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
