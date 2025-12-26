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

/**
 * Initialize auth state listener
 * This should be called once when the app starts
 */
export function initializeAuth(): void {
	if (!browser) return;

	onAuthStateChanged(auth, (firebaseUser) => {
		user.set(firebaseUser);
		loading.set(false);
	});
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
