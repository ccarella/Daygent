/**
 * Test utilities and custom render function for testing React components.
 *
 * This module exports all React Testing Library functions with a custom
 * render that includes providers and user event setup.
 *
 * @example
 * import { render, screen } from '@/test/test-utils';
 *
 * const { user } = render(<MyComponent />);
 * await user.click(screen.getByRole('button'));
 */

import React, { ReactElement } from "react";
import { render, RenderOptions, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, beforeAll, afterAll, expect } from "vitest";

interface AllTheProvidersProps {
  children: React.ReactNode;
}

const AllTheProviders = ({ children }: AllTheProvidersProps) => {
  return <>{children}</>;
};

/**
 * Custom render function that wraps components with necessary providers
 * and returns a user event instance for interaction testing.
 *
 * @param ui - The React element to render
 * @param options - Additional render options
 * @returns Render result with user event instance
 *
 * @example
 * const { user } = render(<Button>Click me</Button>);
 * await user.click(screen.getByRole('button'));
 */
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) => {
  const user = userEvent.setup();
  const view = render(ui, { wrapper: AllTheProviders, ...options });

  return {
    ...view,
    user,
  };
};

export * from "@testing-library/react";
export { customRender as render };

interface MockRouter {
  route: string;
  pathname: string;
  query: Record<string, string | string[] | undefined>;
  asPath: string;
  push: ReturnType<typeof vi.fn>;
  replace: ReturnType<typeof vi.fn>;
  reload: ReturnType<typeof vi.fn>;
  back: ReturnType<typeof vi.fn>;
  prefetch: ReturnType<typeof vi.fn>;
  beforePopState: ReturnType<typeof vi.fn>;
  events: {
    on: ReturnType<typeof vi.fn>;
    off: ReturnType<typeof vi.fn>;
    emit: ReturnType<typeof vi.fn>;
  };
  isFallback: boolean;
}

/**
 * Creates a mock Next.js router object for testing components
 * that depend on router functionality.
 *
 * @param props - Partial router properties to override defaults
 * @returns Mock router object with spy functions
 *
 * @example
 * const mockRouter = createMockRouter({ pathname: '/dashboard' });
 */
export const createMockRouter = (
  props: Partial<MockRouter> = {},
): MockRouter => ({
  route: "/",
  pathname: "/",
  query: {},
  asPath: "/",
  push: vi.fn(),
  replace: vi.fn(),
  reload: vi.fn(),
  back: vi.fn(),
  prefetch: vi.fn(),
  beforePopState: vi.fn(),
  events: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  },
  isFallback: false,
  ...props,
});

/**
 * Utility to delay execution for a specified time in tests.
 * Useful for testing loading states or animations.
 *
 * @param ms - Milliseconds to delay
 */
export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Sets up console mocking for tests. Call this explicitly in test files
 * where you need to suppress console output.
 *
 * @returns Object with mocked console.error and console.warn functions
 *
 * @example
 * // In your test file:
 * const consoleMocks = setupConsoleMocks();
 *
 * it('should not log errors', () => {
 *   // ... test code
 *   expect(consoleMocks.error).not.toHaveBeenCalled();
 * });
 */
export const setupConsoleMocks = () => {
  const originalError = console.error;
  const originalWarn = console.warn;

  beforeAll(() => {
    console.error = vi.fn();
    console.warn = vi.fn();
  });

  afterAll(() => {
    console.error = originalError;
    console.warn = originalWarn;
  });

  return {
    error: console.error as ReturnType<typeof vi.fn>,
    warn: console.warn as ReturnType<typeof vi.fn>,
  };
};

/**
 * Waits for all loading indicators to disappear from the screen.
 * Checks for elements with 'loading' test ids or text.
 */
export const waitForLoadingToFinish = () =>
  waitFor(() => {
    const loaders = [
      ...screen.queryAllByTestId(/loading/i),
      ...screen.queryAllByText(/loading/i),
    ];
    expect(loaders).toHaveLength(0);
  });
