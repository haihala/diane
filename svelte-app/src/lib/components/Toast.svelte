<script lang="ts">
	import { toastStore, type Toast } from '$lib/services/toast';
	import { onMount } from 'svelte';

	let toasts = $state<Toast[]>([]);

	onMount(() => {
		const unsubscribe = toastStore.subscribe((value: Toast[]) => {
			toasts = value;
		});

		return unsubscribe;
	});

	function handleClose(id: string): void {
		toastStore.remove(id);
	}
</script>

<div class="toast-container">
	{#each toasts as toast (toast.id)}
		<div class="toast toast-{toast.type}" role="alert" aria-live="polite">
			<div class="toast-content">
				<span class="toast-message">{toast.message}</span>
				<button
					class="toast-close"
					onclick={() => handleClose(toast.id)}
					aria-label="Close notification"
				>
					<svg
						width="16"
						height="16"
						viewBox="0 0 16 16"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="M12 4L4 12M4 4L12 12"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
				</button>
			</div>
		</div>
	{/each}
</div>

<style>
	.toast-container {
		position: fixed;
		top: var(--spacing-xl);
		right: var(--spacing-xl);
		z-index: var(--z-toast);
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
		max-width: 400px;
		pointer-events: none;
	}

	.toast {
		pointer-events: auto;
		padding: var(--spacing-md);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-lg);
		animation: slideIn 0.3s ease-out;
	}

	@keyframes slideIn {
		from {
			transform: translateX(100%);
			opacity: 0;
		}
		to {
			transform: translateX(0);
			opacity: 1;
		}
	}

	.toast-success {
		border-left: 4px solid var(--color-success);
	}

	.toast-error {
		border-left: 4px solid var(--color-danger);
	}

	.toast-info {
		border-left: 4px solid var(--color-primary);
	}

	.toast-warning {
		border-left: 4px solid var(--color-warning);
	}

	.toast-content {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--spacing-md);
	}

	.toast-message {
		font-size: var(--font-size-sm);
		color: var(--color-text);
		flex: 1;
	}

	.toast-close {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--spacing-xs);
		background: transparent;
		border: none;
		color: var(--color-text-secondary);
		cursor: pointer;
		border-radius: var(--radius-sm);
		transition: all var(--transition-fast);
	}

	.toast-close:hover {
		background: var(--color-surface-hover);
		color: var(--color-text);
	}

	@media (max-width: 768px) {
		.toast-container {
			top: var(--spacing-md);
			right: var(--spacing-md);
			left: var(--spacing-md);
			max-width: none;
		}
	}
</style>
