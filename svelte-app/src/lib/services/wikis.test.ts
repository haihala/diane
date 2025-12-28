import { describe, it, expect } from 'vitest';
import { generateSlug } from './wikis';

describe('generateSlug', () => {
	it('should convert text to lowercase', () => {
		const result = generateSlug('My Wiki Page');
		expect(result).toBe('my-wiki-page');
	});

	it('should replace spaces with hyphens', () => {
		const result = generateSlug('multiple spaces between words');
		expect(result).toBe('multiple-spaces-between-words');
	});

	it('should replace multiple consecutive spaces with single hyphen', () => {
		const result = generateSlug('too    many     spaces');
		expect(result).toBe('too-many-spaces');
	});

	it('should remove non-alphanumeric characters except hyphens', () => {
		const result = generateSlug('Hello! World? #2024');
		expect(result).toBe('hello-world-2024');
	});

	it('should handle special characters', () => {
		const result = generateSlug('Test@#$%^&*()Wiki');
		expect(result).toBe('testwiki');
	});

	it('should remove leading and trailing hyphens', () => {
		const result = generateSlug('  Leading and trailing spaces  ');
		expect(result).toBe('leading-and-trailing-spaces');
	});

	it('should handle already hyphenated text', () => {
		const result = generateSlug('pre-hyphenated-text');
		expect(result).toBe('pre-hyphenated-text');
	});

	it('should handle empty string', () => {
		const result = generateSlug('');
		expect(result).toBe('');
	});

	it('should handle string with only special characters', () => {
		const result = generateSlug('!@#$%^&*()');
		expect(result).toBe('');
	});

	it('should handle numbers in text', () => {
		const result = generateSlug('Wiki 2024 Version 1.0');
		expect(result).toBe('wiki-2024-version-10');
	});

	it('should collapse multiple consecutive hyphens', () => {
		const result = generateSlug('word---with---many---hyphens');
		expect(result).toBe('word-with-many-hyphens');
	});

	it('should handle mixed case with numbers', () => {
		const result = generateSlug('MyWiki123Page');
		expect(result).toBe('mywiki123page');
	});

	it('should handle underscores (remove them)', () => {
		const result = generateSlug('my_wiki_page');
		expect(result).toBe('mywikipage');
	});

	it('should handle dots (remove them)', () => {
		const result = generateSlug('wiki.page.name');
		expect(result).toBe('wikipagename');
	});

	it('should handle accented characters (remove them)', () => {
		const result = generateSlug('Café München');
		expect(result).toBe('caf-mnchen');
	});

	it('should handle very long text', () => {
		const longText = 'This is a very long wiki page title that should be converted to a slug';
		const result = generateSlug(longText);
		expect(result).toBe('this-is-a-very-long-wiki-page-title-that-should-be-converted-to-a-slug');
	});

	it('should handle text with parentheses', () => {
		const result = generateSlug('Wiki (2024) Edition');
		expect(result).toBe('wiki-2024-edition');
	});

	it('should handle text with quotes', () => {
		const result = generateSlug('"Quoted" Wiki \'Title\'');
		expect(result).toBe('quoted-wiki-title');
	});

	it('should trim whitespace before processing', () => {
		const result = generateSlug('   Wiki Page   ');
		expect(result).toBe('wiki-page');
	});

	it('should handle single word', () => {
		const result = generateSlug('Wiki');
		expect(result).toBe('wiki');
	});

	it('should handle single character', () => {
		const result = generateSlug('A');
		expect(result).toBe('a');
	});

	it('should be idempotent for valid slugs', () => {
		const slug = 'valid-slug-123';
		const result = generateSlug(slug);
		expect(result).toBe(slug);
	});
});
