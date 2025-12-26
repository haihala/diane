export interface Entry {
	id: string;
	title: string;
	content: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface CreateEntryInput {
	title: string;
	content: string;
}
