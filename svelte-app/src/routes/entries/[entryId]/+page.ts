import { getEntryById } from '$lib/services/entries';
import { waitForAuth } from '$lib/services/auth';
import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	const { entryId } = params;

	// Wait for auth to be initialized before loading the entry
	const user = await waitForAuth();

	// If no user is authenticated, return undefined and let the layout show the login page
	// After login, SvelteKit will re-run this loader automatically
	if (!user) {
		return {
			entry: undefined
		};
	}

	try {
		const entry = await getEntryById(entryId);

		if (!entry) {
			throw error(404, 'Entry not found');
		}

		return {
			entry
		};
	} catch (err) {
		if (err instanceof Error && err.message === 'Unauthorized access to entry') {
			throw error(403, 'You do not have permission to view this entry');
		}
		if (err instanceof Error && err.message === 'User must be authenticated to get entries') {
			throw error(401, 'You must be logged in to view this entry');
		}
		console.error('Error loading entry:', err);
		throw error(500, 'Failed to load entry');
	}
};
