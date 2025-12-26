<script lang="ts">
	interface Props {
		placeholder?: string;
		onSubmit?: (value: string) => void;
	}

	const { placeholder = 'Ask Diane anything...', onSubmit }: Props = $props();

	let inputValue = $state('');
	let isFocused = $state(false);

	function handleSubmit(e: SubmitEvent): void {
		e.preventDefault();
		if (inputValue.trim() && onSubmit) {
			onSubmit(inputValue.trim());
			inputValue = '';
		}
	}

	function handleFocus(): void {
		isFocused = true;
	}

	function handleBlur(): void {
		isFocused = false;
	}
</script>

<div class="search-container">
	<form class="search-form" class:focused={isFocused} onsubmit={handleSubmit}>
		<div class="input-wrapper">
			<input
				type="text"
				class="search-input"
				{placeholder}
				bind:value={inputValue}
				onfocus={handleFocus}
				onblur={handleBlur}
				aria-label="Search input"
			/>
			{#if inputValue.trim()}
				<button type="submit" class="submit-button" aria-label="Submit search">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M5 12h14" />
						<path d="m12 5 7 7-7 7" />
					</svg>
				</button>
			{/if}
		</div>
	</form>
</div>

<style>
	.search-container {
		width: 100%;
		max-width: 800px;
		margin: 0 auto;
	}

	.search-form {
		width: 100%;
		background: var(--color-surface);
		border: 2px solid var(--color-border);
		border-radius: var(--radius-xl);
		padding: var(--spacing-sm);
		transition: all var(--transition-normal);
		box-shadow: var(--shadow-sm);
	}

	.search-form:hover {
		border-color: var(--color-border-hover);
		box-shadow: var(--shadow-md);
	}

	.search-form.focused {
		border-color: var(--color-primary);
		box-shadow: var(--shadow-lg);
	}

	.input-wrapper {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
	}

	.search-input {
		flex: 1;
		border: none;
		outline: none;
		background: transparent;
		font-size: var(--font-size-lg);
		color: var(--color-text);
		padding: var(--spacing-md);
		font-weight: var(--font-weight-normal);
	}

	.search-input::placeholder {
		color: var(--color-text-tertiary);
	}

	.submit-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border: none;
		background: var(--color-primary);
		color: var(--color-text-inverted);
		border-radius: var(--radius-lg);
		cursor: pointer;
		transition: all var(--transition-fast);
		flex-shrink: 0;
	}

	.submit-button:hover {
		background: var(--color-primary-hover);
		transform: translateX(2px);
	}

	.submit-button:active {
		transform: scale(0.95);
	}

	/* Mobile optimization */
	@media (max-width: 768px) {
		.search-form {
			padding: var(--spacing-xs);
		}

		.search-input {
			font-size: var(--font-size-md);
			padding: var(--spacing-sm);
		}

		.submit-button {
			width: 36px;
			height: 36px;
		}
	}
</style>
