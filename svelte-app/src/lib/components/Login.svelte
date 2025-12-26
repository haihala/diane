<script lang="ts">
	import { signInWithGoogle } from '$lib/services/auth';

	let isLoading = false;
	let error: string | null = null;

	async function handleGoogleSignIn(): Promise<void> {
		isLoading = true;
		error = null;

		try {
			await signInWithGoogle();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to sign in';
			console.error('Sign in error:', err);
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="login-container">
	<div class="login-card">
		<div class="logo-section">
			<h1 class="logo-text">Diane</h1>
			<p class="tagline">Your personal knowledge companion</p>
		</div>

		<div class="login-content">
			<h2 class="login-title">Welcome</h2>
			<p class="login-subtitle">Sign in to access your notes</p>

			{#if error}
				<div class="error-message">
					{error}
				</div>
			{/if}

			<button class="google-button" on:click={handleGoogleSignIn} disabled={isLoading}>
				<svg class="google-icon" viewBox="0 0 24 24" aria-hidden="true">
					<path
						d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
						fill="#4285F4"
					/>
					<path
						d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
						fill="#34A853"
					/>
					<path
						d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
						fill="#FBBC05"
					/>
					<path
						d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
						fill="#EA4335"
					/>
				</svg>
				{isLoading ? 'Signing in...' : 'Continue with Google'}
			</button>
		</div>
	</div>
</div>

<style>
	.login-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(
			135deg,
			var(--color-bg) 0%,
			var(--color-bg-secondary) 50%,
			var(--color-bg-tertiary) 100%
		);
		padding: var(--spacing-xl);
	}

	.login-card {
		background: var(--color-surface);
		border-radius: var(--radius-xl);
		box-shadow: var(--shadow-xl);
		padding: var(--spacing-3xl);
		max-width: 450px;
		width: 100%;
		border: 1px solid var(--color-border);
	}

	.logo-section {
		text-align: center;
		margin-bottom: var(--spacing-2xl);
	}

	.logo-text {
		font-size: var(--font-size-4xl);
		font-weight: var(--font-weight-bold);
		background: linear-gradient(135deg, var(--color-primary) 0%, #c4b5fd 100%);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
		margin-bottom: var(--spacing-xs);
	}

	.tagline {
		font-size: var(--font-size-md);
		color: var(--color-text-secondary);
		font-weight: var(--font-weight-medium);
	}

	.login-content {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-lg);
	}

	.login-title {
		font-size: var(--font-size-2xl);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
		text-align: center;
	}

	.login-subtitle {
		font-size: var(--font-size-md);
		color: var(--color-text-secondary);
		text-align: center;
		margin-top: calc(var(--spacing-xs) * -1);
	}

	.error-message {
		padding: var(--spacing-md);
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: var(--radius-md);
		color: #ef4444;
		font-size: var(--font-size-sm);
		text-align: center;
	}

	.google-button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--spacing-md);
		padding: var(--spacing-md) var(--spacing-xl);
		background: white;
		color: #1f2937;
		border: 1px solid #e5e7eb;
		border-radius: var(--radius-lg);
		font-size: var(--font-size-md);
		font-weight: var(--font-weight-medium);
		cursor: pointer;
		transition: all 0.2s ease;
		width: 100%;
	}

	.google-button:hover:not(:disabled) {
		background: #f9fafb;
		box-shadow:
			0 4px 6px -1px rgba(0, 0, 0, 0.1),
			0 2px 4px -1px rgba(0, 0, 0, 0.06);
	}

	.google-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.google-icon {
		width: 20px;
		height: 20px;
		flex-shrink: 0;
	}

	/* Mobile responsiveness */
	@media (max-width: 480px) {
		.login-container {
			padding: var(--spacing-md);
		}

		.login-card {
			padding: var(--spacing-2xl);
		}

		.logo-text {
			font-size: var(--font-size-3xl);
		}

		.login-title {
			font-size: var(--font-size-xl);
		}
	}
</style>
