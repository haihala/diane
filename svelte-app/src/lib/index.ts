// place files you want to import through the `$lib` alias in this folder.

// Export components for easy importing
export { default as Icon } from './components/common/Icon.svelte';
export { default as SearchBar } from './components/search/SearchBar.svelte';
export { default as MarkdownContent } from './components/editor/MarkdownContent.svelte';
export { default as EntrySearchModal } from './components/modals/EntrySearchModal.svelte';

// Export types
export type { Entry, CreateEntryInput, UserData } from './types/Entry';
export type { Wiki, CreateWikiInput } from './types/Wiki';

// Export services
export { createEntry, searchEntries, getAllEntries } from './services/entries';
export { createWiki, getAllWikis, getWikiById, updateWiki, deleteWiki } from './services/wikis';
export { db, app } from './services/firebase';
