import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Button from './Button.svelte';
import type { Snippet } from 'svelte';

describe('Button component', () => {
	it('should render with default props', () => {
		const { container } = render(Button, {
			props: {
				children: (() => 'Click me') as unknown as Snippet
			}
		});

		const button = container.querySelector('button');
		expect(button).toBeTruthy();
		expect(button?.className).toContain('button-primary');
		expect(button?.className).toContain('button-md');
	});

	it('should render with different variants', async () => {
		const { container, rerender } = render(Button, {
			props: {
				variant: 'secondary',
				children: (() => 'Button') as unknown as Snippet
			}
		});

		const button = container.querySelector('button');
		expect(button?.className).toContain('button-secondary');

		await rerender({
			variant: 'danger',
			children: (() => 'Button') as unknown as Snippet
		});
		expect(button?.className).toContain('button-danger');

		await rerender({
			variant: 'ghost',
			children: (() => 'Button') as unknown as Snippet
		});
		expect(button?.className).toContain('button-ghost');

		await rerender({
			variant: 'icon',
			children: (() => 'Button') as unknown as Snippet
		});
		expect(button?.className).toContain('button-icon');
	});

	it('should render with different sizes', async () => {
		const { container, rerender } = render(Button, {
			props: {
				size: 'sm',
				children: (() => 'Button') as unknown as Snippet
			}
		});

		const button = container.querySelector('button');
		expect(button?.className).toContain('button-sm');

		await rerender({
			size: 'lg',
			children: (() => 'Button') as unknown as Snippet
		});
		expect(button?.className).toContain('button-lg');
	});

	it('should handle click events', async () => {
		const user = userEvent.setup();
		const handleClick = vi.fn();

		const { container } = render(Button, {
			props: {
				onclick: handleClick,
				children: (() => 'Click me') as unknown as Snippet
			}
		});

		const button = container.querySelector('button');
		if (button) {
			await user.click(button);
		}

		expect(handleClick).toHaveBeenCalledOnce();
	});

	it('should be disabled when disabled prop is true', async () => {
		const user = userEvent.setup();
		const handleClick = vi.fn();

		const { container } = render(Button, {
			props: {
				disabled: true,
				onclick: handleClick,
				children: (() => 'Disabled') as unknown as Snippet
			}
		});

		const button = container.querySelector('button');
		expect(button?.hasAttribute('disabled')).toBe(true);

		if (button) {
			await user.click(button);
		}
		expect(handleClick).not.toHaveBeenCalled();
	});

	it('should render with title attribute', () => {
		const { container } = render(Button, {
			props: {
				title: 'Button tooltip',
				children: (() => 'Button') as unknown as Snippet
			}
		});

		const button = container.querySelector('button');
		expect(button?.getAttribute('title')).toBe('Button tooltip');
	});

	it('should support different button types', async () => {
		const { container, rerender } = render(Button, {
			props: {
				type: 'submit',
				children: (() => 'Submit') as unknown as Snippet
			}
		});

		const button = container.querySelector('button');
		expect(button?.getAttribute('type')).toBe('submit');

		await rerender({
			type: 'reset',
			children: (() => 'Reset') as unknown as Snippet
		});
		expect(button?.getAttribute('type')).toBe('reset');
	});

	it('should apply custom classes', () => {
		const { container } = render(Button, {
			props: {
				class: 'custom-class another-class',
				children: (() => 'Button') as unknown as Snippet
			}
		});

		const button = container.querySelector('button');
		expect(button?.className).toContain('custom-class');
		expect(button?.className).toContain('another-class');
	});
});
