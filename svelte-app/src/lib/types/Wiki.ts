export interface Wiki {
	id: string;
	userId: string;
	rootPageId: string; // The entry ID of the root page
	name: string; // Wiki name, defaults to root page title
	slug: string; // URL-safe slug generated from name
	createdAt: Date;
	updatedAt: Date;
}

export interface CreateWikiInput {
	rootPageId: string;
	name?: string; // Optional on creation, will default to root page title
}
