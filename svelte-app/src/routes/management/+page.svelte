<div class="landing-page">
	<div class="welcome-section">
		<h1 class="welcome-title">Management</h1>
		<p class="welcome-subtitle">Organize and understand your knowledge base</p>
	</div>

	<div class="philosophy-section">
		<div class="philosophy-card">
			<h2 class="section-title">What is this?</h2>
			<p class="section-text">
				The management area is your control center for understanding and organizing your personal
				knowledge base. Here you can browse all your entries, analyze patterns in your thinking, and
				gain insights into how your knowledge evolves over time.
			</p>
		</div>

		<div class="philosophy-card">
			<h2 class="section-title">Philosophy</h2>
			<p class="section-text">
				Knowledge isn't just about collecting information—it's about understanding the connections
				and patterns that emerge. This space helps you see the bigger picture: which topics you
				explore most, how your interests develop, and where your knowledge clusters form.
			</p>
		</div>

		<div class="philosophy-card">
			<h2 class="section-title">Getting Started</h2>
			<p class="section-text">
				Use the sidebar to navigate between different views. Browse your entries to revisit past
				thoughts, or check the statistics to see how your knowledge base is growing. Each view
				offers a different lens for understanding your personal knowledge journey.
			</p>
		</div>
	</div>
</div>

<style>
	.landing-page {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-3xl);
		max-width: 800px;
		margin: 0 auto;
	}

	.welcome-section {
		text-align: center;
		padding: var(--spacing-2xl) 0;
	}

	.welcome-title {
		font-size: var(--font-size-4xl);
		font-weight: var(--font-weight-bold);
		color: var(--color-text);
		margin-bottom: var(--spacing-md);
		background: linear-gradient(135deg, var(--color-primary) 0%, #c4b5fd 100%);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	.welcome-subtitle {
		font-size: var(--font-size-lg);
		color: var(--color-text-secondary);
	}

	.philosophy-section {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xl);
	}

	.philosophy-card {
		padding: var(--spacing-xl);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
	}

	.section-title {
		font-size: var(--font-size-xl);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
		margin-bottom: var(--spacing-md);
	}

	.section-text {
		font-size: var(--font-size-md);
		color: var(--color-text-secondary);
		line-height: 1.6;
	}

	@media (max-width: 768px) {
		.landing-page {
			gap: var(--spacing-xl);
		}

		.welcome-section {
			padding: var(--spacing-lg) 0;
		}

		.welcome-title {
			font-size: var(--font-size-3xl);
		}

		.philosophy-card {
			padding: var(--spacing-lg);
		}

		.section-title {
			font-size: var(--font-size-lg);
		}
	}
</style>
