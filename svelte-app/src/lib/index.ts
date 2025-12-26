// place files you want to import through the `$lib` alias in this folder.

// Export components for easy importing
export { default as Icon } from './components/Icon.svelte';
export { default as SearchBar } from './components/SearchBar.svelte';
export { default as EntryModal } from './components/EntryModal.svelte';

// Export types
export type { Entry, CreateEntryInput } from './types/Entry';

// Export services
export { createEntry, searchEntries, getAllEntries } from './services/entries';
export { db, app } from './services/firebase';
