import { describe, it, expect } from 'vitest';
import { extractTagsFromTitle } from './markdown';

describe('extractTagsFromTitle', () => {
	it('should extract single tag from title', () => {
		const result = extractTagsFromTitle('My note #important');
		expect(result.tags).toEqual(['important']);
		expect(result.cleanedTitle).toBe('My note');
	});

	it('should extract multiple tags from title', () => {
		const result = extractTagsFromTitle('Meeting notes #work #urgent #team');
		expect(result.tags).toEqual(['work', 'urgent', 'team']);
		expect(result.cleanedTitle).toBe('Meeting notes');
	});

	it('should handle tags in the middle of title', () => {
		const result = extractTagsFromTitle('My #work note about #project planning');
		expect(result.tags).toEqual(['work', 'project']);
		expect(result.cleanedTitle).toBe('My note about planning');
	});

	it('should handle title with no tags', () => {
		const result = extractTagsFromTitle('Just a regular note');
		expect(result.tags).toEqual([]);
		expect(result.cleanedTitle).toBe('Just a regular note');
	});

	it('should handle empty title', () => {
		const result = extractTagsFromTitle('');
		expect(result.tags).toEqual([]);
		expect(result.cleanedTitle).toBe('');
	});

	it('should handle title with only tags', () => {
		const result = extractTagsFromTitle('#tag1 #tag2 #tag3');
		expect(result.tags).toEqual(['tag1', 'tag2', 'tag3']);
		expect(result.cleanedTitle).toBe('');
	});

	it('should clean up extra whitespace after removing tags', () => {
		const result = extractTagsFromTitle('Note   #tag1   with   #tag2   extra   spaces');
		expect(result.tags).toEqual(['tag1', 'tag2']);
		expect(result.cleanedTitle).toBe('Note with extra spaces');
	});

	it('should handle tags with numbers', () => {
		const result = extractTagsFromTitle('Note #2024 #Q1 #version2');
		expect(result.tags).toEqual(['2024', 'Q1', 'version2']);
		expect(result.cleanedTitle).toBe('Note');
	});

	it('should not extract hashtags with spaces', () => {
		const result = extractTagsFromTitle('Note # notag #realtag');
		expect(result.tags).toEqual(['realtag']);
		expect(result.cleanedTitle).toBe('Note # notag');
	});

	it('should handle tags with underscores', () => {
		const result = extractTagsFromTitle('Note #my_tag #another_tag');
		expect(result.tags).toEqual(['my_tag', 'another_tag']);
		expect(result.cleanedTitle).toBe('Note');
	});
});
