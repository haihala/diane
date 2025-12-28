<script lang="ts">
	import Button from './Button.svelte';

	interface Props {
		mode?: 'edit' | 'create';
		isSaving?: boolean;
		onCancel?: () => void;
		onSave?: () => void;
	}

	const { mode = 'create', isSaving = false, onCancel, onSave }: Props = $props();
</script>

<footer class="modal-footer" class:footer-edit-mode={mode === 'edit'}>
	{#if mode === 'edit'}
		<div class="saving-indicator">
			{#if isSaving}
				<span class="saving-text">Saving...</span>
			{/if}
		</div>
	{:else}
		<Button variant="secondary" disabled={isSaving} onclick={onCancel}>Cancel</Button>
		<Button variant="primary" disabled={isSaving} onclick={onSave}>
			{isSaving ? 'Saving...' : 'Save Entry'}
		</Button>
	{/if}
</footer>

<style>
	.modal-footer {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		gap: var(--spacing-md);
		padding: var(--spacing-lg);
		border-top: 1px solid var(--color-border);
	}

	.modal-footer.footer-edit-mode {
		border-top: none;
		padding-top: 0;
	}

	.saving-indicator {
		flex: 1;
		display: flex;
		align-items: center;
		min-height: 1.5em;
	}

	.saving-text {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		font-style: italic;
	}
</style>
