import { defineConfig } from "vitest/config";
import path from "node:path";

// Unit/golden tests only — Playwright owns tests/e2e (run via test:e2e).
export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
