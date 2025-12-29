import type { ASTNode } from '$lib/services/ast';

export interface Entry {
	id: string;
	userId: string;
	title: string;
	contentAST: ASTNode; // AST representation (primary)
	tags: string[];
	wikiIds?: string[]; // Array of wiki IDs this entry belongs to (for public access)
	createdAt: Date;
	updatedAt: Date;
}

export interface CreateEntryInput {
	title: string;
	contentAST: ASTNode;
}

export interface UserData {
	isAdmin: boolean;
	displayName: string | null;
	email: string | null;
	lastActive?: Date;
	createdAt?: Date;
}
