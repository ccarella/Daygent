import "@testing-library/jest-dom";
import { vi } from "vitest";

// Set up environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

// Mock ResizeObserver (required for cmdk)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Fix for dialog portal rendering in tests
const modalRoot = document.createElement("div");
modalRoot.setAttribute("id", "radix-portal");
document.body.appendChild(modalRoot);

// Mock scrollIntoView (required for cmdk)
Element.prototype.scrollIntoView = vi.fn();

// Mock pointer capture APIs (required for Radix UI)
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = vi.fn();
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = vi.fn();
}

// Create a default Supabase client mock factory
export const createSupabaseMock = () => ({
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user: null },
      error: null,
    }),
    getSession: vi.fn().mockResolvedValue({
      data: { session: null },
      error: null,
    }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn(() => ({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    })),
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      })),
      in: vi.fn(() => ({
        data: [],
        error: null,
      })),
      order: vi.fn(() => ({
        limit: vi.fn(() => ({
          data: [],
          error: null,
        })),
      })),
    })),
    insert: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      })),
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => ({
        data: null,
        error: null,
      })),
    })),
  })),
});

// Mock Supabase clients globally
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => createSupabaseMock()),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => createSupabaseMock()),
}));
