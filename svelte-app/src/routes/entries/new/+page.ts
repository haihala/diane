import { waitForAuth } from '$lib/services/auth';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ url }) => {
	// Wait for auth to be initialized
	const user = await waitForAuth();

	// If no user is authenticated, return undefined and let the layout show the login page
	if (!user) {
		return {
			initialTitle: undefined
		};
	}

	// Get initial title from URL search params (if provided)
	const initialTitle = url.searchParams.get('title') ?? '';

	return {
		initialTitle
	};
};
