export interface Entry {
	id: string;
	userId: string;
	title: string;
	content: string;
	tags: string[];
	createdAt: Date;
	updatedAt: Date;
}

export interface CreateEntryInput {
	title: string;
	content: string;
}

export interface UserData {
	isAdmin: boolean;
	displayName: string | null;
	email: string | null;
}
