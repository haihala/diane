import { describe, it, expect } from 'vitest';
import { generateSlug } from './wikis';

describe('generateSlug', () => {
	it('should convert text to lowercase and replace spaces with hyphens', () => {
		let result = generateSlug('My Wiki Page');
		expect(result).toBe('my-wiki-page');

		result = generateSlug('multiple spaces between words');
		expect(result).toBe('multiple-spaces-between-words');

		result = generateSlug('too    many     spaces');
		expect(result).toBe('too-many-spaces');
	});

	it('should remove special characters and clean up hyphens', () => {
		let result = generateSlug('Hello! World? #2024');
		expect(result).toBe('hello-world-2024');

		result = generateSlug('Test@#$%^&*()Wiki');
		expect(result).toBe('testwiki');

		result = generateSlug('word---with---many---hyphens');
		expect(result).toBe('word-with-many-hyphens');

		result = generateSlug('  Leading and trailing spaces  ');
		expect(result).toBe('leading-and-trailing-spaces');
	});

	it('should handle edge cases', () => {
		expect(generateSlug('')).toBe('');
		expect(generateSlug('!@#$%^&*()')).toBe('');
		expect(generateSlug('Wiki')).toBe('wiki');
		expect(generateSlug('A')).toBe('a');
	});

	it('should handle numbers and already-formatted slugs', () => {
		let result = generateSlug('Wiki 2024 Version 1.0');
		expect(result).toBe('wiki-2024-version-10');

		result = generateSlug('MyWiki123Page');
		expect(result).toBe('mywiki123page');

		result = generateSlug('pre-hyphenated-text');
		expect(result).toBe('pre-hyphenated-text');

		// Idempotent for valid slugs
		const slug = 'valid-slug-123';
		expect(generateSlug(slug)).toBe(slug);
	});

	it('should handle various punctuation and formatting', () => {
		let result = generateSlug('my_wiki_page'); // underscores
		expect(result).toBe('mywikipage');

		result = generateSlug('wiki.page.name'); // dots
		expect(result).toBe('wikipagename');

		result = generateSlug('Café München'); // accents
		expect(result).toBe('caf-mnchen');

		result = generateSlug('Wiki (2024) Edition'); // parentheses
		expect(result).toBe('wiki-2024-edition');

		result = generateSlug('"Quoted" Wiki \'Title\''); // quotes
		expect(result).toBe('quoted-wiki-title');
	});

	it('should handle long text', () => {
		const longText = 'This is a very long wiki page title that should be converted to a slug';
		const result = generateSlug(longText);
		expect(result).toBe('this-is-a-very-long-wiki-page-title-that-should-be-converted-to-a-slug');
	});
});
