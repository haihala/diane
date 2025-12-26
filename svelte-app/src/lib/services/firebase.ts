import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { browser, dev } from '$app/environment';

// Get environment variables with proper typing
const getEnvVar = (key: string, fallback: string): string => {
	if (browser && import.meta.env[key]) {
		return import.meta.env[key] as string;
	}
	return fallback;
};

// Firebase configuration
// In production, these come from environment variables
// In development/emulator mode, the actual values don't matter
const firebaseConfig = {
	apiKey: getEnvVar('PUBLIC_FIREBASE_API_KEY', 'demo-api-key'),
	authDomain: getEnvVar('PUBLIC_FIREBASE_AUTH_DOMAIN', 'diane-prod.firebaseapp.com'),
	projectId: getEnvVar('PUBLIC_FIREBASE_PROJECT_ID', 'diane-prod')
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Connect to Firestore emulator in development
// Only when running on localhost (browser context)
if (browser && (dev || window.location.hostname === 'localhost')) {
	try {
		// Connect to emulator on port 8080 (as configured in firebase.json)
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
}
