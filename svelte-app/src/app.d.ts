// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {}
}

// Augment SvelteKit's $env/static/public module types
// These variables are replaced at build time by SvelteKit
declare module '$env/static/public' {
	export const PUBLIC_FIREBASE_API_KEY: string | undefined;
	export const PUBLIC_FIREBASE_AUTH_DOMAIN: string | undefined;
	export const PUBLIC_FIREBASE_PROJECT_ID: string | undefined;
}

export {};
