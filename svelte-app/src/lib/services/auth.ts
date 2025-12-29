import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import {
	signInWithPopup,
	signOut as firebaseSignOut,
	onAuthStateChanged,
	type User
} from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import { ensureUserData } from './users';
import type { UserData } from '$lib/types/Entry';

// Auth store
export const user = writable<User | null | undefined>(undefined);
export const userData = writable<UserData | null>(null);
export const loading = writable<boolean>(true);

// Impersonation store - stores the impersonated user's data
export const impersonatedUser = writable<{ uid: string; userData: UserData } | null>(null);

// Promise that resolves when auth is initialized
let authInitialized: Promise<User | null> | null = null;

/**
 * Initialize auth state listener
 * This should be called once when the app starts
 */
export function initializeAuth(): void {
	if (!browser) return;

	// Only initialize once
	if (authInitialized) return;

	authInitialized = new Promise((resolve) => {
		onAuthStateChanged(auth, (firebaseUser) => {
			user.set(firebaseUser);

			// If user is authenticated, ensure their user data exists in Firestore
			if (firebaseUser) {
				ensureUserData(firebaseUser.uid, firebaseUser.displayName, firebaseUser.email)
					.then((data) => {
						userData.set(data);
					})
					.catch((error) => {
						console.error('Error ensuring user data:', error);
						userData.set(null);
					})
					.finally(() => {
						loading.set(false);
						resolve(firebaseUser);
					});
			} else {
				userData.set(null);
				loading.set(false);
				resolve(firebaseUser);
			}
		});
	});
}

/**
 * Wait for auth to be initialized
 * Returns the current user or null if not authenticated
 */
export async function waitForAuth(): Promise<User | null> {
	if (!browser) return null;

	// If auth hasn't been initialized yet, initialize it now
	if (!authInitialized) {
		initializeAuth();
	}

	// Auth must be initialized at this point
	if (!authInitialized) {
		throw new Error('Failed to initialize authentication');
	}

	// Wait for initialization to complete
	await authInitialized;

	// Return the CURRENT auth state (not the cached promise result)
	return auth.currentUser;
}

/**
 * Sign in with Google
 */
export async function signInWithGoogle(): Promise<void> {
	try {
		await signInWithPopup(auth, googleProvider);
	} catch (error) {
		console.error('Error signing in with Google:', error);
		throw error;
	}
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
	try {
		// Clear impersonation when signing out
		impersonatedUser.set(null);
		await firebaseSignOut(auth);
	} catch (error) {
		console.error('Error signing out:', error);
		throw error;
	}
}

/**
 * Start impersonating a user (admin only)
 */
export async function startImpersonation(targetUserId: string): Promise<void> {
	const currentUser = auth.currentUser;
	if (!currentUser) {
		throw new Error('Must be authenticated to impersonate');
	}

	// Get current user's data to verify admin status
	const currentUserData = await import('./users').then((m) => m.getUserData(currentUser.uid));
	if (!currentUserData?.isAdmin) {
		throw new Error('Only admin users can impersonate other users');
	}

	// Get target user's data
	const targetUserData = await import('./users').then((m) => m.getUserData(targetUserId));
	if (!targetUserData) {
		throw new Error('Target user not found');
	}

	// Don't allow impersonating another admin
	if (targetUserData.isAdmin) {
		throw new Error('Cannot impersonate another admin user');
	}

	// Set the impersonated user
	impersonatedUser.set({
		uid: targetUserId,
		userData: targetUserData
	});
}

/**
 * Stop impersonating and return to normal mode
 */
export function stopImpersonation(): void {
	impersonatedUser.set(null);
}

/**
 * Get the effective user ID (impersonated user if active, otherwise current user)
 */
export function getEffectiveUserId(): string | null {
	// Use get() to read the store value without creating a subscription
	const impersonated = get(impersonatedUser);

	if (impersonated) {
		return impersonated.uid;
	}

	// If no impersonation, use the actual authenticated user
	if (auth.currentUser) {
		return auth.currentUser.uid;
	}

	return null;
}
