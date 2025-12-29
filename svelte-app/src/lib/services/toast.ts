import { writable } from 'svelte/store';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
	id: string;
	message: string;
	type: ToastType;
	duration?: number;
}

function createToastStore(): {
	subscribe: (run: (value: Toast[]) => void) => () => void;
	show: (message: string, type?: ToastType, duration?: number) => string;
	remove: (id: string) => void;
	clear: () => void;
} {
	const { subscribe, update } = writable<Toast[]>([]);

	return {
		subscribe,
		show: (message: string, type: ToastType = 'info', duration = 3000) => {
			const id = Math.random().toString(36).substring(2, 9);
			const toast: Toast = { id, message, type, duration };

			update((toasts) => [...toasts, toast]);

			// Auto-remove after duration
			if (duration > 0) {
				setTimeout(() => {
					toastStore.remove(id);
				}, duration);
			}

			return id;
		},
		remove: (id: string) => {
			update((toasts) => toasts.filter((t) => t.id !== id));
		},
		clear: () => {
			update(() => []);
		}
	};
}

export const toastStore = createToastStore();

// Convenience functions
export const toast = {
	success: (message: string, duration?: number) => toastStore.show(message, 'success', duration),
	error: (message: string, duration?: number) => toastStore.show(message, 'error', duration),
	info: (message: string, duration?: number) => toastStore.show(message, 'info', duration),
	warning: (message: string, duration?: number) => toastStore.show(message, 'warning', duration)
};
