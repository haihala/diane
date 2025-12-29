import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createEntry, updateEntry, deleteEntry, getEntryById, searchEntries } from './entries';
import type { CreateEntryInput } from '$lib/types/Entry';
import type { User } from 'firebase/auth';
import type { DocumentSnapshot, QuerySnapshot, DocumentData, Query } from 'firebase/firestore';

// Mock Firebase - must use inline values to avoid hoisting issues
vi.mock('./firebase', () => ({
	db: {},
	auth: {
		currentUser: {
			uid: 'test-user-id',
			email: 'test@example.com'
		}
	}
}));

// Mock auth service
vi.mock('./auth', () => ({
	impersonatedUser: {
		subscribe: vi.fn((callback: (value: null) => void) => {
			callback(null);
			return () => {};
		})
	}
}));

// Mock Firestore functions
vi.mock('firebase/firestore', () => {
	const mockTimestamp = {
		fromDate: (date: Date) => ({
			toDate: () => date
		})
	};

	return {
		collection: vi.fn(() => ({})),
		addDoc: vi.fn(() => Promise.resolve({ id: 'test-entry-id' })),
		getDocs: vi.fn(() =>
			Promise.resolve({
				docs: []
			})
		),
		query: vi.fn(() => ({})),
		orderBy: vi.fn(() => ({})),
		where: vi.fn(() => ({})),
		Timestamp: mockTimestamp,
		doc: vi.fn(() => ({})),
		getDoc: vi.fn(() =>
			Promise.resolve({
				exists: () => true,
				id: 'test-entry-id',
				data: () => ({
					userId: 'test-user-id',
					title: 'Test Entry',
					contentAST: { type: 'document', start: 0, end: 0, children: [] },
					tags: ['test'],
					createdAt: { toDate: () => new Date('2024-01-01') },
					updatedAt: { toDate: () => new Date('2024-01-01') }
				})
			})
		),
		getDocFromServer: vi.fn(() =>
			Promise.resolve({
				exists: () => true,
				id: 'test-entry-id',
				data: () => ({
					userId: 'test-user-id',
					title: 'Test Entry',
					contentAST: { type: 'document', start: 0, end: 0, children: [] },
					tags: ['test'],
					createdAt: { toDate: () => new Date('2024-01-01') },
					updatedAt: { toDate: () => new Date('2024-01-01') }
				})
			})
		),
		updateDoc: vi.fn(() => Promise.resolve()),
		deleteDoc: vi.fn(() => Promise.resolve()),
		deleteField: vi.fn()
	};
});

// Create a mock user object helper
const createMockUser = (): Partial<User> => ({
	uid: 'test-user-id',
	email: 'test@example.com'
});

