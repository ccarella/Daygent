import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
    coverage: {
      reporter: ["text", "lcov", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "node_modules/",
        "src/test/**",
        "**/*.d.ts",
        "**/*.config.*",
        "**/.eslintrc*",
        "src/components/ui/**/*.stories.tsx",
        ".next/**",
        "src/**/*.test.{ts,tsx}",
      ],
      thresholds: {
        // TODO: Increase thresholds as test coverage improves
        // Target: 80% coverage for all metrics
        branches: 0,
        functions: 0,
        lines: 0,
        statements: 0,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
