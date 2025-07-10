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

export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const mockConsole = () => {
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

export const waitForLoadingToFinish = () =>
  waitFor(() => {
    const loaders = [
      ...screen.queryAllByTestId(/loading/i),
      ...screen.queryAllByText(/loading/i),
    ];
    expect(loaders).toHaveLength(0);
  });
