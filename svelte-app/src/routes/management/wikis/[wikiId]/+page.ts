import { getWikiPages } from '$lib/services/entries';
import { getWikiById } from '$lib/services/wikis';
import { waitForAuth } from '$lib/services/auth';
import type { PageLoad } from './$types';
import type { Entry } from '$lib/types/Entry';

export const load: PageLoad = async ({ params }) => {
	const wikiId = params.wikiId;

	try {
		// Wait for authentication to complete before fetching wiki
		await waitForAuth();

		const wiki = await getWikiById(wikiId);
		if (!wiki) {
			return {
				wikiId,
				wiki: null,
				pages: [] as Entry[],
				mainPage: null
			};
		}

		const pages = await getWikiPages(wiki.rootPageId);
		return {
			wikiId,
			wiki,
			pages,
			mainPage: pages.find((p) => p.id === wiki.rootPageId) ?? null
		};
	} catch (error) {
		console.error('Error loading wiki pages:', error);
		return {
			wikiId,
			wiki: null,
			pages: [] as Entry[],
			mainPage: null
		};
	}
};
