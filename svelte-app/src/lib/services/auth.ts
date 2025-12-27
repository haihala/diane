import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import {
	signInWithPopup,
	signOut as firebaseSignOut,
	onAuthStateChanged,
	type User
} from 'firebase/auth';
import { auth, googleProvider } from './firebase';

// Auth store
export const user = writable<User | null | undefined>(undefined);
export const loading = writable<boolean>(true);

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
			loading.set(false);
			resolve(firebaseUser);
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

	return authInitialized!;
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
		await firebaseSignOut(auth);
	} catch (error) {
		console.error('Error signing out:', error);
		throw error;
	}
}