describe('entries service', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('createEntry', () => {
		it('should create an entry with title and contentAST', async () => {
			const input: CreateEntryInput = {
				title: 'Test Entry',
				contentAST: { type: 'document', start: 0, end: 0, children: [] }
			};

			const entry = await createEntry(input);

			expect(entry).toBeDefined();
			expect(entry.id).toBe('test-entry-id');
			expect(entry.title).toBe('Test Entry');
			expect(entry.contentAST).toBeDefined();
			expect(entry.contentAST.type).toBe('document');
			expect(entry.userId).toBe('test-user-id');
		});

		it('should extract tags from title', async () => {
			const input: CreateEntryInput = {
				title: 'Test Entry #test #important',
				contentAST: { type: 'document', start: 0, end: 0, children: [] }
			};

			const entry = await createEntry(input);

			expect(entry.tags).toEqual(['test', 'important']);
			expect(entry.title).toBe('Test Entry');
		});

		it('should throw error if user is not authenticated', async () => {
			const { auth } = await import('./firebase');
			Object.defineProperty(auth, 'currentUser', {
				get: () => null,
				configurable: true
			});

			const input: CreateEntryInput = {
				title: 'Test',
				contentAST: { type: 'document', start: 0, end: 0, children: [] }
			};

			await expect(createEntry(input)).rejects.toThrow(
				'User must be authenticated to create entries'
			);

			// Restore auth state
			Object.defineProperty(auth, 'currentUser', {
				get: () => createMockUser(),
				configurable: true
			});
		});

		it('should throw error if title is empty', async () => {
			const input: CreateEntryInput = {
				title: '   ',
				contentAST: { type: 'document', start: 0, end: 0, children: [] }
			};

			await expect(createEntry(input)).rejects.toThrow('Validation failed');
		});

		it('should throw error if title exceeds maximum length', async () => {
			const input: CreateEntryInput = {
				title: 'a'.repeat(501), // Exceeds 500 char limit
				contentAST: { type: 'document', start: 0, end: 0, children: [] }
			};

			await expect(createEntry(input)).rejects.toThrow('Validation failed');
		});

		it('should throw error if content exceeds maximum length', async () => {
			// Create a large AST that exceeds the limit
			const largeText = 'a'.repeat(1000001);
			const input: CreateEntryInput = {
				title: 'Test',
				contentAST: {
					type: 'document',
					start: 0,
					end: largeText.length,
					children: [
						{
							type: 'paragraph',
							start: 0,
							end: largeText.length,
							children: [
								{
									type: 'text',
									start: 0,
									end: largeText.length,
									text: largeText
								}
							]
						}
					]
				}
			};

			await expect(createEntry(input)).rejects.toThrow('Validation failed');
		});
	});

	describe('updateEntry', () => {
		it('should update an entry', async () => {
			const result = await updateEntry('test-entry-id', {
				title: 'Updated Title',
				contentAST: {
					type: 'document',
					start: 0,
					end: 15,
					children: [
						{
							type: 'paragraph',
							start: 0,
							end: 15,
							children: [
								{
									type: 'text',
									start: 0,
									end: 15,
									text: 'Updated content'
								}
							]
						}
					]
				}
			});

			expect(result).toBeUndefined();
		});

		it('should throw error if user is not authenticated', async () => {
			const { auth } = await import('./firebase');
			Object.defineProperty(auth, 'currentUser', {
				get: () => null,
				configurable: true
			});

			await expect(
				updateEntry('test-entry-id', {
					title: 'Updated',
					contentAST: { type: 'document', start: 0, end: 0, children: [] }
				})
			).rejects.toThrow('User must be authenticated');

			// Restore auth state
			Object.defineProperty(auth, 'currentUser', {
				get: () => createMockUser(),
				configurable: true
			});
		});
	});

	describe('deleteEntry', () => {
		it('should delete an entry', async () => {
			const result = await deleteEntry('test-entry-id');

			expect(result).toBeUndefined();
		});

		it('should throw error if user is not authenticated', async () => {
			const { auth } = await import('./firebase');
			Object.defineProperty(auth, 'currentUser', {
				get: () => null,
				configurable: true
			});

			await expect(deleteEntry('test-entry-id')).rejects.toThrow('User must be authenticated');

			// Restore auth state
			Object.defineProperty(auth, 'currentUser', {
				get: () => createMockUser(),
				configurable: true
			});
		});
	});

	describe('getEntryById', () => {
		it('should retrieve an entry by id', async () => {
			const entry = await getEntryById('test-entry-id');

			expect(entry).toBeDefined();
			expect(entry?.id).toBe('test-entry-id');
			expect(entry?.title).toBe('Test Entry');
		});

		it('should return null if entry does not exist', async () => {
			const { getDocFromServer } = await import('firebase/firestore');
			vi.mocked(getDocFromServer).mockResolvedValueOnce({
				exists: () => false
			} as DocumentSnapshot<DocumentData>);

			const entry = await getEntryById('non-existent-id');

			expect(entry).toBeNull();
		});

		it('should throw error if user is not authenticated', async () => {
			const { auth } = await import('./firebase');
			Object.defineProperty(auth, 'currentUser', {
				get: () => null,
				configurable: true
			});

			await expect(getEntryById('test-entry-id')).rejects.toThrow('User must be authenticated');

			// Restore auth state
			Object.defineProperty(auth, 'currentUser', {
				get: () => createMockUser(),
				configurable: true
			});
		});
	});

	describe('searchEntries', () => {
		it('should search entries by title', async () => {
			const { getDocs } = await import('firebase/firestore');
			vi.mocked(getDocs).mockResolvedValueOnce({
				docs: [
					{
						id: 'entry-1',
						data: () => ({
							userId: 'test-user-id',
							title: 'Test Entry',
							contentAST: { type: 'document', start: 0, end: 0, children: [] },
							tags: [],
							createdAt: { toDate: () => new Date('2024-01-01') },
							updatedAt: { toDate: () => new Date('2024-01-01') }
						})
					}
				],
				size: 1,
				empty: false,
				metadata: {},
				query: {} as Query<DocumentData>,
				forEach: vi.fn(),
				docChanges: vi.fn(() => [])
			} as unknown as QuerySnapshot<DocumentData>);

			const results = await searchEntries('test');

			expect(results).toHaveLength(1);
			expect(results[0].title).toBe('Test Entry');
		});

		it('should throw error if user is not authenticated', async () => {
			const { auth } = await import('./firebase');
			Object.defineProperty(auth, 'currentUser', {
				get: () => null,
				configurable: true
			});

			await expect(searchEntries('test')).rejects.toThrow('User must be authenticated');

			// Restore auth state
			Object.defineProperty(auth, 'currentUser', {
				get: () => createMockUser(),
				configurable: true
			});
		});
	});
});
