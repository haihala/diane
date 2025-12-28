import { getWikiBySlugPublic } from '$lib/services/wikis';
import { getEntryByIdPublic } from '$lib/services/entries';
import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	const wiki = await getWikiBySlugPublic(params.slug);

	if (!wiki) {
		throw error(404, 'Wiki not found');
	}

	const rootPage = await getEntryByIdPublic(wiki.rootPageId);

	if (!rootPage) {
		throw error(404, 'Root page not found');
	}

	return {
		wiki,
		entry: rootPage
	};
};
