import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator, GoogleAuthProvider } from 'firebase/auth';
import { browser, dev } from '$app/environment';
import {
	PUBLIC_FIREBASE_API_KEY,
	PUBLIC_FIREBASE_AUTH_DOMAIN,
	PUBLIC_FIREBASE_PROJECT_ID
} from '$env/static/public';

// Firebase configuration
// Environment variables are replaced at build time by Vite
const firebaseConfig = {
	apiKey: PUBLIC_FIREBASE_API_KEY ?? 'demo-api-key',
	authDomain: PUBLIC_FIREBASE_AUTH_DOMAIN ?? 'diane-prod.firebaseapp.com',
	projectId: PUBLIC_FIREBASE_PROJECT_ID ?? 'diane-prod'
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Google Auth Provider
export const googleProvider = new GoogleAuthProvider();

// Connect to emulators in development
// Only when running on localhost (browser context)
if (browser && (dev || window.location.hostname === 'localhost')) {
	try {
		// Connect to Firestore emulator on port 8080 (as configured in firebase.json)
		connectFirestoreEmulator(db, 'localhost', 8080);
		// eslint-disable-next-line no-console
		console.info('🔥 Connected to Firestore emulator');
	} catch (error) {
		// Emulator connection already established or not running
		// This is expected if hot-reloading in dev mode
		if (error instanceof Error && !error.message.includes('already been called')) {
			console.warn('Could not connect to Firestore emulator:', error);
		}
	}

	try {
		// Connect to Auth emulator on port 9099 (default auth emulator port)
		connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
		// eslint-disable-next-line no-console
		console.info('🔥 Connected to Auth emulator');
	} catch (error) {
		// Emulator connection already established or not running
		if (error instanceof Error && !error.message.includes('already been called')) {
			console.warn('Could not connect to Auth emulator:', error);
		}
	}
}
