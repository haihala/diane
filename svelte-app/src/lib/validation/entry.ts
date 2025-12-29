import { z } from 'zod';

/**
 * Validation schemas for Entry-related data
 */

// Entry ID validation (Firebase document IDs)
export const entryIdSchema = z
	.string()
	.min(1, 'Entry ID cannot be empty')
	.max(1500, 'Entry ID too long'); // Firebase limit

// User ID validation (Firebase Auth UIDs)
export const userIdSchema = z
	.string()
	.min(1, 'User ID cannot be empty')
	.max(128, 'User ID too long'); // Firebase Auth UID limit

// Title validation
export const titleSchema = z
	.string()
	.trim()
	.min(1, 'Title cannot be empty')
	.max(500, 'Title must be 500 characters or less');

// Content validation
export const contentSchema = z.string().max(1000000, 'Content must be 1MB or less'); // Firestore document size limit

// Tag validation
export const tagSchema = z
	.string()
	.min(1, 'Tag cannot be empty')
	.max(50, 'Tag must be 50 characters or less')
	.regex(/^[a-zA-Z0-9-_]+$/, 'Tag can only contain letters, numbers, hyphens, and underscores');

// Tags array validation
export const tagsSchema = z.array(tagSchema).max(20, 'Maximum 20 tags per entry');

// Wiki IDs array validation
export const wikiIdsSchema = z
	.array(entryIdSchema)
	.max(10, 'Entry can belong to maximum 10 wikis')
	.optional();

// CreateEntryInput validation schema
export const createEntryInputSchema = z.object({
	title: titleSchema,
	content: contentSchema
});

// UpdateEntryInput validation schema
export const updateEntryInputSchema = z.object({
	title: titleSchema.optional(),
	content: contentSchema.optional(),
	tags: tagsSchema.optional(),
	wikiIds: wikiIdsSchema
});

// Full Entry validation schema (for runtime validation)
export const entrySchema = z.object({
	id: entryIdSchema,
	userId: userIdSchema,
	title: titleSchema,
	content: contentSchema,
	tags: tagsSchema,
	wikiIds: wikiIdsSchema,
	createdAt: z.date(),
	updatedAt: z.date()
});

// Type exports for TypeScript
export type CreateEntryInput = z.infer<typeof createEntryInputSchema>;
export type UpdateEntryInput = z.infer<typeof updateEntryInputSchema>;
export type ValidatedEntry = z.infer<typeof entrySchema>;
